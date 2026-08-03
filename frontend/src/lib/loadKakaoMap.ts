const SCRIPT_ID = 'kakao-maps-sdk'

let loadPromise: Promise<typeof kakao.maps> | null = null

/**
 * Load Kakao Maps JS SDK once (autoload=false → kakao.maps.load).
 */
export function loadKakaoMaps(): Promise<typeof kakao.maps> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('window is not available'))
  }

  if (window.kakao?.maps) {
    return new Promise((resolve) => {
      window.kakao.maps.load(() => resolve(window.kakao.maps))
    })
  }

  if (loadPromise) return loadPromise

  const appkey = import.meta.env.VITE_KAKAO_JS_KEY
  if (!appkey) {
    return Promise.reject(
      new Error('VITE_KAKAO_JS_KEY 가 없습니다. frontend/.env 를 확인하세요.'),
    )
  }

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', () => {
        window.kakao.maps.load(() => resolve(window.kakao.maps))
      })
      existing.addEventListener('error', () => reject(new Error('Kakao Maps script load failed')))
      return
    }

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.async = true
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appkey)}&autoload=false&libraries=services,clusterer`
    script.onload = () => {
      if (!window.kakao?.maps) {
        reject(new Error('Kakao Maps SDK loaded but window.kakao.maps is missing'))
        return
      }
      window.kakao.maps.load(() => resolve(window.kakao.maps))
    }
    script.onerror = () => {
      loadPromise = null
      reject(
        new Error(
          'Kakao Maps SDK 로드 실패. 앱키·도메인(http://localhost:5173) 등록을 확인하세요.',
        ),
      )
    }
    document.head.appendChild(script)
  })

  return loadPromise
}
