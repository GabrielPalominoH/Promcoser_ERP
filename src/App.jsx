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
import { ParteDiarioServicio } from './pages/servicio/ParteDiarioServicio'
import { PartidasServicio } from './pages/servicio/PartidasServicio'
import { OpcionesServicio } from './pages/servicio/OpcionesServicio'
import { Personal } from './pages/Personal'
import { Cargos } from './pages/Cargos'
import { Equipos } from './pages/Equipos'
import { Oficina } from './pages/Oficina'
import { Unidades } from './pages/Unidades'
import { Configuracion } from './pages/Configuracion'
import { Login } from './pages/Login'
import { useAuth } from './context/useAuth'
import { inicioDeRol, rutaGlobalPermitida, seccionServicioPermitida } from './utils/permisos'

// Guardia por rol: si la ruta o sección está vedada, vuelve al inicio del rol.
function Protegida({ ruta, seccion, children }) {
  const { rol } = useAuth()
  const permitido = ruta ? rutaGlobalPermitida(rol, ruta) : seccionServicioPermitida(rol, seccion)
  return permitido ? children : <Navigate to={inicioDeRol(rol)} replace />
}

export default function App() {
  const { autenticado } = useAuth()
  if (!autenticado) return <Login />
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route
          index
          element={
            <Protegida ruta="/">
              <Dashboard />
            </Protegida>
          }
        />
        <Route path="servicios" element={<Servicios />} />
        <Route path="servicios/:servicioId" element={<PanelServicio />}>
          <Route index element={<ResumenServicio />} />
          <Route path="materiales" element={<MaterialesServicio />} />
          <Route path="personal" element={<PersonalServicio />} />
          <Route path="equipos" element={<EquiposServicio />} />
          <Route path="gastos" element={<GastosServicio />} />
          <Route
            path="ingresos"
            element={
              <Protegida seccion="ingresos">
                <IngresosServicio />
              </Protegida>
            }
          />
          <Route path="cobros" element={<Navigate to="../ingresos" replace />} />
          <Route path="facturacion" element={<Navigate to="../ingresos" replace />} />
          <Route path="cronograma" element={<CronogramaServicio />} />
          <Route path="curva-s" element={<CurvaSServicio />} />
          <Route path="linea-base" element={<LineaBaseServicio />} />
          <Route path="partidas" element={<PartidasServicio />} />
          <Route path="valorizaciones" element={<ValorizacionesServicio />} />
          <Route path="modificaciones" element={<ModificacionesServicio />} />
          <Route path="parte-diario" element={<ParteDiarioServicio />} />
          <Route
            path="opciones"
            element={
              <Protegida seccion="opciones">
                <OpcionesServicio />
              </Protegida>
            }
          />
        </Route>
        <Route path="personal" element={<Personal />} />
        <Route path="cargos" element={<Cargos />} />
        <Route path="equipos" element={<Equipos />} />
        <Route
          path="oficina"
          element={
            <Protegida ruta="/oficina">
              <Oficina />
            </Protegida>
          }
        />
        <Route path="configuracion" element={<Configuracion />} />
        <Route path="usuarios" element={<Navigate to="/configuracion?seccion=usuarios" replace />} />
        <Route path="unidades" element={<Unidades />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}