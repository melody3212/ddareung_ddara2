import { getApiBase, request } from '../../shared/api/client'
import type { BikePath, BikePathMeta } from './types'

export const bikeRoadsApi = {
  list: () => request<BikePath[]>('/bike-paths'),
  meta: () => request<BikePathMeta>('/bike-paths/meta'),
  wmsUrl: (bbox: {
    minx: number
    miny: number
    maxx: number
    maxy: number
    width?: number
    height?: number
  }) => {
    const q = new URLSearchParams({
      minx: String(bbox.minx),
      miny: String(bbox.miny),
      maxx: String(bbox.maxx),
      maxy: String(bbox.maxy),
      width: String(bbox.width ?? 768),
      height: String(bbox.height ?? 768),
      _: String(Date.now()),
    })
    return `${getApiBase()}/bike-paths/wms?${q.toString()}`
  },
}
