namespace InventarioMultiSucursal.Api.DTOs;

// T52: ventas del mes actual vs. los 3 meses anteriores.
public class VentasPorMesDto
{
    public int Anio { get; set; }
    public int Mes { get; set; }
    public string EtiquetaMes { get; set; } = string.Empty; // ej. "2026-09"
    public int CantidadVentas { get; set; }
    public decimal TotalVendido { get; set; }
}

// T53: rotación de inventario y demanda alta/baja por producto.
public class RotacionProductoDto
{
    public int ProductoId { get; set; }
    public string ProductoNombre { get; set; } = string.Empty;
    public string ProductoSku { get; set; } = string.Empty;
    public decimal CantidadVendidaUltimos30Dias { get; set; }
    public decimal StockActualTotal { get; set; }

    // Índice de rotación = unidades vendidas en 30 días / stock actual.
    // Más alto = se mueve rápido (alta demanda); más bajo = se mueve poco (baja demanda).
    public decimal? IndiceRotacion { get; set; }
    public string Clasificacion { get; set; } = string.Empty; // "Alta demanda" | "Baja demanda" | "Sin stock" | "Sin ventas"
}

// T54: transferencias activas y su impacto en el inventario (cuánto stock
// está "en tránsito", ni disponible en origen ni sumado aún en destino).
public class TransferenciaActivaDto
{
    public int TransferenciaId { get; set; }
    public string Estado { get; set; } = string.Empty;
    public string SucursalOrigenNombre { get; set; } = string.Empty;
    public string SucursalDestinoNombre { get; set; } = string.Empty;
    public int CantidadLineas { get; set; }
    public decimal CantidadTotalEnTransito { get; set; }
}

// T55: productos próximos a agotarse (reutiliza la alerta de stock mínimo, T34).
public class ProductoProximoAgotarseDto
{
    public int ProductoId { get; set; }
    public string ProductoNombre { get; set; } = string.Empty;
    public string ProductoSku { get; set; } = string.Empty;
    public int SucursalId { get; set; }
    public string SucursalNombre { get; set; } = string.Empty;
    public decimal Cantidad { get; set; }
    public decimal StockMinimo { get; set; }
}

// T56: comparativa de rendimiento entre sucursales (solo AdministradorGeneral).
public class ComparativaSucursalDto
{
    public int SucursalId { get; set; }
    public string SucursalNombre { get; set; } = string.Empty;
    public decimal TotalVentasMesActual { get; set; }
    public int CantidadVentasMesActual { get; set; }
    public decimal ValorInventarioActual { get; set; }
    public int ProductosBajoMinimo { get; set; }
    public int TransferenciasActivas { get; set; }
}
