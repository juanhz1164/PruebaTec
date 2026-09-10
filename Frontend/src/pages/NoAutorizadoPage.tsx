import { Link } from 'react-router-dom'

export function NoAutorizadoPage() {
  return (
    <div className="placeholder-page">
      <h1>No autorizado</h1>
      <p>No tienes permisos para ver esta sección.</p>
      <Link to="/">Volver al inicio</Link>
    </div>
  )
}
