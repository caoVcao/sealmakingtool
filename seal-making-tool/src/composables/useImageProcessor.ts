import { BG_THRESHOLD, FEATHER_RADIUS, DELTA_E_THRESHOLD } from '../constants/sealTypes'

// ===== 类型 =====
interface ProcessorOptions {
  targetColorHex: string | null  // null = 原色模式，不替换颜色
  bgThreshold?: number
  featherRadius?: number
}

interface LabColor {
  l: number
  a: number
  b: number
}

// ===== 主入口 =====
export function processImage(
  imageData: ImageData,
  options: ProcessorOptions
): ImageData {
  const { targetColorHex, bgThreshold = BG_THRESHOLD, featherRadius = FEATHER_RADIUS } = options

  let data = removeBackground(imageData, bgThreshold)
  if (featherRadius > 0) data = featherEdges(data, featherRadius)
  if (targetColorHex !== null) data = replaceColor(data, targetColorHex)
  return data
}

// ===== 1. 白底消除 =====
export function removeBackground(imageData: ImageData, threshold = BG_THRESHOLD): ImageData {
  const output = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  )
  const d = output.data

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2]
    const brightness = 0.299 * r + 0.587 * g + 0.114 * b
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const saturation = max === 0 ? 0 : (max - min) / max * 255

    if (brightness > threshold && saturation < 30) {
      d[i + 3] = 0  // 透明
    }
  }
  return output
}

// ===== 2. 边缘羽化 =====
function featherEdges(imageData: ImageData, radius: number): ImageData {
  const { width, height, data } = imageData
  const output = new ImageData(new Uint8ClampedArray(data), width, height)
  const od = output.data

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      if (od[idx + 3] === 0) continue  // 已透明，跳过

      // 检查周围 radius 范围内是否有透明像素
      let minDist = radius + 1
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx, ny = y + dy
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
            minDist = 0
            break
          }
          const ni = (ny * width + nx) * 4
          if (data[ni + 3] === 0) {
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < minDist) minDist = dist
          }
        }
        if (minDist === 0) break
      }

      if (minDist <= radius) {
        od[idx + 3] = Math.round((minDist / radius) * od[idx + 3])
      }
    }
  }
  return output
}

// ===== 3. 颜色替换（HSL 色相替换，保留纹理）=====
export function replaceColor(imageData: ImageData, targetHex: string): ImageData {
  const output = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  )
  const d = output.data
  const { h: targetH } = hexToHsl(targetHex)

  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue  // 透明像素跳过

    const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255
    const { h: _srcH, s, l } = rgbToHsl(r, g, b)

    // 目标色相 + 保留原饱和度×0.9 + 保留明度
    const newS = Math.min(1, s * 0.9 + 0.1)
    const newL = l
    const [nr, ng, nb] = hslToRgb(targetH, newS, newL)

    d[i] = Math.round(nr * 255)
    d[i + 1] = Math.round(ng * 255)
    d[i + 2] = Math.round(nb * 255)
  }
  return output
}

// ===== 4. 主色识别 =====
export function detectMainColor(imageData: ImageData): string {
  const { data } = imageData
  const BUCKETS = 36  // 每桶 10°
  const hueBuckets = new Array<number>(BUCKETS).fill(0)
  const hueColors: number[][] = Array.from({ length: BUCKETS }, () => [])

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue  // 跳过透明/半透明

    const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255
    const { h, s, l } = rgbToHsl(r, g, b)

    // 只统计有饱和度的彩色像素（排除灰白黑）
    if (s < 0.2 || l < 0.1 || l > 0.9) continue

    const bucket = Math.floor(h * BUCKETS) % BUCKETS
    hueBuckets[bucket]++
    hueColors[bucket].push(h)
  }

  // 找频率最高的桶
  let maxBucket = 0
  let maxCount = 0
  for (let i = 0; i < BUCKETS; i++) {
    if (hueBuckets[i] > maxCount) {
      maxCount = hueBuckets[i]
      maxBucket = i
    }
  }

  if (maxCount === 0) return '#E60000'  // 降级为红色

  // 取该桶色相中位值
  const hues = hueColors[maxBucket].sort((a, b) => a - b)
  const medianH = hues[Math.floor(hues.length / 2)]

  // 转换为饱和度高、明度中等的代表色
  const [r, g, b] = hslToRgb(medianH, 0.85, 0.45)
  return rgbToHex(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255))
}

// ===== 5. ΔE 色差计算（CIELAB ΔE76）=====
export function calculateDeltaE(hex1: string, hex2: string): number {
  const lab1 = hexToLab(hex1)
  const lab2 = hexToLab(hex2)
  return Math.sqrt(
    Math.pow(lab1.l - lab2.l, 2) +
    Math.pow(lab1.a - lab2.a, 2) +
    Math.pow(lab1.b - lab2.b, 2)
  )
}

export function isColorSimilar(hex1: string, hex2: string): boolean {
  return calculateDeltaE(hex1, hex2) < DELTA_E_THRESHOLD
}

// ===== 色彩空间工具函数 =====
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }

  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return { h, s, l }
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) return [l, l, l]
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const hue2rgb = (t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  return [hue2rgb(h + 1 / 3), hue2rgb(h), hue2rgb(h - 1 / 3)]
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return rgbToHsl(r, g, b)
}

function hexToLab(hex: string): LabColor {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const toLinear = (v: number) => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  const rl = toLinear(r), gl = toLinear(g), bl = toLinear(b)

  const x = (rl * 0.4124 + gl * 0.3576 + bl * 0.1805) / 0.95047
  const y = (rl * 0.2126 + gl * 0.7152 + bl * 0.0722) / 1.00000
  const z = (rl * 0.0193 + gl * 0.1192 + bl * 0.9505) / 1.08883

  const f = (v: number) => v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116
  return { l: 116 * f(y) - 16, a: 500 * (f(x) - f(y)), b: 200 * (f(y) - f(z)) }
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase()
}

// ===== 工具：图片 URL → ImageData =====
export function loadImageData(dataUrl: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      resolve(ctx.getImageData(0, 0, canvas.width, canvas.height))
    }
    img.onerror = reject
    img.src = dataUrl
  })
}
