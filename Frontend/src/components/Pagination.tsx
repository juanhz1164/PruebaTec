// Paginación client-side genérica: el backend no soporta page/pageSize en
// ningún endpoint del sistema (Ventas, Compras, Inventario, Reportes siempre
// devuelven el dataset completo), así que esto solo corta un array ya
// cargado — no dispara ninguna petición nueva ni cambia cómo se cargan los
// datos.
export function Pagination({
  paginaActual,
  totalPaginas,
  onCambiarPagina,
}: {
  paginaActual: number
  totalPaginas: number
  onCambiarPagina: (pagina: number) => void
}) {
  if (totalPaginas <= 1) return null

  const paginas = construirRangoPaginas(paginaActual, totalPaginas)

  return (
    <nav className="pagination" aria-label="Paginación">
      <button
        type="button"
        className="pagination-btn"
        disabled={paginaActual === 1}
        onClick={() => onCambiarPagina(paginaActual - 1)}
        aria-label="Página anterior"
      >
        ←
      </button>

      {paginas.map((p, i) =>
        p === 'ellipsis' ? (
          <span key={`ellipsis-${i}`} className="pagination-ellipsis">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            className={`pagination-btn ${p === paginaActual ? 'pagination-btn--activo' : ''}`}
            onClick={() => onCambiarPagina(p)}
            aria-current={p === paginaActual ? 'page' : undefined}
          >
            {p}
          </button>
        ),
      )}

      <button
        type="button"
        className="pagination-btn pagination-btn--siguiente"
        disabled={paginaActual === totalPaginas}
        onClick={() => onCambiarPagina(paginaActual + 1)}
      >
        Siguiente →
      </button>
    </nav>
  )
}

// Muestra siempre primera/última página, la actual con un vecino a cada
// lado, y colapsa el resto en "…" para no listar decenas de números cuando
// hay muchas páginas.
function construirRangoPaginas(actual: number, total: number): (number | 'ellipsis')[] {
  const rango = new Set<number>([1, total, actual, actual - 1, actual + 1])
  const paginas = [...rango].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)

  const resultado: (number | 'ellipsis')[] = []
  let anterior = 0
  for (const p of paginas) {
    if (anterior && p - anterior > 1) resultado.push('ellipsis')
    resultado.push(p)
    anterior = p
  }
  return resultado
}
