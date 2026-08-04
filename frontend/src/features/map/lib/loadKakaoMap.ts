const SCRIPT_ID = 'kakao-maps-sdk'

let loadPromise: Promise<typeof kakao.maps> | null = null

function domainHint(): string {
  if (typeof window === 'undefined') return ''
  const origin = window.location.origin
  return (
    `현재 주소: ${origin}\n` +
    '카카오 개발자 콘솔 → 앱 설정 → 플랫폼 → Web 사이트 도메인에 아래를 모두 등록하세요.\n' +
    '  • http://localhost:5173\n' +
    '  • http://127.0.0.1:5173\n' +
    `(지금 접속 origin 과 일치해야 합니다: ${origin})`
  )
}

/**
 * Load Kakao Maps JS SDK once (autoload=false → kakao.maps.load).
 */
export function loadKakaoMaps(): Promise<typeof kakao.maps> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('window is not available'))
  }

  // 이미 완전히 로드된 경우
  if (window.kakao?.maps && typeof window.kakao.maps.LatLng === 'function') {
    return new Promise((resolve, reject) => {
      try {
        window.kakao.maps.load(() => {
          if (!window.kakao?.maps || typeof window.kakao.maps.LatLng !== 'function') {
            reject(
              new Error(
                '카카오 지도 초기화 실패 (도메인/앱키 확인).\n' + domainHint(),
              ),
            )
            return
          }
          resolve(window.kakao.maps)
        })
      } catch (e) {
        reject(
          new Error(
            `카카오 maps.load 실패: ${e instanceof Error ? e.message : String(e)}\n${domainHint()}`,
          ),
        )
      }
    })
  }

  if (loadPromise) return loadPromise

  const appkey = (import.meta.env.VITE_KAKAO_JS_KEY || '').trim()
  if (!appkey) {
    return Promise.reject(
      new Error(
        'VITE_KAKAO_JS_KEY 가 없습니다.\n' +
          'frontend/.env 에 JavaScript 키를 넣고 Vite를 재시작하세요.\n' +
          '예: VITE_KAKAO_JS_KEY=xxxxxxxx',
      ),
    )
  }

  loadPromise = new Promise((resolve, reject) => {
    const finishOk = () => {
      try {
        if (!window.kakao?.maps || typeof window.kakao.maps.load !== 'function') {
          loadPromise = null
          reject(
            new Error(
              'Kakao SDK 로드됐지만 maps.load 가 없습니다.\n' + domainHint(),
            ),
          )
          return
        }
        window.kakao.maps.load(() => {
          if (!window.kakao?.maps || typeof window.kakao.maps.LatLng !== 'function') {
            loadPromise = null
            reject(
              new Error(
                '지도 객체 생성 불가. JavaScript 키·Web 도메인 등록을 확인하세요.\n' +
                  domainHint(),
              ),
            )
            return
          }
          resolve(window.kakao.maps)
        })
      } catch (e) {
        loadPromise = null
        reject(
          new Error(
            `카카오 초기화 오류: ${e instanceof Error ? e.message : String(e)}\n${domainHint()}`,
          ),
        )
      }
    }

    const fail = (msg: string) => {
      loadPromise = null
      reject(new Error(`${msg}\n${domainHint()}`))
    }

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    if (existing) {
      // 이미 붙인 스크립트가 로딩 중/완료
      if (window.kakao?.maps && typeof window.kakao.maps.load === 'function') {
        finishOk()
        return
      }
      existing.addEventListener('load', () => finishOk())
      existing.addEventListener('error', () =>
        fail('Kakao Maps script load failed (네트워크/차단)'),
      )
      // load 이벤트를 이미 놓친 경우 폴백
      window.setTimeout(() => {
        if (window.kakao?.maps && typeof window.kakao.maps.load === 'function') finishOk()
      }, 500)
      return
    }

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.async = true
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appkey)}&autoload=false&libraries=services,clusterer`
    script.onload = () => finishOk()
    script.onerror = () =>
      fail(
        'Kakao Maps SDK 스크립트 로드 실패. 네트워크·광고차단·앱키를 확인하세요.',
      )
    document.head.appendChild(script)
  })

  return loadPromise
}
