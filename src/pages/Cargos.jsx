import { CatalogoCRUD } from '../components/crud/CatalogoCRUD'
import { CATALOGO_CARGOS } from '../config/catalogos'

export function Cargos() {
  return <CatalogoCRUD config={CATALOGO_CARGOS} />
}
