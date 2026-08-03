import { useCallback, useRef, type ReactNode } from 'react'
import { useUiStore, type SheetSnap } from '../store/uiStore'

/** snap → 시트 높이 (하단 네비 위에 얹힘) */
const SNAP_H: Record<SheetSnap, string> = {
  collapsed: '72px',
  half: '42vh',
  full: '78vh',
}

type Props = {
  children: ReactNode
}

/**
 * 하단 플로팅 시트 — 드래그로 접기/절반/전체 스냅
 */
export function BottomSheet({ children }: Props) {
  const { sheetSnap, setSheetSnap } = useUiStore()
  const startY = useRef(0)
  const startSnap = useRef<SheetSnap>('half')
  const dragging = useRef(false)

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragging.current = true
      startY.current = e.clientY
      startSnap.current = sheetSnap
      ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    },
    [sheetSnap],
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return
      dragging.current = false
      const dy = e.clientY - startY.current
      // 위로 드래그 = dy < 0 → 더 펼침
      if (dy < -48) {
        if (startSnap.current === 'collapsed') setSheetSnap('half')
        else setSheetSnap('full')
      } else if (dy > 48) {
        if (startSnap.current === 'full') setSheetSnap('half')
        else setSheetSnap('collapsed')
      }
    },
    [setSheetSnap],
  )

  const onHandleClick = () => {
    // 탭으로도 순환
    if (sheetSnap === 'collapsed') setSheetSnap('half')
    else if (sheetSnap === 'half') setSheetSnap('full')
    else setSheetSnap('collapsed')
  }

  return (
    <div
      className="absolute bottom-14 left-0 right-0 z-30 flex flex-col overflow-hidden rounded-t-3xl bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.12)] transition-[height] duration-300 ease-out pointer-events-auto"
      style={{ height: SNAP_H[sheetSnap] }}
    >
      {/* 드래그 핸들 */}
      <div
        className="flex shrink-0 cursor-grab flex-col items-center touch-none select-none active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={onHandleClick}
        role="button"
        aria-label="시트 높이 조절"
        tabIndex={0}
      >
        <span className="mt-2 mb-1 h-1 w-10 rounded-full bg-slate-300" />
        <span className="mb-1 text-[10px] text-slate-400">
          {sheetSnap === 'collapsed' && '올려서 펼치기'}
          {sheetSnap === 'half' && '더 올리거나 내리기'}
          {sheetSnap === 'full' && '내려서 접기'}
        </span>
      </div>

      <div
        className={[
          'min-h-0 flex-1 px-4 pb-3',
          sheetSnap === 'collapsed' ? 'overflow-hidden' : 'overflow-y-auto',
        ].join(' ')}
      >
        {children}
      </div>
    </div>
  )
}
