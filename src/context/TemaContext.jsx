import { createContext, useCallback, useEffect, useMemo, useState } from 'react'

// Preferencia VISUAL del usuario (no es un dato de negocio): se guarda en este
// navegador y decide si la interfaz se ve en claro u oscuro. `src/index.css`
// redefine las utilidades bajo `:root[data-tema='oscuro']`.
const CLAVE_TEMA = 'promcoser_tema'

function leerTema() {
  try {
    return window.localStorage.getItem(CLAVE_TEMA) === 'oscuro' ? 'oscuro' : 'claro'
  } catch {
    return 'claro'
  }
}

const TemaContext = createContext(null)

export function TemaProvider({ children }) {
  const [tema, setTema] = useState(leerTema)

  // En el servidor no existe `document`: el HTML inicial sigue siendo claro.
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.setAttribute('data-tema', tema)
  }, [tema])

  const cambiarTema = useCallback((nuevo) => {
    const valido = nuevo === 'oscuro' ? 'oscuro' : 'claro'
    setTema(valido)
    try {
      window.localStorage.setItem(CLAVE_TEMA, valido)
    } catch {
      // Sin almacenamiento: el tema solo dura en esta sesión.
    }
  }, [])

  const valor = useMemo(() => ({ tema, cambiarTema }), [tema, cambiarTema])
  return <TemaContext.Provider value={valor}>{children}</TemaContext.Provider>
}

export { TemaContext }
