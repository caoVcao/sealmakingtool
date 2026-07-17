import UPNG from 'upng-js'

/** 保存 PNG 目标体积（约 50KB） */
export const PNG_TARGET_BYTES = 50 * 1024

/** 允许上浮比例；超过后尝试色板优化以逼近目标体积 */
const PNG_TARGET_SOFT_MAX = Math.round(PNG_TARGET_BYTES * 1.2)

/**
 * 从 Canvas 提取独立 RGBA 缓冲区，避免共享 ArrayBuffer 导致编码异常。
 */
function extractRgba(canvas: HTMLCanvasElement): Uint8Array {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')

  const { width, height } = canvas
  const { data } = ctx.getImageData(0, 0, width, height)
  return new Uint8Array(data)
}

/**
 * 将二进制 PNG 转为 data URL，供现有下载与状态存储复用。
 */
function arrayBufferToDataUrl(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return `data:image/png;base64,${btoa(binary)}`
}

/**
 * 使用 UPNG.js 对 Canvas 进行 PNG 无损编码；体积仍偏大时回退高色板量化（印章观感等同无损）。
 *
 * @param canvas - 待导出的画布
 * @returns PNG data URL
 */
export function encodeCanvasToOptimizedPngDataUrl(canvas: HTMLCanvasElement): string {
  const { width, height } = canvas
  const rgba = extractRgba(canvas)
  const frame = rgba.buffer.slice(rgba.byteOffset, rgba.byteOffset + rgba.byteLength)

  const lossless = UPNG.encode([frame], width, height, 0)
  if (lossless.byteLength <= PNG_TARGET_SOFT_MAX) {
    return arrayBufferToDataUrl(lossless)
  }

  let best = lossless
  for (const colorCount of [256, 128, 64]) {
    const encoded = UPNG.encode([frame], width, height, colorCount)
    if (encoded.byteLength <= PNG_TARGET_SOFT_MAX) {
      return arrayBufferToDataUrl(encoded)
    }
    if (encoded.byteLength < best.byteLength) {
      best = encoded
    }
  }

  return arrayBufferToDataUrl(best)
}
