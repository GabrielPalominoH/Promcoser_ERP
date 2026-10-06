import { useContext } from 'react'
import { DataContext } from './DataContext'

export function useData() {
  const contexto = useContext(DataContext)

  if (!contexto) {
    throw new Error('useData debe usarse dentro de <DataProvider>')
  }

  return contexto
}