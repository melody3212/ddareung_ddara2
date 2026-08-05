import { RideRecordCard } from './RideRecordCard'
import type { RideRecord } from '../types'

type Props = {
  records: RideRecord[]
  onRefresh: () => void
}

export function RideRecordList({ records, onRefresh }: Props) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-800">최근 기록</h2>
        <button
          type="button"
          onClick={onRefresh}
          className="text-[11px] font-medium text-blue-600"
        >
          새로고침
        </button>
      </div>

      {records.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white px-4 py-8 text-center shadow-sm">
          <p className="text-sm text-slate-500">아직 저장된 주행이 없습니다.</p>
          <p className="mt-1 text-xs text-slate-400">
            주행을 종료하면 여기에 목록이 쌓입니다.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {records.map((r) => (
            <li key={r.id}>
              <RideRecordCard record={r} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
