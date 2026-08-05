type Props = {
  onSeed: () => void
}

/** 실외 이동 없이 코스 저장 UI 테스트 */
export function DemoRideSeedCard({ onSeed }: Props) {
  return (
    <section className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/80 p-3">
      <p className="text-[11px] font-bold text-amber-900">테스트용</p>
      <p className="mt-0.5 text-[10px] leading-relaxed text-amber-800/90">
        밖에 나가지 않고도 「코스로 저장」을 시험할 수 있어요. 여의도 샘플 경로가
        있는 가짜 주행 기록을 추가합니다.
      </p>
      <button
        type="button"
        onClick={onSeed}
        className="mt-2 w-full rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-amber-600 active:scale-[0.99]"
      >
        데모 주행 기록 추가 → 상세로
      </button>
    </section>
  )
}
