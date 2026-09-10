import { api } from './client'
import type { UnidadMedida } from '../types/unidadMedida'

export function getUnidadesMedida() {
  return api.get<UnidadMedida[]>('/api/UnidadesMedida')
}
