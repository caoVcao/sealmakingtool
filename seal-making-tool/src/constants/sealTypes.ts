import type { SealTypeOption, SealParams } from '../types/seal.types'

// ===== 印章类型表（依据 esignRules.md / DB11/T 918—2021）=====
export const SEAL_TYPES: SealTypeOption[] = [
  { value: 'enterprise', label: '企事业单位公章',   widthMm: 42, heightMm: 42, editable: false },
  { value: 'department', label: '机构部门章',       widthMm: 40, heightMm: 40, editable: false },
  { value: 'finance',    label: '财务专用章',       widthMm: 30, heightMm: 30, editable: false },
  { value: 'contract',   label: '合同专用章',       widthMm: 40, heightMm: 40, editable: false },
  { value: 'invoice',    label: '发票专用章',       widthMm: 40, heightMm: 30, editable: false },
  { value: 'legalPerson', label: '法人章',             widthMm: 20, heightMm: 20, editable: false },
  { value: 'branch',     label: '分支机构公章',     widthMm: 45, heightMm: 30, editable: false },
  { value: 'custom',     label: '自定义印章',       widthMm: 42, heightMm: 42, editable: true  },
]

// ===== 自定义印章尺寸范围（mm）=====
export const CUSTOM_SIZE_MIN = 30
export const CUSTOM_SIZE_MAX = 45

// ===== 颜色预设 =====
export const PRESET_COLORS = {
  red:   '#E60000',
  blue:  '#0050B3',
  black: '#262626',
} as const

// ===== 颜色相似度阈值（CIELAB ΔE）=====
export const DELTA_E_THRESHOLD = 20

// ===== 尺寸换算 =====
// 导出 PNG 要求 ≥300dpi（PLAN.md Q1），1mm = 300/25.4 ≈ 11.811px
// esignRules.md 的 72dpi 换算仅用于 PDF 嵌入时的尺寸参考，不适用于独立 PNG 导出
export const MM_TO_PX = 300 / 25.4  // ≈ 11.811 px/mm（300dpi）
// 各标准印章输出像素速查（300dpi）：
//   42mm → 497px | 40mm → 472px | 30mm → 354px | 45mm → 531px | 20mm → 236px

// ===== 默认制作参数 =====
export const DEFAULT_PARAMS: SealParams = {
  sealType: 'enterprise',
  widthMm: 42,
  heightMm: 42,
  colorKey: 'red',
  colorHex: '#E60000',
  rotation: 0,
  scale: 100,
  opacity: 80,
}

// ===== 去背景亮度阈值 =====
export const BG_THRESHOLD = 240

// ===== 边缘羽化半径（px）=====
export const FEATHER_RADIUS = 1
