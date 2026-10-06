import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { usePanelServicio } from './panel'

export function OpcionesServicio() {
  const { servicio, abrirEditar, abrirEliminar } = usePanelServicio()

  return (
    <div className="space-y-6">
      <Card
        titulo="Editar servicio"
        descripcion="Modifica los datos del servicio en un modal."
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            Nombre, cliente, presupuesto, fechas y estatus de{' '}
            <span className="font-semibold text-slate-900">
              {servicio.nombre_servicio}
            </span>
            .
          </p>
          <Button variante="secundario" onClick={abrirEditar}>
            Editar
          </Button>
        </div>
      </Card>

      <Card titulo="Eliminar servicio" descripcion="Zona de peligro. Esta acción no se puede deshacer.">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50/60 p-4">
          <p className="text-sm text-slate-600">
            Al eliminar se borrará el servicio junto con sus registros asociados.
          </p>
          <Button variante="peligro" onClick={abrirEliminar}>
            Eliminar
          </Button>
        </div>
      </Card>
    </div>
  )
}
