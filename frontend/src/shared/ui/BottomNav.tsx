import { NavLink } from 'react-router-dom'

/** 원래 하단 탭: 홈 / 주행 / 커뮤니티 / 마이 */
const items = [
  { to: '/home', label: '홈' },
  { to: '/riding', label: '주행' },
  { to: '/community', label: '커뮤니티' },
  { to: '/mypage', label: '마이' },
]

/**
 * 앱 프레임(max-w-lg)과 같은 폭·가운데 정렬의 하단 네비
 * fixed + left 50% 로 와이드 화면에서도 지도 컬럼과 폭이 맞음
 */
export function BottomNav() {
  return (
    <nav className="pointer-events-none fixed bottom-0 left-1/2 z-40 w-full max-w-lg -translate-x-1/2">
      <div className="pointer-events-auto border-t border-slate-200 bg-white/95 backdrop-blur">
        <ul className="flex items-stretch justify-around">
          {items.map((item) => (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  [
                    'flex h-14 items-center justify-center text-sm font-medium',
                    isActive ? 'text-blue-600' : 'text-slate-500',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
