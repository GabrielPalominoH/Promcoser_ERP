import { CatalogoCRUD } from '../components/crud/CatalogoCRUD'
import { CATALOGO_MATERIALES } from '../config/catalogos'

export function Materiales() {
  return <CatalogoCRUD config={CATALOGO_MATERIALES} />
}