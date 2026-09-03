import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="placeholder-page">
      <h1>404</h1>
      <p>La página que buscas no existe.</p>
      <Link to="/">Volver al inicio</Link>
    </div>
  )
}
