import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  adminsActivos,
  cargarUsuarios,
  cerrarSesionGuardada,
  crearRegistroUsuario,
  guardarSesion,
  guardarUsuarios,
  hashClave,
  leerSesion,
  limpiarFallos,
  nuevaSalt,
  normalizarCorreo,
  registrarFallo,
  segundosDeBloqueo,
  validarClaveNueva,
  verificarClave,
} from '../data/auth'
import { puedeEscribir } from '../utils/permisos'

// Sin proveedor (pruebas de servidor) no hay sesión que exigir: `useAuth`
// devuelve un contexto abierto de administrador. `main.jsx` siempre monta el
// proveedor real, que sí exige iniciar sesión.
const AuthContext = createContext(null)

const TEXTO_BLOQUEO = (s) => `Demasiados intentos. Espera ${s} s para volver a intentar.`

export function AuthProvider({ children }) {
  const [usuarios, setUsuarios] = useState(cargarUsuarios)
  const [usuarioId, setUsuarioId] = useState(() => leerSesion(cargarUsuarios())?.id ?? null)
  const [toast, setToast] = useState(null)
  const temporizador = useRef(null)

  const usuario = useMemo(
    () => usuarios.find((u) => u.id === usuarioId && u.activo !== false) ?? null,
    [usuarios, usuarioId],
  )

  const persistir = useCallback((lista) => {
    setUsuarios(lista)
    guardarUsuarios(lista)
  }, [])

  // La sesión caduca sola: se revisa cada minuto.
  useEffect(() => {
    if (!usuarioId) return undefined
    const id = setInterval(() => {
      if (!leerSesion(usuarios)) setUsuarioId(null)
    }, 60000)
    return () => clearInterval(id)
  }, [usuarioId, usuarios])

  const avisar = useCallback((mensaje) => {
    setToast(mensaje)
    clearTimeout(temporizador.current)
    temporizador.current = setTimeout(() => setToast(null), 4000)
  }, [])

  const iniciarSesion = useCallback(
    (correo, clave) => {
      const espera = segundosDeBloqueo()
      if (espera > 0) return { ok: false, error: TEXTO_BLOQUEO(espera) }
      const candidato = usuarios.find((u) => u.correo === normalizarCorreo(correo))
      if (!candidato || candidato.activo === false || !verificarClave(candidato, clave)) {
        registrarFallo()
        const restante = segundosDeBloqueo()
        return {
          ok: false,
          error: restante > 0 ? TEXTO_BLOQUEO(restante) : 'Correo o clave incorrectos.',
        }
      }
      limpiarFallos()
      guardarSesion(candidato.id)
      setUsuarioId(candidato.id)
      return { ok: true, rol: candidato.rol }
    },
    [usuarios],
  )

  const cerrarSesion = useCallback(() => {
    cerrarSesionGuardada()
    setUsuarioId(null)
  }, [])

  const cambiarMiClave = useCallback(
    (actual, nueva) => {
      if (!usuario) return { ok: false, error: 'No hay sesión activa.' }
      if (!verificarClave(usuario, actual)) return { ok: false, error: 'La clave actual no coincide.' }
      const error = validarClaveNueva(nueva)
      if (error) return { ok: false, error }
      const salt = nuevaSalt()
      persistir(usuarios.map((u) => (u.id === usuario.id ? { ...u, salt, hash: hashClave(nueva, salt) } : u)))
      return { ok: true }
    },
    [usuario, usuarios, persistir],
  )

  // ---- administración de usuarios (la pantalla ya la restringe al administrador) ----
  const crearUsuario = useCallback(
    ({ nombre, correo, rol, clave }) => {
      if (usuario?.rol !== 'administrador') return { ok: false, error: 'Solo el administrador gestiona usuarios.' }
      if (!String(nombre ?? '').trim()) return { ok: false, error: 'Escribe el nombre.' }
      const mail = normalizarCorreo(correo)
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) return { ok: false, error: 'El correo no es válido.' }
      if (usuarios.some((u) => u.correo === mail)) return { ok: false, error: 'Ya existe un usuario con ese correo.' }
      const errorClave = validarClaveNueva(clave)
      if (errorClave) return { ok: false, error: errorClave }
      const id = usuarios.reduce((max, u) => Math.max(max, u.id), 0) + 1
      persistir([...usuarios, crearRegistroUsuario({ id, nombre, correo: mail, rol, clave })])
      return { ok: true }
    },
    [usuario, usuarios, persistir],
  )

  const actualizarUsuario = useCallback(
    (id, cambios) => {
      if (usuario?.rol !== 'administrador') return { ok: false, error: 'Solo el administrador gestiona usuarios.' }
      const actual = usuarios.find((u) => u.id === id)
      if (!actual) return { ok: false, error: 'El usuario no existe.' }
      const siguiente = { ...actual, ...cambios }
      if (cambios.correo !== undefined) {
        siguiente.correo = normalizarCorreo(cambios.correo)
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(siguiente.correo)) return { ok: false, error: 'El correo no es válido.' }
        if (usuarios.some((u) => u.id !== id && u.correo === siguiente.correo)) {
          return { ok: false, error: 'Ya existe un usuario con ese correo.' }
        }
      }
      const quedaSinAdmin =
        adminsActivos(usuarios.map((u) => (u.id === id ? siguiente : u))).length === 0
      if (quedaSinAdmin) return { ok: false, error: 'Debe quedar al menos un administrador activo.' }
      persistir(usuarios.map((u) => (u.id === id ? siguiente : u)))
      return { ok: true }
    },
    [usuario, usuarios, persistir],
  )

  const restablecerClave = useCallback(
    (id, nueva) => {
      if (usuario?.rol !== 'administrador') return { ok: false, error: 'Solo el administrador gestiona usuarios.' }
      const error = validarClaveNueva(nueva)
      if (error) return { ok: false, error }
      const salt = nuevaSalt()
      persistir(usuarios.map((u) => (u.id === id ? { ...u, salt, hash: hashClave(nueva, salt) } : u)))
      return { ok: true }
    },
    [usuario, usuarios, persistir],
  )

  const eliminarUsuario = useCallback(
    (id) => {
      if (usuario?.rol !== 'administrador') return { ok: false, error: 'Solo el administrador gestiona usuarios.' }
      if (id === usuario.id) return { ok: false, error: 'No puedes eliminar tu propio usuario.' }
      const resto = usuarios.filter((u) => u.id !== id)
      if (adminsActivos(resto).length === 0) return { ok: false, error: 'Debe quedar al menos un administrador activo.' }
      persistir(resto)
      return { ok: true }
    },
    [usuario, usuarios, persistir],
  )

  const valor = useMemo(
    () => ({
      autenticado: Boolean(usuario),
      usuario,
      rol: usuario?.rol ?? null,
      usuarios,
      iniciarSesion,
      cerrarSesion,
      cambiarMiClave,
      crearUsuario,
      actualizarUsuario,
      restablecerClave,
      eliminarUsuario,
      puedeEscribir: (coleccion, accion) => Boolean(usuario) && puedeEscribir(usuario.rol, coleccion, accion),
      avisarDenegado: avisar,
    }),
    [usuario, usuarios, iniciarSesion, cerrarSesion, cambiarMiClave, crearUsuario, actualizarUsuario, restablecerClave, eliminarUsuario, avisar],
  )

  return (
    <AuthContext.Provider value={valor}>
      {children}
      {toast && (
        <div
          role="alert"
          className="fixed bottom-4 left-1/2 z-[60] max-w-[90vw] -translate-x-1/2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 shadow-lg"
        >
          {toast}
        </div>
      )}
    </AuthContext.Provider>
  )
}

export { AuthContext }
