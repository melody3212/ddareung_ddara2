/**
 * 통합 API 파사드 — 기존 `api.xxx` 호출 호환
 * 신규 코드는 기능별 `stationsApi` / `weatherApi` 등 직접 import 권장
 */
import { request } from './client'
import { bikeRoadsApi } from '../../features/bike-roads'
import { coursesApi } from '../../features/courses'
import { elevationApi } from '../../features/elevation'
import { placesApi } from '../../features/places'
import { routesApi } from '../../features/routes'
import { stationsApi } from '../../features/stations'
import { weatherApi } from '../../features/weather'

export type { Station, StationsMeta } from '../../features/stations'
export type { Course } from '../../features/courses'
export type { HourlyWeather, Weather } from '../../features/weather'
export type { BikePath, BikePathMeta } from '../../features/bike-roads'
export type {
  ElevationBatchResponse,
  ElevationProfile,
  ElevationSummary,
  GradeSegment,
} from '../../features/elevation'
export type {
  RouteSearchRequest,
  RouteSearchResponse,
  RouteSearchResult,
} from '../../features/routes'

export const api = {
  health: () => request<{ status: string; app: string }>('/health'),
  stations: stationsApi.list,
  stationsMeta: stationsApi.meta,
  courses: coursesApi.list,
  course: coursesApi.get,
  weather: weatherApi.get,
  bikePaths: bikeRoadsApi.list,
  bikePathsMeta: bikeRoadsApi.meta,
  bikePathsWmsUrl: bikeRoadsApi.wmsUrl,
  elevationProfile: elevationApi.profile,
  elevationBatch: elevationApi.batch,
  elevationMeta: elevationApi.meta,
  routesSearch: routesApi.search,
  routesMeta: routesApi.meta,
  placesSearch: placesApi.search,
  placesMeta: placesApi.meta,
}
