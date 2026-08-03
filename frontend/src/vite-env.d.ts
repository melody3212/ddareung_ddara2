/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_KAKAO_JS_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** Minimal Kakao Maps typings used by this app */
declare namespace kakao {
  namespace maps {
    class LatLng {
      constructor(lat: number, lng: number)
      getLat(): number
      getLng(): number
    }
    class LatLngBounds {
      constructor(sw?: LatLng, ne?: LatLng)
      extend(latlng: LatLng): void
      getSouthWest(): LatLng
      getNorthEast(): LatLng
    }
    class Map {
      constructor(container: HTMLElement, options: object)
      setCenter(latlng: LatLng): void
      setLevel(level: number, options?: object): void
      getLevel(): number
      setBounds(bounds: LatLngBounds, padding?: number): void
      getBounds(): LatLngBounds
      getCenter(): LatLng
      relayout(): void
    }
    class Marker {
      constructor(options: object)
      setMap(map: Map | null): void
      getPosition(): LatLng
    }
    class InfoWindow {
      constructor(options: object)
      open(map: Map, marker: Marker): void
      close(): void
      setContent(content: string): void
    }
    class Polyline {
      constructor(options: object)
      setMap(map: Map | null): void
    }
    class GroundOverlay {
      constructor(src: string, bounds: LatLngBounds, options?: object)
      setMap(map: Map | null): void
    }
    class CustomOverlay {
      constructor(options: object)
      setMap(map: Map | null): void
    }
    class Size {
      constructor(width: number, height: number)
    }
    class Point {
      constructor(x: number, y: number)
    }
    class MarkerImage {
      constructor(src: string, size: Size, options?: object)
    }
    class MarkerClusterer {
      constructor(options: object)
      addMarkers(markers: Marker[]): void
      clear(): void
      setMap(map: Map | null): void
    }
    function load(callback: () => void): void
    namespace event {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function addListener(target: object, type: string, handler: (...args: any[]) => void): void
    }
  }
}

interface Window {
  kakao: typeof kakao
}
