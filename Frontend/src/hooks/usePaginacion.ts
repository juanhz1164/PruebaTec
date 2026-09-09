import { useEffect, useMemo, useState } from 'react'

// Corta un array ya cargado (y ya filtrado/buscado) en páginas de tamaño fijo.
// Si el array cambia (nueva búsqueda, nuevo filtro) y la página actual queda
// fuera de rango, vuelve automáticamente a la página 1 en vez de mostrar una
// página vacía.
export function usePaginacion<T>(items: T[], porPagina: number) {
  const [pagina, setPagina] = useState(1)

  const totalPaginas = Math.max(1, Math.ceil(items.length / porPagina))

  useEffect(() => {
    if (pagina > totalPaginas) setPagina(1)
  }, [pagina, totalPaginas])

  const itemsPagina = useMemo(() => {
    const inicio = (pagina - 1) * porPagina
    return items.slice(inicio, inicio + porPagina)
  }, [items, pagina, porPagina])

  return { pagina, setPagina, totalPaginas, itemsPagina }
}
