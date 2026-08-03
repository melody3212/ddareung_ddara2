import { useUiStore } from '../store/uiStore'

/**
 * 지도 우측 상단 — 레이어 on/off 토글 (세로 일렬)
 */
export function MapLayerToggles() {
  const {
    showStations,
    toggleStations,
    showBikePaths,
    toggleBikePaths,
  } = useUiStore()

  return (
    <div
      className="absolute right-3 top-3 z-20 flex flex-col gap-2"
      role="group"
      aria-label="지도 레이어 표시"
    >
      <LayerToggle
        label="따릉이 대여소"
        shortLabel="대여소"
        active={showStations}
        onToggle={toggleStations}
        activeClass="bg-sky-500 text-white border-sky-500"
      />
      <LayerToggle
        label="자전거 도로"
        shortLabel="도로"
        active={showBikePaths}
        onToggle={toggleBikePaths}
        activeClass="bg-emerald-500 text-white border-emerald-500"
      />
    </div>
  )
}

function LayerToggle({
  label,
  shortLabel,
  active,
  onToggle,
  activeClass,
}: {
  label: string
  shortLabel: string
  active: boolean
  onToggle: () => void
  activeClass: string
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      aria-label={`${label} ${active ? '표시 중, 끄기' : '숨김, 켜기'}`}
      title={`${label} ${active ? 'ON' : 'OFF'}`}
      className={[
        'flex min-w-[4.5rem] flex-col items-center gap-0.5 rounded-xl border px-2.5 py-2 shadow-md backdrop-blur transition',
        'text-[11px] font-semibold leading-tight',
        active
          ? activeClass
          : 'border-slate-200 bg-white/95 text-slate-500 hover:bg-slate-50',
      ].join(' ')}
    >
      <span
        className={[
          'h-2 w-2 rounded-full',
          active ? 'bg-white' : 'bg-slate-300',
        ].join(' ')}
      />
      <span>{shortLabel}</span>
      <span className={active ? 'opacity-90' : 'text-slate-400'}>
        {active ? 'ON' : 'OFF'}
      </span>
    </button>
  )
}
