import { useContext } from 'react'
import { TemaContext } from './TemaContext'

// Sin proveedor (render de servidor en la suite): tema claro fijo.
const FIJO = { tema: 'claro', cambiarTema: () => {} }

export function useTema() {
  return useContext(TemaContext) ?? FIJO
}
