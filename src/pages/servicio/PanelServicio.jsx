import { Link, Outlet, useParams } from 'react-router-dom'
import { useData } from '../../context/useData'
import { Button } from '../../components/ui/Button'

export function PanelServicio() {
  const { servicioId } = useParams()
  const {
    estado: { servicios },
  } = useData()

  const servicio = servicios.find((s) => String(s.id) === String(servicioId))

  if (!servicio) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Servicio no encontrado
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            El servicio solicitado no existe.
          </p>
        </div>
        <Link to="/servicios">
          <Button variante="secundario">Volver a servicios</Button>
        </Link>
      </div>
    )
  }

  return <Outlet context={{ servicio }} />
}
