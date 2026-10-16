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
import { IngresosServicio } from './pages/servicio/IngresosServicio'
import { CronogramaServicio } from './pages/servicio/CronogramaServicio'
import { CurvaSServicio } from './pages/servicio/CurvaSServicio'
import { LineaBaseServicio } from './pages/servicio/LineaBaseServicio'
import { ValorizacionesServicio } from './pages/servicio/ValorizacionesServicio'
import { ModificacionesServicio } from './pages/servicio/ModificacionesServicio'
import { PartidasServicio } from './pages/servicio/PartidasServicio'
import { OpcionesServicio } from './pages/servicio/OpcionesServicio'
import { Personal } from './pages/Personal'
import { Cargos } from './pages/Cargos'
import { Equipos } from './pages/Equipos'
import { Oficina } from './pages/Oficina'
import { Unidades } from './pages/Unidades'

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
          <Route path="ingresos" element={<IngresosServicio />} />
          <Route path="cobros" element={<Navigate to="../ingresos" replace />} />
          <Route path="facturacion" element={<Navigate to="../ingresos" replace />} />
          <Route path="cronograma" element={<CronogramaServicio />} />
          <Route path="curva-s" element={<CurvaSServicio />} />
          <Route path="linea-base" element={<LineaBaseServicio />} />
          <Route path="partidas" element={<PartidasServicio />} />
          <Route path="valorizaciones" element={<ValorizacionesServicio />} />
          <Route path="modificaciones" element={<ModificacionesServicio />} />
          <Route path="opciones" element={<OpcionesServicio />} />
        </Route>
        <Route path="personal" element={<Personal />} />
        <Route path="cargos" element={<Cargos />} />
        <Route path="equipos" element={<Equipos />} />
        <Route path="oficina" element={<Oficina />} />
        <Route path="unidades" element={<Unidades />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}