import { BottomNav } from '../components/BottomNav'

export function PlaceholderPage({ title, note }: { title: string; note?: string }) {
  return (
    <div className="flex min-h-full flex-col bg-white pb-16">
      <header className="border-b border-slate-100 px-4 py-4">
        <h1 className="text-lg font-bold text-slate-900">{title}</h1>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="text-slate-500">{note ?? '확장 단계에서 구현 예정'}</p>
      </main>
      <BottomNav />
    </div>
  )
}
