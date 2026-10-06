import { CatalogoCRUD } from '../components/crud/CatalogoCRUD'
import { CATALOGO_PERSONAL } from '../config/catalogos'

export function Personal() {
  return <CatalogoCRUD config={CATALOGO_PERSONAL} />
}