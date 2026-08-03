/**
 * 우측 세로: 자전거도로 / 따릉이 / 내 위치
 */
import { useUiStore } from '../store/uiStore'

type Props = {
  onMyLocation: () => void
}

export function MapButtons({ onMyLocation }: Props) {
  const {
    showStations,
    toggleStations,
    showBikePaths,
    toggleBikePaths,
  } = useUiStore()

  return (
    <div
      className="absolute right-3 top-[28%] z-50 flex -translate-y-1/2 flex-col gap-2.5"
      role="group"
      aria-label="지도 제어"
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

      {/* 자전거·대여소 토글 바로 아래 */}
      <button
        type="button"
        onClick={onMyLocation}
        title="현재 내 위치"
        aria-label="현재 내 위치로 지도 이동"
        className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-blue-500 bg-white text-blue-600 shadow-md transition hover:bg-blue-50 active:scale-95"
      >
        <span className="relative flex h-4 w-4 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-30" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-600" />
        </span>
      </button>
    </div>
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
