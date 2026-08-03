import { NavLink } from 'react-router-dom'

const items = [
  { to: '/home', label: '홈' },
  { to: '/riding', label: '주행' },
  { to: '/community', label: '커뮤니티' },
  { to: '/mypage', label: '마이' },
]

/** 앱 프레임(max-w-lg)과 같은 폭의 하단 네비 */
export function BottomNav() {
  return (
    <nav className="pointer-events-none fixed bottom-0 left-0 right-0 z-40 flex justify-center">
      <div className="pointer-events-auto w-full max-w-lg border-t border-slate-200 bg-white/95 backdrop-blur">
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
