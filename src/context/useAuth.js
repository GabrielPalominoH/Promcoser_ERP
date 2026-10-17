import { useContext } from 'react'
import { AuthContext } from './AuthContext'

// Contexto abierto para cuando no hay proveedor (render de servidor en la
// suite): administrador sin sesión que exigir.
const ABIERTO = {
  autenticado: true,
  usuario: { id: 0, nombre: 'Administrador', cargo: '', correo: '', rol: 'administrador', activo: true },
  rol: 'administrador',
  usuarios: [],
  iniciarSesion: () => ({ ok: true }),
  cerrarSesion: () => {},
  cambiarMiClave: () => ({ ok: false, error: 'No disponible.' }),
  actualizarMiPerfil: () => ({ ok: false, error: 'No disponible.' }),
  crearUsuario: () => ({ ok: false, error: 'No disponible.' }),
  actualizarUsuario: () => ({ ok: false, error: 'No disponible.' }),
  restablecerClave: () => ({ ok: false, error: 'No disponible.' }),
  eliminarUsuario: () => ({ ok: false, error: 'No disponible.' }),
  puedeEscribir: () => true,
  avisarDenegado: () => {},
}

export function useAuth() {
  return useContext(AuthContext) ?? ABIERTO
}
