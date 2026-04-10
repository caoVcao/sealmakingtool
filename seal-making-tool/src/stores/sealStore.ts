import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import type { AppPhase, ImageState, SealParams, SealColorOption, SealColorKey } from '../types/seal.types'
import {
  SEAL_TYPES,
  DEFAULT_PARAMS,
  PRESET_COLORS,
  DELTA_E_THRESHOLD,
  CUSTOM_SIZE_MIN,
  CUSTOM_SIZE_MAX,
} from '../constants/sealTypes'

export const useSealStore = defineStore('seal', () => {
  // ===== State =====
  const phase = ref<AppPhase>('initial')

  const image = reactive<ImageState>({
    file: null,
    dataUrl: null,
    detectedMainColor: null,
    offsetX: 0,
    offsetY: 0,
    previewBaseMm: 42,
  })

  const params = reactive<SealParams>({ ...DEFAULT_PARAMS })

  const previewDataUrl = ref<string | null>(null)  // 含水印，用于展示
  const exportDataUrl = ref<string | null>(null)   // 无水印，用于下载
  const isProcessing = ref(false)

  // ===== Getters =====
  const currentSealType = computed(() =>
    SEAL_TYPES.find(t => t.value === params.sealType) ?? SEAL_TYPES[0]
  )

  const isSizeEditable = computed(() => currentSealType.value.editable)

  const isUploaded = computed(() => phase.value !== 'initial')

  const canExport = computed(() => phase.value === 'previewed' && !!previewDataUrl.value)

  const colorOptions = computed<SealColorOption[]>(() => {
    const detectedHex = image.detectedMainColor
    const options: SealColorOption[] = [
      { key: 'red',   hex: PRESET_COLORS.red,   label: '红色', visible: true },
      { key: 'blue',  hex: PRESET_COLORS.blue,  label: '蓝色', visible: true },
      { key: 'black', hex: PRESET_COLORS.black, label: '黑色', visible: true },
    ]

    if (detectedHex) {
      const isSimilar = [PRESET_COLORS.red, PRESET_COLORS.blue, PRESET_COLORS.black]
        .some(presetHex => _deltaEVisible(detectedHex, presetHex))

      options.unshift({
        key: 'original',
        hex: detectedHex,
        label: '原色',
        visible: !isSimilar,
      })
    }

    return options
  })

  // ===== Actions =====
  /**
   * 设置新上传/更换后的图片数据，并清空预览；印章尺寸与其它制作参数恢复默认值。
   */
  function setImageData(file: File, dataUrl: string) {
    image.file = file
    image.dataUrl = dataUrl
    image.offsetX = 0
    image.offsetY = 0
    image.detectedMainColor = null
    Object.assign(params, DEFAULT_PARAMS)
    phase.value = 'uploaded'
    previewDataUrl.value = null
    exportDataUrl.value = null
  }

  function setDetectedColor(hex: string) {
    image.detectedMainColor = hex
    // 若当前颜色为原色但原色不可见，切换回红色
    if (params.colorKey === 'original') {
      const opt = colorOptions.value.find(c => c.key === 'original')
      if (!opt?.visible) {
        params.colorKey = 'red'
        params.colorHex = PRESET_COLORS.red
      } else {
        params.colorHex = hex
      }
    }
  }

  function updateSealType(value: string) {
    const found = SEAL_TYPES.find(t => t.value === value)
    if (!found) return
    params.sealType = value
    if (!found.editable) {
      params.widthMm = found.widthMm
      params.heightMm = found.heightMm
    }
    image.offsetX = 0
    image.offsetY = 0
    // 切换类型后重置预览
    previewDataUrl.value = null
    exportDataUrl.value = null
    if (phase.value === 'previewed') phase.value = 'uploaded'
  }

  function updateCustomSize(axis: 'width' | 'height', value: number) {
    if (!isSizeEditable.value) return
    const clamped = Math.min(CUSTOM_SIZE_MAX, Math.max(CUSTOM_SIZE_MIN, value))
    if (axis === 'width') params.widthMm = clamped
    else params.heightMm = clamped
  }

  function updateColor(key: SealColorKey) {
    const opt = colorOptions.value.find(c => c.key === key)
    if (!opt || !opt.visible) return
    params.colorKey = key
    params.colorHex = opt.hex
  }

  function nudgeOffset(axis: 'x' | 'y', delta: number) {
    if (axis === 'x') image.offsetX += delta
    else image.offsetY += delta
  }

  function setPreviewResult(preview: string, exportUrl: string) {
    previewDataUrl.value = preview
    exportDataUrl.value = exportUrl
    phase.value = 'previewed'
  }

  function resetSettings() {
    image.offsetX = 0
    image.offsetY = 0
    Object.assign(params, DEFAULT_PARAMS)
    isProcessing.value = false
  }

  // ===== 内部：ΔE 相似判断（简化版，用于显隐原色）=====
  function _deltaEVisible(hex1: string, hex2: string): boolean {
    const lab1 = _hexToLab(hex1)
    const lab2 = _hexToLab(hex2)
    const deltaE = Math.sqrt(
      Math.pow(lab1.l - lab2.l, 2) +
      Math.pow(lab1.a - lab2.a, 2) +
      Math.pow(lab1.b - lab2.b, 2)
    )
    return deltaE < DELTA_E_THRESHOLD
  }

  function _hexToLab(hex: string): { l: number; a: number; b: number } {
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255

    const toLinear = (v: number) => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
    const rl = toLinear(r), gl = toLinear(g), bl = toLinear(b)

    const x = (rl * 0.4124 + gl * 0.3576 + bl * 0.1805) / 0.95047
    const y = (rl * 0.2126 + gl * 0.7152 + bl * 0.0722) / 1.00000
    const z = (rl * 0.0193 + gl * 0.1192 + bl * 0.9505) / 1.08883

    const f = (v: number) => v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116
    return {
      l: 116 * f(y) - 16,
      a: 500 * (f(x) - f(y)),
      b: 200 * (f(y) - f(z)),
    }
  }

  return {
    phase,
    image,
    params,
    previewDataUrl,
    exportDataUrl,
    isProcessing,
    currentSealType,
    isSizeEditable,
    isUploaded,
    canExport,
    colorOptions,
    setImageData,
    setDetectedColor,
    updateSealType,
    updateCustomSize,
    updateColor,
    nudgeOffset,
    setPreviewResult,
    resetSettings,
  }
})
