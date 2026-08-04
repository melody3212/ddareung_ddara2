import { request } from '../../shared/api/client'
import type { Station, StationsMeta } from './types'

export const stationsApi = {
  list: () => request<Station[]>('/stations'),
  meta: () => request<StationsMeta>('/stations/meta'),
}
