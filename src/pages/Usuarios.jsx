import { useState } from 'react'
import { useAuth } from '../context/useAuth'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Aviso } from '../components/ui/Aviso'
import { Badge } from '../components/ui/Badge'
import { Campo, Input, Select } from '../components/ui/Field'
import { Table, TableBody, TableEmpty, TableHead, TableRow, Td, Th } from '../components/ui/Table'
import { DESCRIPCION_ROL, ETIQUETAS_ROL, ROLES } from '../utils/permisos'
import { LARGO_MINIMO_CLAVE } from '../data/auth'

const VACIO = { nombre: '', correo: '', rol: 'residente', clave: '' }

function ModalUsuario({ usuario, onCerrar, onGuardar }) {
  const [valores, setValores] = useState(
    usuario ? { nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol, clave: '' } : VACIO,
  )
  const [error, setError] = useState('')
  const poner = (campo) => (e) => {
    setValores((v) => ({ ...v, [campo]: e.target.value }))
    setError('')
  }

  const enviar = (e) => {
    e.preventDefault()
    const resultado = onGuardar(valores)
    if (!resultado.ok) setError(resultado.error)
  }

  return (
    <Modal
      abierto
      titulo={usuario ? 'Editar usuario' : 'Nuevo usuario'}
      descripcion={DESCRIPCION_ROL[valores.rol]}
      onCerrar={onCerrar}
      ancho="sm"
    >
      <form onSubmit={enviar} noValidate className="space-y-4">
        <Campo label="Nombre" htmlFor="usr-nombre">
          <Input id="usr-nombre" value={valores.nombre} onChange={poner('nombre')} />
        </Campo>
        <Campo label="Correo" htmlFor="usr-correo">
          <Input id="usr-correo" type="email" value={valores.correo} onChange={poner('correo')} />
        </Campo>
        <Campo label="Rol" htmlFor="usr-rol">
          <Select id="usr-rol" value={valores.rol} onChange={poner('rol')}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ETIQUETAS_ROL[r]}
              </option>
            ))}
          </Select>
        </Campo>
        {!usuario && (
          <Campo
            label="Clave inicial"
            htmlFor="usr-clave"
            hint={`Mínimo ${LARGO_MINIMO_CLAVE} caracteres. Compártela por un medio seguro; la persona puede cambiarla en Configuración.`}
          >
            <Input id="usr-clave" type="text" autoComplete="off" value={valores.clave} onChange={poner('clave')} />
          </Campo>
        )}
        {error && (
          <p role="alert" className="text-sm font-medium text-red-600">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variante="secundario" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="submit">{usuario ? 'Guardar cambios' : 'Crear usuario'}</Button>
        </div>
      </form>
    </Modal>
  )
}

function ModalClave({ usuario, onCerrar, onGuardar }) {
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')
  const enviar = (e) => {
    e.preventDefault()
    const resultado = onGuardar(clave)
    if (!resultado.ok) setError(resultado.error)
  }
  return (
    <Modal abierto titulo="Restablecer clave" descripcion={usuario.nombre} onCerrar={onCerrar} ancho="sm">
      <form onSubmit={enviar} noValidate className="space-y-4">
        <Campo label="Nueva clave" htmlFor="usr-nueva" hint={`Mínimo ${LARGO_MINIMO_CLAVE} caracteres.`}>
          <Input
            id="usr-nueva"
            type="text"
            autoComplete="off"
            value={clave}
            onChange={(e) => {
              setClave(e.target.value)
              setError('')
            }}
          />
        </Campo>
        {error && (
          <p role="alert" className="text-sm font-medium text-red-600">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variante="secundario" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="submit">Restablecer</Button>
        </div>
      </form>
    </Modal>
  )
}

export function Usuarios() {
  const { usuario, usuarios, crearUsuario, actualizarUsuario, restablecerClave, eliminarUsuario } = useAuth()
  const [modal, setModal] = useState(null) // { tipo: 'nuevo' | 'editar' | 'clave', usuario? }
  const [aviso, setAviso] = useState(null)
  const [porEliminar, setPorEliminar] = useState(null)

  const resultado = (r, mensaje) => {
    if (r.ok) {
      setModal(null)
      setPorEliminar(null)
      setAviso({ tipo: 'exito', mensaje })
    } else {
      setAviso({ tipo: 'error', mensaje: r.error })
    }
    return r
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Usuarios y roles</h1>
          <p className="mt-1 text-sm text-slate-500">
            Quién puede entrar al sistema y qué puede hacer. Solo el administrador ve esta pantalla.
          </p>
        </div>
        <Button onClick={() => setModal({ tipo: 'nuevo' })}>Nuevo usuario</Button>
      </div>

      <Card>
        <Table>
          <TableHead>
            <TableRow>
              <Th>Nombre</Th>
              <Th>Correo</Th>
              <Th>Rol</Th>
              <Th>Estado</Th>
              <Th alinear="right">Acciones</Th>
            </TableRow>
          </TableHead>
          <TableBody>
            {usuarios.length === 0 && <TableEmpty colSpan={5} />}
            {usuarios.map((u) => {
              const yo = u.id === usuario?.id
              return (
                <TableRow key={u.id}>
                  <Td>
                    {u.nombre}
                    {yo && <span className="ml-2 text-xs text-slate-500">(tú)</span>}
                  </Td>
                  <Td>{u.correo}</Td>
                  <Td>{ETIQUETAS_ROL[u.rol] ?? u.rol}</Td>
                  <Td>
                    <Badge variante={u.activo === false ? 'neutral' : 'success'}>
                      {u.activo === false ? 'Desactivado' : 'Activo'}
                    </Badge>
                  </Td>
                  <Td alinear="right">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Button tamano="sm" variante="secundario" onClick={() => setModal({ tipo: 'editar', usuario: u })}>
                        Editar
                      </Button>
                      <Button tamano="sm" variante="secundario" onClick={() => setModal({ tipo: 'clave', usuario: u })}>
                        Clave
                      </Button>
                      {!yo && (
                        <Button
                          tamano="sm"
                          variante="secundario"
                          onClick={() =>
                            resultado(
                              actualizarUsuario(u.id, { activo: u.activo === false }),
                              u.activo === false ? 'Usuario activado.' : 'Usuario desactivado.',
                            )
                          }
                        >
                          {u.activo === false ? 'Activar' : 'Desactivar'}
                        </Button>
                      )}
                      {!yo && (
                        <Button tamano="sm" variante="peligro" onClick={() => setPorEliminar(u)}>
                          Eliminar
                        </Button>
                      )}
                    </div>
                  </Td>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>

      <Card titulo="Qué puede hacer cada rol">
        <dl className="grid gap-3 sm:grid-cols-2">
          {ROLES.map((r) => (
            <div key={r}>
              <dt className="text-sm font-semibold text-slate-900">{ETIQUETAS_ROL[r]}</dt>
              <dd className="text-sm text-slate-500">{DESCRIPCION_ROL[r]}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
          Las cuentas viven solo en este navegador y no van en el respaldo de datos. Es un control de uso, no
          una seguridad fuerte: para eso hace falta un servidor.
        </p>
      </Card>

      {modal?.tipo === 'nuevo' && (
        <ModalUsuario
          onCerrar={() => setModal(null)}
          onGuardar={(v) => resultado(crearUsuario(v), 'Usuario creado.')}
        />
      )}
      {modal?.tipo === 'editar' && (
        <ModalUsuario
          usuario={modal.usuario}
          onCerrar={() => setModal(null)}
          onGuardar={(v) =>
            resultado(
              actualizarUsuario(modal.usuario.id, { nombre: v.nombre.trim(), correo: v.correo, rol: v.rol }),
              'Usuario actualizado.',
            )
          }
        />
      )}
      {modal?.tipo === 'clave' && (
        <ModalClave
          usuario={modal.usuario}
          onCerrar={() => setModal(null)}
          onGuardar={(clave) => resultado(restablecerClave(modal.usuario.id, clave), 'Clave restablecida.')}
        />
      )}
      {porEliminar && (
        <Modal
          abierto
          titulo="Eliminar usuario"
          descripcion={`${porEliminar.nombre} dejará de poder entrar. Esta acción no se puede deshacer.`}
          onCerrar={() => setPorEliminar(null)}
          ancho="sm"
        >
          <div className="flex justify-end gap-2">
            <Button variante="secundario" onClick={() => setPorEliminar(null)}>
              Cancelar
            </Button>
            <Button variante="peligro" onClick={() => resultado(eliminarUsuario(porEliminar.id), 'Usuario eliminado.')}>
              Eliminar
            </Button>
          </div>
        </Modal>
      )}

      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />
    </div>
  )
}
