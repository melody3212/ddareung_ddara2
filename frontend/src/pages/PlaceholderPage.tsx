import { BottomNav } from '../shared/ui/BottomNav'

type Props = {
  title: string
  note?: string
}

export function PlaceholderPage({ title, note }: Props) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-slate-50 pb-16">
      <header className="border-b border-slate-200 bg-white px-4 py-4">
        <h1 className="text-lg font-bold text-slate-800">{title}</h1>
        {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
      </header>
      <main className="flex flex-1 items-center justify-center px-6">
        <p className="text-center text-sm text-slate-500">준비 중인 화면입니다.</p>
      </main>
      <BottomNav />
    </div>
  )
}
