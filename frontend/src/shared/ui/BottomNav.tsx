import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

/** 하단 탭: 홈 / 내 코스 / 주행 / 커뮤니티 / 마이 */
const items: Array<{
  to: string
  label: string
  icon: (active: boolean) => ReactNode
}> = [
  { to: '/home', label: '홈', icon: IconHome },
  { to: '/my-courses', label: '내 코스', icon: IconMyCourses },
  { to: '/riding', label: '주행', icon: IconRide },
  { to: '/community', label: '커뮤니티', icon: IconCommunity },
  { to: '/mypage', label: '마이', icon: IconMy },
]

/**
 * 앱 프레임(max-w-lg)과 같은 폭·가운데 정렬의 하단 네비
 * fixed + left 50% 로 와이드 화면에서도 지도 컬럼과 폭이 맞음
 */
export function BottomNav() {
  return (
    <nav
      className="pointer-events-none fixed bottom-0 left-1/2 z-40 w-full max-w-lg -translate-x-1/2"
      aria-label="주요 메뉴"
    >
      <div className="pointer-events-auto border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <ul className="flex items-stretch justify-around">
          {items.map((item) => (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  [
                    'flex h-14 flex-col items-center justify-center gap-0.5 transition-colors',
                    isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="flex h-6 w-6 items-center justify-center">
                      {item.icon(isActive)}
                    </span>
                    <span
                      className={[
                        'max-w-[3.5rem] truncate text-[9px] leading-none',
                        isActive ? 'font-bold' : 'font-medium',
                      ].join(' ')}
                    >
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}

function iconClass(active: boolean) {
  return active ? 'stroke-[2.25]' : 'stroke-[1.75]'
}

function IconHome(active: boolean) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-6 w-6 ${iconClass(active)}`}
      fill={active ? 'currentColor' : 'none'}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z"
      />
    </svg>
  )
}

function IconMyCourses(active: boolean) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-6 w-6 ${iconClass(active)}`}
      fill={active ? 'currentColor' : 'none'}
      stroke="currentColor"
      aria-hidden
    >
      {/* 북마크 / 저장 코스 */}
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 4h10a1 1 0 0 1 1 1v15l-6-3.5L6 20V5a1 1 0 0 1 1-1Z"
      />
    </svg>
  )
}

function IconRide(active: boolean) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-6 w-6 ${iconClass(active)}`}
      fill="none"
      stroke="currentColor"
      aria-hidden
    >
      {/* 자전거 느낌: 두 바퀴 + 프레임 */}
      <circle cx="6.5" cy="16.5" r="3" fill={active ? 'currentColor' : 'none'} />
      <circle cx="17.5" cy="16.5" r="3" fill={active ? 'currentColor' : 'none'} />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.5 16.5 10 9h3.5l3 7.5M10 9l-1.5 4h5M13.5 9l2-4h2"
      />
    </svg>
  )
}

function IconCommunity(active: boolean) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-6 w-6 ${iconClass(active)}`}
      fill="none"
      stroke="currentColor"
      aria-hidden
    >
      <circle cx="9" cy="8" r="3" fill={active ? 'currentColor' : 'none'} />
      <circle cx="17" cy="9" r="2.5" fill={active ? 'currentColor' : 'none'} />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.5 19c0-2.8 2.5-5 5.5-5s5.5 2.2 5.5 5"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.5 19c.3-1.8 1.6-3.2 3.5-3.8 1.5.4 2.5 1.7 2.5 3.3"
      />
    </svg>
  )
}

function IconMy(active: boolean) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-6 w-6 ${iconClass(active)}`}
      fill="none"
      stroke="currentColor"
      aria-hidden
    >
      <circle cx="12" cy="8" r="3.5" fill={active ? 'currentColor' : 'none'} />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 19.5c0-3.3 3.1-6 7-6s7 2.7 7 6"
      />
    </svg>
  )
}
