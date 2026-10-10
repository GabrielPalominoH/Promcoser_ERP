import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { Dashboard } from './pages/Dashboard'
import { Servicios } from './pages/Servicios'
import { PanelServicio } from './pages/servicio/PanelServicio'
import { ResumenServicio } from './pages/servicio/ResumenServicio'
import { MaterialesServicio } from './pages/servicio/MaterialesServicio'
import { PersonalServicio } from './pages/servicio/PersonalServicio'
import { EquiposServicio } from './pages/servicio/EquiposServicio'
import { GastosServicio } from './pages/servicio/GastosServicio'
import { CobrosServicio } from './pages/servicio/CobrosServicio'
import { FacturacionServicio } from './pages/servicio/FacturacionServicio'
import { PagosServicio } from './pages/servicio/PagosServicio'
import { CronogramaServicio } from './pages/servicio/CronogramaServicio'
import { PartidasServicio } from './pages/servicio/PartidasServicio'
import { OpcionesServicio } from './pages/servicio/OpcionesServicio'
import { Personal } from './pages/Personal'
import { Equipos } from './pages/Equipos'
import { Oficina } from './pages/Oficina'
import { Caja } from './pages/Caja'
import { Cierre } from './pages/Cierre'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="servicios" element={<Servicios />} />
        <Route path="servicios/:servicioId" element={<PanelServicio />}>
          <Route index element={<ResumenServicio />} />
          <Route path="materiales" element={<MaterialesServicio />} />
          <Route path="personal" element={<PersonalServicio />} />
          <Route path="equipos" element={<EquiposServicio />} />
          <Route path="gastos" element={<GastosServicio />} />
          <Route path="cobros" element={<CobrosServicio />} />
          <Route path="facturacion" element={<FacturacionServicio />} />
          <Route path="pagos" element={<PagosServicio />} />
          <Route path="cronograma" element={<CronogramaServicio />} />
          <Route path="partidas" element={<PartidasServicio />} />
          <Route path="opciones" element={<OpcionesServicio />} />
        </Route>
        <Route path="personal" element={<Personal />} />
        <Route path="equipos" element={<Equipos />} />
        <Route path="oficina" element={<Oficina />} />
        <Route path="caja" element={<Caja />} />
        <Route path="cierre" element={<Cierre />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}