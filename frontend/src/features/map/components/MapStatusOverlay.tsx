type Props = {
  showStations: boolean
  showBikePaths: boolean
  showSlope: boolean
  stationCount: number
  roadCount: number
  roadsLoaded: boolean
  slopeLoading: boolean
  zoomLevel: number
  recommendHint: string | null
  slopeHint: string | null
  roadError: string | null
}

/** 지도 좌하단 레이어·범례 힌트 */
export function MapStatusOverlay({
  showStations,
  showBikePaths,
  showSlope,
  stationCount,
  roadCount,
  roadsLoaded,
  slopeLoading,
  zoomLevel,
  recommendHint,
  slopeHint,
  roadError,
}: Props) {
  const layerHint = [
    showStations ? `대여소 ${stationCount}` : null,
    showBikePaths ? (roadsLoaded ? `도로 ${roadCount}` : '도로 로딩…') : null,
    showSlope ? (slopeLoading ? '경사 분석 중…' : '경사 ON') : null,
    `줌 ${zoomLevel}`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="pointer-events-none absolute bottom-3 left-3 max-w-[80%] rounded-lg bg-white/90 px-2 py-1 text-[11px] text-slate-600 shadow">
      <div>{layerHint || '레이어 꺼짐'}</div>
      {showBikePaths && !showSlope && (
        <div className="mt-0.5 flex flex-wrap gap-2 text-[10px]">
          <span style={{ color: 'green' }}>● 하천/공원형</span>
          <span style={{ color: 'gray' }}>● 도로변형</span>
          <span style={{ color: 'red' }}>● 기타</span>
          <span style={{ color: 'blue' }}>━ 추천</span>
        </div>
      )}
      {showSlope && (
        <div className="mt-0.5 flex flex-wrap gap-2 text-[10px]">
          <span style={{ color: '#22c55e' }}>● &lt;2%</span>
          <span style={{ color: '#eab308' }}>● 2–4%</span>
          <span style={{ color: '#f97316' }}>● 4–6%</span>
          <span style={{ color: '#ef4444' }}>● 6–8%</span>
          <span style={{ color: '#991b1b' }}>● ≥8%</span>
        </div>
      )}
      {recommendHint && (
        <div className="mt-0.5 text-[10px] font-medium text-blue-700">{recommendHint}</div>
      )}
      {slopeHint && (
        <div className="mt-0.5 text-[10px] font-medium text-red-700">{slopeHint}</div>
      )}
      {roadError && (
        <div className="mt-0.5 text-[10px] text-red-600">도로: {roadError}</div>
      )}
    </div>
  )
}
