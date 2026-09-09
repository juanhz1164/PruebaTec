import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Venta } from '../types/venta'
import { formatearMoneda } from './format'

interface ExportarReporteVentasPdfParams {
  nombreMes: string
  // Etiqueta de sucursal ya resuelta por la página (nombre exacto o "Todas
  // las sucursales"), para que el PDF muestre exactamente lo que el
  // administrador seleccionó — sin volver a decidir esa lógica aquí.
  sucursalLabel: string
  ventas: Venta[]
  totalVentas: number
  totalVendido: number
  mostrarColumnaSucursal: boolean
}

// Genera el mismo reporte que ya se ve en pantalla (ReportesPage), como un
// PDF tabular. No consulta el backend ni recalcula nada: recibe los mismos
// `ventas`/totales ya filtrados y agregados por la página.
export function exportarReporteVentasPdf({
  nombreMes,
  sucursalLabel,
  ventas,
  totalVentas,
  totalVendido,
  mostrarColumnaSucursal,
}: ExportarReporteVentasPdfParams) {
  // Orientación horizontal: con las columnas de cliente (nombre, correo,
  // teléfono) sumadas a las ya existentes, en vertical quedaban demasiado
  // angostas o se recortaban.
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const margenIzquierdo = 14
  const anchoPagina = doc.internal.pageSize.getWidth()

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Reporte del mes', margenIzquierdo, 18)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(90)
  doc.text(`Período: ${capitalizar(nombreMes)}`, margenIzquierdo, 25)
  doc.text(`Sucursal: ${sucursalLabel}`, margenIzquierdo, 30)
  doc.text(
    `Generado el ${new Date().toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' })}`,
    margenIzquierdo,
    35,
  )

  doc.setTextColor(0)
  doc.setFontSize(11)
  doc.text(`Ventas registradas: ${totalVentas}`, margenIzquierdo, 43)
  doc.text(`Total vendido: ${formatearMoneda(totalVendido)}`, anchoPagina - margenIzquierdo, 43, {
    align: 'right',
  })

  const columnas = mostrarColumnaSucursal
    ? ['Comprobante', 'Sucursal', 'Fecha', 'Responsable', 'Cliente', 'Correo', 'Teléfono', 'Total']
    : ['Comprobante', 'Fecha', 'Responsable', 'Cliente', 'Correo', 'Teléfono', 'Total']

  const ordenadas = [...ventas].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())

  const filas = ordenadas.map((v) => {
    const base = [v.numeroComprobante]
    if (mostrarColumnaSucursal) base.push(v.sucursalNombre)
    base.push(
      new Date(v.fecha).toLocaleString('es-CO'),
      v.usuarioNombre,
      v.clienteNombre ?? '—',
      v.clienteEmail ?? '—',
      v.clienteTelefono ?? '—',
      formatearMoneda(v.total),
    )
    return base
  })

  autoTable(doc, {
    startY: 48,
    head: [columnas],
    body: filas,
    // Encabezado de tabla repetido en cada página nueva, sin cortar filas
    // entre páginas (comportamiento por defecto de autoTable).
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [31, 32, 40], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 247] },
    columnStyles: {
      [columnas.length - 1]: { halign: 'right' },
    },
    margin: { left: margenIzquierdo, right: margenIzquierdo },
    didDrawPage: () => {
      const paginaActual = doc.getNumberOfPages()
      doc.setFontSize(8)
      doc.setTextColor(120)
      doc.text(
        `Página ${paginaActual}`,
        anchoPagina - margenIzquierdo,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'right' },
      )
    },
  })

  const nombreArchivo = `reporte-ventas-${sucursalLabel.replace(/\s+/g, '-').toLowerCase()}-${nombreMes.replace(/\s+/g, '-').toLowerCase()}.pdf`
  doc.save(nombreArchivo)
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}
