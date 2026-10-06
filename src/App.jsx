import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { Servicios } from './pages/Servicios'
import { PanelServicio } from './pages/servicio/PanelServicio'
import { ResumenServicio } from './pages/servicio/ResumenServicio'
import { MaterialesServicio } from './pages/servicio/MaterialesServicio'
import { EquiposServicio } from './pages/servicio/EquiposServicio'
import { GastosServicio } from './pages/servicio/GastosServicio'
import { CronogramaServicio } from './pages/servicio/CronogramaServicio'
import { OpcionesServicio } from './pages/servicio/OpcionesServicio'
import { Personal } from './pages/Personal'
import { Equipos } from './pages/Equipos'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/servicios" replace />} />
        <Route path="servicios" element={<Servicios />} />
        <Route path="servicios/:servicioId" element={<PanelServicio />}>
          <Route index element={<ResumenServicio />} />
          <Route path="materiales" element={<MaterialesServicio />} />
          <Route path="equipos" element={<EquiposServicio />} />
          <Route path="gastos" element={<GastosServicio />} />
          <Route path="cronograma" element={<CronogramaServicio />} />
          <Route path="opciones" element={<OpcionesServicio />} />
        </Route>
        <Route path="personal" element={<Personal />} />
        <Route path="equipos" element={<Equipos />} />
        <Route path="*" element={<Navigate to="/servicios" replace />} />
      </Route>
    </Routes>
  )
}