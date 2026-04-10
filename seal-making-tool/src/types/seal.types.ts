// ===== 印章颜色 =====
export type SealColorKey = 'original' | 'red' | 'blue' | 'black'

export interface SealColorOption {
  key: SealColorKey
  hex: string        // 目标色值（原色时为识别到的主色 hex）
  label: string
  visible: boolean   // 原色与预设色相近时 false
}

// ===== 印章类型 =====
export interface SealTypeOption {
  value: string
  label: string
  widthMm: number
  heightMm: number
  editable: boolean  // 仅自定义印章为 true
}

// ===== 图像状态 =====
export interface ImageState {
  file: File | null
  dataUrl: string | null           // 原始图片 base64
  detectedMainColor: string | null // 识别到的印章主色 hex
  offsetX: number                  // 印章在定位框内 X 偏移（预览 px）
  offsetY: number                  // 印章在定位框内 Y 偏移（预览 px）
  previewBaseMm: number            // 预览基准 mm（用于虚框绝对尺寸联动）
}

// ===== 印章制作参数 =====
export interface SealParams {
  sealType: string      // 对应 SealTypeOption.value
  widthMm: number
  heightMm: number
  colorKey: SealColorKey
  colorHex: string      // 实际应用的颜色 hex
  rotation: number      // 度，范围 -180 ~ 180
  scale: number         // 百分比，范围 10 ~ 500
  opacity: number       // 百分比，范围 10 ~ 100
}

// ===== 应用阶段 =====
export type AppPhase = 'initial' | 'uploaded' | 'previewed'
