/** 주행 추억 사진 — 브라우저 canvas 압축 (localStorage 용량 고려) */

export const MAX_RIDE_PHOTOS = 5
/** 긴 변 최대 픽셀 */
const MAX_EDGE = 960
/** JPEG 품질 */
const JPEG_QUALITY = 0.68

/**
 * File/Blob → 압축 data URL (image/jpeg)
 */
export function compressImageFile(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/') && !(file instanceof Blob)) {
      reject(new Error('이미지 파일만 추가할 수 있습니다.'))
      return
    }

    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      try {
        URL.revokeObjectURL(url)
        const { width, height } = fitSize(img.naturalWidth, img.naturalHeight, MAX_EDGE)
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('이미지 처리에 실패했습니다.'))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
        resolve(dataUrl)
      } catch (e) {
        reject(e instanceof Error ? e : new Error('압축 실패'))
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('이미지를 불러오지 못했습니다.'))
    }
    img.src = url
  })
}

function fitSize(w: number, h: number, maxEdge: number): { width: number; height: number } {
  if (w <= 0 || h <= 0) return { width: 1, height: 1 }
  const long = Math.max(w, h)
  if (long <= maxEdge) return { width: w, height: h }
  const scale = maxEdge / long
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
  }
}

export function newPhotoId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `ph-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
