import { CatalogoCRUD } from '../components/crud/CatalogoCRUD'
import { CATALOGO_EQUIPOS } from '../config/catalogos'

export function Equipos() {
  return <CatalogoCRUD config={CATALOGO_EQUIPOS} />
}