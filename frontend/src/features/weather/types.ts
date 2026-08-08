export type HourlyWeather = {
  time: string
  hour: number
  temp_c: number
  feels_like_c: number
  precip_prob: number
  weather_code: number
  condition: string
  icon: string
  wind_ms: number
  humidity: number
}

export type WeatherAlertLevel = 'info' | 'watch' | 'warning' | string

export type WeatherAlert = {
  code: string
  level: WeatherAlertLevel
  title: string
  message: string
  icon: string
  source: string
}

export type Weather = {
  lat: number
  lng: number
  location_name: string
  temp_c: number
  feels_like_c: number
  precip_prob: number
  humidity: number
  wind_ms: number
  weather_code: number
  condition: string
  icon: string
  pm10: number | null
  pm25: number | null
  dust: number | null
  pm10_grade: number
  pm25_grade: number
  dust_grade: number
  pm10_label: string
  pm25_label: string
  dust_label: string
  score: number
  message: string
  hourly: HourlyWeather[]
  /** 해당 지역 + 조건 안내 (라이딩 점수 카드) */
  alerts?: WeatherAlert[]
  /** 전국 기상특보 (날씨 탭 하단) */
  alerts_all?: WeatherAlert[]
  alerts_note?: string | null
  source: string
}
