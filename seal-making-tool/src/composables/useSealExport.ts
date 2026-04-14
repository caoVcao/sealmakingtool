import type { SealParams, ImageState } from '../types/seal.types'
import { MM_TO_PX } from '../constants/sealTypes'
import { processImage, detectMainColor, loadImageData } from './useImageProcessor'

const PREVIEW_BASE_FRAME_PX = 320

/**
 * 根据当前印章尺寸计算预览虚框像素尺寸（绝对尺寸联动）。
 */
function resolvePreviewFramePx(widthMm: number, heightMm: number, previewBaseMm: number): {
  frameW: number
  frameH: number
} {
  const frameW = Math.max(1, Math.round((widthMm / previewBaseMm) * PREVIEW_BASE_FRAME_PX))
  const frameH = Math.max(1, Math.round((heightMm / previewBaseMm) * PREVIEW_BASE_FRAME_PX))
  return { frameW, frameH }
}

/**
 * 将整图按预览同款几何参数渲染到虚框画布，天然得到真实裁剪结果。
 */
function renderPreviewFrameCrop(
  processed: ImageData,
  frameW: number,
  frameH: number,
  params: SealParams,
  offsetX: number,
  offsetY: number
): HTMLCanvasElement {
  const fullCanvas = document.createElement('canvas')
  fullCanvas.width = processed.width
  fullCanvas.height = processed.height
  fullCanvas.getContext('2d')!.putImageData(processed, 0, 0)

  const frameCanvas = document.createElement('canvas')
  frameCanvas.width = frameW
  frameCanvas.height = frameH
  const frameCtx = frameCanvas.getContext('2d')!
  frameCtx.clearRect(0, 0, frameW, frameH)

  const fitScale = Math.min(frameW / processed.width, frameH / processed.height)
  frameCtx.save()
  frameCtx.translate(frameW / 2 + offsetX, frameH / 2 + offsetY)
  frameCtx.rotate((params.rotation * Math.PI) / 180)
  frameCtx.scale(fitScale * (params.scale / 100), fitScale * (params.scale / 100))
  frameCtx.globalAlpha = params.opacity / 100
  frameCtx.drawImage(fullCanvas, -processed.width / 2, -processed.height / 2)
  frameCtx.restore()
  return frameCanvas
}

/**
 * 将虚框裁剪结果缩放输出到导出画布。
 */
function drawFrameToExportCanvas(
  frameCanvas: HTMLCanvasElement,
  outputW: number,
  outputH: number
): HTMLCanvasElement {
  const exportCanvas = document.createElement('canvas')
  exportCanvas.width = outputW
  exportCanvas.height = outputH
  const exportCtx = exportCanvas.getContext('2d')!
  exportCtx.clearRect(0, 0, outputW, outputH)
  exportCtx.drawImage(frameCanvas, 0, 0, outputW, outputH)
  return exportCanvas
}

// ===== Canvas 渲染流水线 =====
export async function renderSeal(
  params: SealParams,
  image: ImageState
): Promise<{ previewDataUrl: string; exportDataUrl: string }> {
  if (!image.dataUrl) throw new Error('No image data')

  // 1) 加载原图
  const rawImageData = await loadImageData(image.dataUrl)

  // 2) 先处理整图：去背景 + 颜色替换
  const targetColor = params.colorKey === 'original' ? null : params.colorHex
  const processed = processImage(rawImageData, { targetColorHex: targetColor })

  // 3) 计算预览虚框（与 UI 的绝对尺寸联动保持一致）
  const { frameW, frameH } = resolvePreviewFramePx(params.widthMm, params.heightMm, image.previewBaseMm)

  // 4) 在虚框画布内按与左侧预览一致的参数渲染，得到真实裁剪内容
  const frameCanvas = renderPreviewFrameCrop(
    processed,
    frameW,
    frameH,
    params,
    image.offsetX,
    image.offsetY
  )

  // 5) 计算输出画布尺寸（300dpi）
  const outputW = Math.round(params.widthMm * MM_TO_PX)
  const outputH = Math.round(params.heightMm * MM_TO_PX)

  // 6) 将虚框裁剪结果输出到导出画布
  const exportCanvas = drawFrameToExportCanvas(frameCanvas, outputW, outputH)

  // 7) 导出无水印 dataUrl
  const exportDataUrl = exportCanvas.toDataURL('image/png')

  // 8) 叠加水印 → 预览 dataUrl
  const previewDataUrl = addWatermark(exportCanvas, outputW, outputH)

  return { previewDataUrl, exportDataUrl }
}

// ===== 水印叠加 =====
function addWatermark(sourceCanvas: HTMLCanvasElement, w: number, h: number): string {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  // 复制源图
  ctx.drawImage(sourceCanvas, 0, 0)

  // 绘制平铺水印
  ctx.save()
  ctx.globalAlpha = 0.12
  ctx.fillStyle = '#000000'
  ctx.font = `bold ${Math.max(10, Math.round(w * 0.08))}px sans-serif`
  ctx.rotate((-30 * Math.PI) / 180)

  const text = '仅供展示使用参考'
  const textW = ctx.measureText(text).width + 20
  const stepX = textW
  const stepY = Math.max(24, Math.round(w * 0.12))

  for (let y = -h; y < h * 2; y += stepY) {
    for (let x = -w; x < w * 2; x += stepX) {
      ctx.fillText(text, x, y)
    }
  }
  ctx.restore()

  return canvas.toDataURL('image/png')
}

// ===== 主色识别（上传时调用）=====
export async function detectSealColor(dataUrl: string): Promise<string> {
  const imageData = await loadImageData(dataUrl)
  return detectMainColor(imageData)
}

// ===== 下载 PNG =====

/**
 * 从上传文件的 `File.name` 解析可用于下载的「主名」（去掉路径与最后一层扩展名）。
 * 非法或空结果返回 `null`，由调用方回退为 `seal_{类型}_{日期}.png`。
 *
 * @param originalFileName - 浏览器提供的原始文件名，可为空
 * @returns 清理后的主名；无法使用时为 `null`
 */
export function resolveDownloadBasename(originalFileName: string | null | undefined): string | null {
  if (originalFileName == null || typeof originalFileName !== 'string') return null
  const trimmed = originalFileName.trim()
  if (!trimmed) return null
  const segment = trimmed.replace(/^[\\/]+/, '').split(/[/\\]/).pop() ?? trimmed
  const withoutExt = segment.replace(/\.[^.]+$/, '').trim()
  if (!withoutExt) return null
  const cleaned = withoutExt.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').trim()
  return cleaned.length > 0 ? cleaned : null
}

/**
 * 触发浏览器下载透明底 PNG。
 * 命名：与上传文件主名一致、扩展名为 `.png`；无有效上传名时回退 `seal_{印章类型}_{yyyyMMdd}.png`。
 *
 * @param dataUrl - PNG 的 data URL
 * @param sealTypeLabel - 印章类型展示名，用于兜底文件名
 * @param originalFileName - 当前上传文件的 `name`，可选
 */
export function downloadPng(
  dataUrl: string,
  sealTypeLabel: string,
  originalFileName?: string | null
) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const basename = resolveDownloadBasename(originalFileName)
  const filename = basename != null ? `${basename}.png` : `seal_${sealTypeLabel}_${date}.png`
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
