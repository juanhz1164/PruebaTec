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
          <Route path="/inventario" element={<InventarioPage />} />
          <Route
            path="/inventario/otras-sucursales"
            element={<InventarioOtrasSucursalesPage />}
          />
          <Route path="/ventas" element={<VentasPage />} />
          <Route path="/transferencias" element={<TransferenciasPage />} />
          <Route path="/logistica" element={<LogisticaPage />} />
          <Route path="/reportes" element={<ReportesPage />} />

          <Route
            element={<ProtectedRoute roles={['AdministradorGeneral', 'GerenteSucursal']} />}
          >
            <Route path="/compras" element={<ComprasPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
