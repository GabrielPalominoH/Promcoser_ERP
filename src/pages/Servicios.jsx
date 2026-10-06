import { CatalogoCRUD } from '../components/crud/CatalogoCRUD'
import { CATALOGO_SERVICIOS } from '../config/catalogos'

export function Servicios() {
  return <CatalogoCRUD config={CATALOGO_SERVICIOS} />
}