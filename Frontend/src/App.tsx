import { Route, Routes } from 'react-router-dom'
import './App.css'
import { AppLayout } from './layouts/AppLayout'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { InventarioPage } from './pages/InventarioPage'
import { InventarioOtrasSucursalesPage } from './pages/InventarioOtrasSucursalesPage'
import { ComprasPage } from './pages/ComprasPage'
import { VentasPage } from './pages/VentasPage'
import { TransferenciasPage } from './pages/TransferenciasPage'
import { LogisticaPage } from './pages/LogisticaPage'
import { ReportesPage } from './pages/ReportesPage'
import { DashboardPage } from './pages/DashboardPage'
import { ComparativaSucursalesPage } from './pages/ComparativaSucursalesPage'
import { NoAutorizadoPage } from './pages/NoAutorizadoPage'
import { NotFoundPage } from './pages/NotFoundPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/no-autorizado" element={<NoAutorizadoPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route
            path="/inventario/otras-sucursales"
            element={<InventarioOtrasSucursalesPage />}
          />
          <Route path="/logistica" element={<LogisticaPage />} />
          <Route path="/reportes" element={<ReportesPage />} />

          <Route element={<ProtectedRoute roles={['AdministradorGeneral']} />}>
            <Route path="/comparativa-sucursales" element={<ComparativaSucursalesPage />} />
          </Route>

          <Route
            element={<ProtectedRoute roles={['GerenteSucursal', 'OperadorInventario']} />}
          >
            <Route path="/inventario" element={<InventarioPage />} />
            <Route path="/ventas" element={<VentasPage />} />
          </Route>

          <Route path="/compras" element={<ComprasPage />} />

          <Route path="/transferencias" element={<TransferenciasPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
