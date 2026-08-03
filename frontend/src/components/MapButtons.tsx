/**
 * 원본 MapButtons — 우측: 도로 / 대여소
 * 내 위치는 우측 하단 별도 버튼 (요구사항)
 */
import { useUiStore } from '../store/uiStore'

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

/** 우측 하단 — 현재 내 위치로 지도 이동 */
export function MyLocationButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="현재 내 위치"
      aria-label="현재 내 위치로 지도 이동"
      className="absolute bottom-[calc(3.5rem+12px)] right-3 z-30 flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-xl shadow-lg hover:bg-slate-50 active:scale-95"
    >
      ◎
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
