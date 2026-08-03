/**
 * 원본 MapButtons — 우측: 도로 / 대여소
 * 내 위치: 우측 하단 (시트·네비 위에 항상 보이도록)
 */
import { useUiStore, type SheetSnap } from '../store/uiStore'

export function MapButtons() {
  const {
    showStations,
    toggleStations,
    showBikePaths,
    toggleBikePaths,
  } = useUiStore()

  return (
    <div
      className="absolute right-3 top-[28%] z-20 flex -translate-y-1/2 flex-col gap-2.5"
      role="group"
      aria-label="지도 레이어"
    >
      <CircleToggle
        label="자전거 도로"
        active={showBikePaths}
        onClick={toggleBikePaths}
        activeClass="bg-[#35d357] text-white border-[#35d357]"
      >
        🛤
      </CircleToggle>

      <CircleToggle
        label="따릉이 대여소"
        active={showStations}
        onClick={toggleStations}
        activeClass="bg-[#35d357] text-white border-[#35d357]"
      >
        🚲
      </CircleToggle>
    </div>
  )
}

/** 시트 높이 + 하단 네비 위 — 항상 보이도록 z-50 */
const LOC_BOTTOM: Record<SheetSnap, string> = {
  // nav 56px + sheet + gap
  collapsed: 'calc(3.5rem + 72px + 16px)',
  half: 'calc(3.5rem + min(42vh, 320px) + 16px)',
  // 전체 시트일 때는 네비 바로 위 시트 위에 띄움
  full: 'calc(3.5rem + 16px)',
}

export function MyLocationButton({ onClick }: { onClick: () => void }) {
  const sheetSnap = useUiStore((s) => s.sheetSnap)

  return (
    <button
      type="button"
      onClick={onClick}
      title="현재 내 위치"
      aria-label="현재 내 위치로 지도 이동"
      style={{ bottom: LOC_BOTTOM[sheetSnap] }}
      className="absolute right-3 z-50 flex h-12 w-12 items-center justify-center rounded-full border-2 border-blue-500 bg-white text-blue-600 shadow-xl transition hover:bg-blue-50 active:scale-95"
    >
      <span className="relative flex h-5 w-5 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-30" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-blue-600" />
      </span>
    </button>
  )
}

function CircleToggle({
  label,
  active,
  onClick,
  activeClass,
  children,
}: {
  label: string
  active: boolean
  onClick: () => void
  activeClass: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={`${label} ${active ? 'ON' : 'OFF'}`}
      aria-label={`${label} ${active ? '끄기' : '켜기'}`}
      className={[
        'flex h-11 w-11 items-center justify-center rounded-full border text-lg shadow-md transition',
        active ? activeClass : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
