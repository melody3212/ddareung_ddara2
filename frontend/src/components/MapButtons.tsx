/**
 * 원본: https://github.com/melody3212/ddareung-ddara
 * MapButtons — 우측 세로: 자전거도로 / 따릉이 / 내 위치
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
      className="absolute right-4 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2.5"
      role="group"
      aria-label="지도 제어"
    >
      <CircleToggle
        label="자전거 도로"
        active={showBikePaths}
        onClick={toggleBikePaths}
        activeClass="bg-emerald-500 text-white border-emerald-500"
      >
        🛤
      </CircleToggle>

      <CircleToggle
        label="따릉이 대여소"
        active={showStations}
        onClick={toggleStations}
        activeClass="bg-emerald-500 text-white border-emerald-500"
      >
        🚲
      </CircleToggle>

      <button
        type="button"
        onClick={onMyLocation}
        title="내 위치"
        aria-label="내 위치로 이동"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-lg shadow-md hover:bg-slate-50"
      >
        ◎
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
