# TECHNICAL_DESIGN.md — 电子印章制作工具 · 技术设计文档

> **文档状态**：✅ 已冻结（待 Dev 按 Task 执行）
> **版本**：v1.3
> **日期**：2026-04-09（同步 PLAN.md v1.3：命名更新 + 鼠标拖拽 + 一致性修复）
> **架构师**：Arch Agent
> **依赖文档**：PLAN.md v1.3

---

## 1. 技术栈确认 (Tech Stack)

| 层级 | 技术选型 | 版本要求 | 备注 |
|---|---|---|---|
| 框架 | Vue 3 (Composition API) | ^3.4 | 严格 Composition API，禁用 Options API |
| 语言 | TypeScript | ^5.0 | strict 模式开启 |
| UI 组件库 | Element Plus | ^2.7 | 遵循 UI_DESIGN_SPEC.md 主题 |
| 状态管理 | Pinia | ^2.1 | 单一 Store |
| 图像处理 | HTML5 Canvas API | 原生 | 无第三方图像库 |
| 构建工具 | Vite | ^5.0 | — |
| 包管理 | pnpm | ^9.0 | — |

---

## 2. 目录结构 (Project Structure)

```
seal-making-tool/
├── public/
│   └── placeholder.svg           # 初始占位插画
├── src/
│   ├── assets/
│   │   └── styles/
│   │       └── global.css        # 全局样式变量（对齐 UI_DESIGN_SPEC）
│   ├── components/
│   │   ├── UploadArea.vue        # Task-03：上传拖拽区域
│   │   ├── ImagePreview.vue      # Task-04：图片预览+定位框+微调
│   │   ├── SealSettings.vue      # Task-05：印章类型/尺寸/颜色设置
│   │   ├── SliderControl.vue     # Task-06：通用滑块控件（复用）
│   │   ├── OtherSettings.vue     # Task-07：旋转/缩放/不透明度
│   │   └── SealEffect.vue        # Task-09：印章效果展示区
│   ├── composables/
│   │   ├── useImageProcessor.ts  # Task-08：去背景/颜色替换/主色识别
│   │   └── useSealExport.ts      # Task-11：72dpi Canvas 渲染与 PNG 导出
│   ├── stores/
│   │   └── sealStore.ts          # Task-02：Pinia 全局状态
│   ├── types/
│   │   └── seal.types.ts         # Task-02：TypeScript 接口定义
│   ├── constants/
│   │   └── sealTypes.ts          # Task-02：印章类型常量表
│   ├── App.vue                   # Task-10：主布局+禁用态管控
│   └── main.ts                   # Task-01：应用入口
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 3. 数据模型与接口契约 (Data Models & Interface Contracts)

### 3.1 TypeScript 核心类型 (`src/types/seal.types.ts`)

```typescript
// 印章颜色枚举
export type SealColorKey = 'original' | 'red' | 'blue' | 'black'

export interface SealColorOption {
  key: SealColorKey
  hex: string         // 目标色值（原色时为识别到的主色 hex）
  label: string
  visible: boolean    // 原色与预设色相近时 false
}

// 印章类型定义
export interface SealTypeOption {
  value: string       // 选项 key
  label: string       // 下拉展示文案
  widthMm: number     // 宽度 mm
  heightMm: number    // 高度 mm
  editable: boolean   // 是否允许修改尺寸
}

// 图像状态
export interface ImageState {
  file: File | null
  dataUrl: string | null          // 原始图片 base64（用于 Canvas 绘制）
  detectedMainColor: string | null // 识别到的印章主色 hex
  offsetX: number                 // 图片相对虚框 X 偏移（单位：预览px）
  offsetY: number                 // 图片相对虚框 Y 偏移（单位：预览px）
  previewBaseMm: number           // 预览基准 mm（建议 42，用于虚框绝对尺寸缩放）
}

// 印章制作参数
export interface SealParams {
  sealType: string       // 对应 SealTypeOption.value
  widthMm: number
  heightMm: number
  colorKey: SealColorKey
  colorHex: string       // 实际应用的颜色 hex
  rotation: number       // 度，范围 -180 ~ 180
  scale: number          // 百分比，范围 10 ~ 200
  opacity: number        // 百分比，范围 10 ~ 100
}

// 全局应用阶段
export type AppPhase = 'initial' | 'uploaded' | 'previewed'

// Store 根状态
export interface SealState {
  phase: AppPhase
  image: ImageState
  params: SealParams
  previewDataUrl: string | null   // 效果图（含水印）base64
  exportDataUrl: string | null    // 导出图（无水印）base64
}
```

### 3.2 印章类型常量表 (`src/constants/sealTypes.ts`)

```typescript
export const SEAL_TYPES: SealTypeOption[] = [
  { value: 'enterprise',  label: '企事业单位公章',   widthMm: 42, heightMm: 42, editable: false },
  { value: 'department',  label: '机构部门章',       widthMm: 40, heightMm: 40, editable: false },
  { value: 'finance',     label: '财务专用章',       widthMm: 30, heightMm: 30, editable: false },
  { value: 'contract',    label: '合同专用章',       widthMm: 40, heightMm: 40, editable: false },
  { value: 'invoice',     label: '发票专用章',       widthMm: 40, heightMm: 30, editable: false },
  { value: 'legalPerson', label: '法人章',              widthMm: 20, heightMm: 20, editable: false },
  { value: 'branch',      label: '分支机构公章',     widthMm: 45, heightMm: 30, editable: false },
  { value: 'custom',      label: '自定义印章',       widthMm: 42, heightMm: 42, editable: true  },
]

// 自定义印章尺寸范围
export const CUSTOM_SIZE_MIN = 30
export const CUSTOM_SIZE_MAX = 45

// 默认参数
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

// 颜色预设（原色条目由 Store 动态管理）
export const PRESET_COLORS = {
  red:   '#E60000',
  blue:  '#0050B3',
  black: '#262626',
}

// 输出尺寸换算（PNG 导出按 300dpi：1mm = 300/25.4 ≈ 11.811px）
export const MM_TO_PX = 300 / 25.4  // ≈ 11.811 px/mm（300dpi）

// 各标准印章输出像素尺寸速查（300dpi）：
//   42mm → 497px  | 40mm → 472px  | 30mm → 354px
//   45mm → 531px  | 20mm → 236px
```

---

## 4. 状态管理设计 (`src/stores/sealStore.ts`)

```typescript
// Pinia Store 接口契约（伪代码级）
const useSealStore = defineStore('seal', () => {

  // State
  const phase = ref<AppPhase>('initial')
  const image = reactive<ImageState>({...})
  const params = reactive<SealParams>({...DEFAULT_PARAMS})
  const previewDataUrl = ref<string | null>(null)
  const exportDataUrl = ref<string | null>(null)

  // Getters
  const currentSealType = computed(...)       // 当前选中的 SealTypeOption
  const isSizeEditable = computed(...)        // 是否允许编辑尺寸
  const colorOptions = computed(...)          // 动态颜色列表（含原色显隐逻辑）
  const isUploaded = computed(...)            // phase !== 'initial'
  const canExport = computed(...)             // phase === 'previewed'

  // Actions
  function handleUpload(file: File): Promise<void>  // 上传处理+主色识别
  function updateSealType(value: string): void       // 类型变更+尺寸联动
  function updateColor(key: SealColorKey): void
  function nudgeOffset(axis: 'x'|'y', delta: number): void  // 微调偏移（图片相对虚框）
  function generatePreview(): Promise<void>           // 触发 Canvas 渲染
  function reset(): void                              // 重置全部状态

  return { phase, image, params, previewDataUrl, exportDataUrl,
           currentSealType, isSizeEditable, colorOptions, isUploaded, canExport,
           handleUpload, updateSealType, updateColor, nudgeOffset, generatePreview, reset }
})
```

---

## 5. 核心 Composable 设计

### 5.1 `useImageProcessor.ts` — 图像处理引擎

**职责**：纯函数集合，接收 ImageData 输入，输出处理后的 ImageData，不持有状态。

```typescript
// 接口定义
interface ProcessorOptions {
  targetColorHex: string | null  // null = 原色模式，不替换颜色
  bgThreshold: number            // 白底消除亮度阈值，建议 240
  featherRadius: number          // 羽化半径，建议 1
}

// 核心函数签名
function removeBackground(imageData: ImageData, threshold: number): ImageData
function replaceColor(imageData: ImageData, targetHex: string): ImageData
function detectMainColor(imageData: ImageData): string  // 返回 hex
function calculateDeltaE(hex1: string, hex2: string): number  // CIELAB ΔE
function processImage(imageData: ImageData, options: ProcessorOptions): ImageData
```

**算法规格**：

| 步骤 | 算法 | 参数 |
|---|---|---|
| 白底消除 | 像素 RGB → 亮度 = 0.299R+0.587G+0.114B；亮度 > threshold 且饱和度 < 30 时置 alpha=0 | threshold=240 |
| 边缘羽化 | 对 alpha 在 0~255 边界区间的像素按距离线性衰减 | radius=1px |
| 颜色替换 | RGB → HSL；替换 H 为目标色 H，保留 S·0.9、L 线性映射 | — |
| 主色识别 | 非透明像素 RGB → HSL 分桶（36桶×10°），取最高频 bucket 中位色相 → 转 hex | — |
| ΔE 计算 | RGB → XYZ → Lab → ΔE76 公式 | 相似阈值=20 |

### 5.2 `useSealExport.ts` — Canvas 渲染与导出

**职责**：协调 ImageProcessor，驱动离屏 Canvas 渲染，生成预览 dataUrl 和导出 dataUrl。

```typescript
// 渲染流水线（伪代码）
async function render(params: SealParams, image: ImageState): Promise<{
  previewDataUrl: string   // 含水印，用于展示
  exportDataUrl: string    // 无水印，用于下载
}>

// 内部步骤：
// 1. 计算预览虚框像素尺寸（绝对 mm 联动，不是仅宽高比）
// 2. 将虚框（含 offsetX/Y）映射回原图坐标系，得到 cropRect（sx, sy, sw, sh）
// 3. 对原图执行真实裁剪，得到 cropCanvas
// 4. 调用 processImage（去背景 + 颜色替换）
// 5. 创建导出 Canvas（宽高按 300dpi 换算：1mm ≈ 11.811px）
// 6. 在导出 Canvas 上应用 scale / rotation / opacity
// 7. exportDataUrl = exportCanvas.toDataURL('image/png')
// 8. 在 exportCanvas 基础上叠加水印 → previewDataUrl
```

**关键契约（新增）**：

```typescript
interface CropRect {
  sx: number  // source x in original image pixels
  sy: number  // source y in original image pixels
  sw: number  // source width
  sh: number  // source height
}

function resolvePreviewFramePx(widthMm: number, heightMm: number, previewBaseMm: number): {
  frameW: number
  frameH: number
}

function mapPreviewFrameToSourceRect(
  imageNaturalWidth: number,
  imageNaturalHeight: number,
  frameW: number,
  frameH: number,
  offsetX: number,
  offsetY: number
): CropRect
```

**水印规格**：
- 文字：`仅供展示使用参考`
- 样式：`font: bold 16px sans-serif`，颜色 `rgba(0,0,0,0.12)`，旋转 -30°
- 平铺覆盖整个 Canvas 区域（间距 80px）

**导出文件命名**：
```typescript
function generateFileName(sealTypeLabel: string): string {
  const date = new Date().toISOString().slice(0,10).replace(/-/g, '')
  return `seal_${sealTypeLabel}_${date}.png`
}
```

---

## 6. 组件接口契约 (Component API Contracts)

### 6.1 `UploadArea.vue`
```typescript
// Emits
emits: {
  'file-selected': (file: File) => void
}
// Props: 无（upload 触发 store action）
// 内部：el-upload 的 before-upload 做格式/大小校验
// 拖拽：监听 dragover/drop 事件，手动触发 file-selected
```

### 6.2 `ImagePreview.vue`
```typescript
// Props
props: {
  dataUrl: string           // 原始图片 base64
  widthMm: number           // 虚框宽度（mm，绝对尺寸联动）
  heightMm: number          // 虚框高度（mm，绝对尺寸联动）
  previewBaseMm: number     // 预览基准 mm（建议 42）
  offsetX: number
  offsetY: number
}
// Emits
emits: {
  'nudge': (axis: 'x'|'y', delta: number) => void
}
// 内部逻辑：
// - 虚线框尺寸 = (widthMm / previewBaseMm) * BASE_FRAME_PX（绝对尺寸联动）
// - 当 42x42 切换 20x20 时，虚框宽高缩小为原先约 47.6%
// - 微调按钮：▲▼（Y轴）、◄►（X轴），step=1px
// - 支持鼠标拖拽图片（仅桌面端），与微调共享 offsetX/offsetY
// - 拖拽交互限定在 checkerboard 范围内；边界策略 A（允许出现空白）
// - 图片相对虚框使用 CSS transform: translate(offsetX, offsetY)
```

### 6.3 `SealSettings.vue`
```typescript
// 无 props，直接读写 sealStore
// 内部：
// - el-select 印章类型，变更时调用 store.updateSealType()
// - 宽高 el-input-number（disabled 态由 isSizeEditable 控制）
// - 颜色块：v-for store.colorOptions，仅渲染 visible=true 项
// - 颜色块选中态：border: 2px solid #1890FF + checkmark icon
```

### 6.4 `SliderControl.vue`（复用组件）
```typescript
// Props
props: {
  modelValue: number
  min: number
  max: number
  step?: number      // 默认 1
  unit: string       // '°' | '%'
  label: string
  disabled?: boolean
}
// Emits
emits: {
  'update:modelValue': (val: number) => void
}
// 布局：label | el-slider | el-input-number | [-] [+] | unit
// [-][+] 按钮 step=1，到达边界时 disabled
```

### 6.5 `OtherSettings.vue`
```typescript
// 无 props，读写 sealStore.params
// 包含三个 SliderControl：
//   旋转角度：min=-180, max=180, unit='°'
//   图片缩放：min=10,  max=200, unit='%'
//   不透明度：min=10,  max=100, unit='%'
// disabled = !store.isUploaded
```

### 6.6 `SealEffect.vue`
```typescript
// 无 props，读 sealStore
// 内部三态：
//   phase='initial'/'uploaded'  → 占位图 + 提示文案
//   phase='previewed'           → 显示 previewDataUrl + 尺寸标注
// 按钮区：
//   "查看印章效果"：disabled = !isUploaded，点击 store.generatePreview()
//   "重置"：始终可点击，调用 store.reset()
//   "保存"：v-if = canExport，调用 useSealExport().download()
// 尺寸标注文案：●电子印章尺寸（{widthMm}x{heightMm}mm）●
```

---

## 7. 页面布局架构 (`App.vue`)

```
┌─────────────────────────────────────────────────────────┐
│  页面标题：图片制章                                        │
│  背景色：#F0F2F5  padding: 24px                          │
├──────────────────────────┬──────────────────────────────┤
│  左栏（flex-basis 50%）    │  右栏（flex-basis 50%）        │
│                           │                              │
│  ┌─────────────────────┐  │  ┌────────────────────────┐ │
│  │   UploadArea        │  │  │   SealEffect           │ │
│  │   (上传态/预览态)    │  │  │   (占位/效果图)         │ │
│  ├─────────────────────┤  │  ├────────────────────────┤ │
│  │   ImagePreview      │  │  │   OtherSettings        │ │
│  │   (上传后显示)      │  │  │   (旋转/缩放/不透明度)  │ │
│  ├─────────────────────┤  │  └────────────────────────┘ │
│  │   SealSettings      │  │                              │
│  │   (类型/尺寸/颜色)  │  │                              │
│  └─────────────────────┘  │                              │
└──────────────────────────┴──────────────────────────────┘
```

**禁用态管控策略**：
- `phase === 'initial'` 时，`ImagePreview`、`SealSettings`、`OtherSettings` 整体用 `pointer-events: none` + 半透明蒙层（`opacity: 0.5` + `position: absolute` 覆盖层）禁用
- 仅 `UploadArea` 保持正常可交互状态
- `SealEffect` 中"查看印章效果"按钮用 Element Plus `:disabled="!isUploaded"` 控制

---

## 8. Canvas 渲染关键参数

```typescript
// 坐标系说明
// 预览：仅用于交互与视觉反馈，不代表导出分辨率
// 导出：按 300dpi 生成 PNG
const MM_TO_PX = 300 / 25.4  // ≈ 11.811 px/mm

// 以企事业单位公章（42mm）为例：
// 导出 Canvas 尺寸 = 42 * 11.811 ≈ 497 × 497 px
// 常用换算（300dpi）：
//   40mm ≈ 472px | 30mm ≈ 354px | 45mm ≈ 531px | 20mm ≈ 236px
// 旋转中心 = (canvasWidth/2, canvasHeight/2)
// 缩放：ctx.scale(params.scale/100, params.scale/100) 在旋转后应用
// 不透明度：ctx.globalAlpha = params.opacity / 100

// 真实裁剪映射：
// 1) 先将预览虚框（含 offset）映射到原图 source rect（sx,sy,sw,sh）
// 2) 再把 source rect 渲染到导出 Canvas（目标物理尺寸）
```

---

## 9. 任务拆分 (Task Breakdown)

> Dev 必须按 Task 编号顺序执行，每个 Task 完成后交 QA 审查再进入下一 Task。

| Task | 标题 | 核心交付物 | 依赖 |
|---|---|---|---|
| Task-01 | 项目脚手架搭建 | Vite+Vue3+TS+Element Plus+Pinia 初始化；全局 CSS 变量 | — |
| Task-02 | 数据模型与常量 | `seal.types.ts` / `sealTypes.ts` / `sealStore.ts` 骨架 | Task-01 |
| Task-03 | 上传区组件 | `UploadArea.vue`：点击+拖拽，格式/大小校验，上传提示文案 | Task-02 |
| Task-04 | 图片预览组件 | `ImagePreview.vue`：棋盘格背景，虚线框绝对尺寸联动，提示文字，▲▼◄►微调，宽高标注 | Task-02 |
| Task-05 | 印章设置组件 | `SealSettings.vue`：类型下拉+尺寸联动+颜色选择块（含禁用态） | Task-02 |
| Task-06 | 通用滑块控件 | `SliderControl.vue`：滑块+输入框+[-][+]按钮，支持 disabled | Task-01 |
| Task-07 | 其他设置组件 | `OtherSettings.vue`：旋转/缩放/不透明度，使用 SliderControl | Task-06 |
| Task-08 | 图像处理引擎 | `useImageProcessor.ts`：去背景、颜色替换、主色识别、ΔE计算 | Task-02 |
| Task-09 | 印章效果组件 | `SealEffect.vue`：三态渲染、水印预览、尺寸标注、按钮区 | Task-02 |
| Task-10 | 主布局与状态管控 | `App.vue`：左右两栏布局，初始禁用蒙层，phase 流转驱动 | Task-03~09 |
| Task-11 | 真实裁剪与导出逻辑 | `useSealExport.ts`：虚框映射原图裁剪、300dpi PNG 导出、文件命名 | Task-08 |
| Task-12 | 裁剪映射契约落地 | `sealStore.ts` + `types`：预览基准参数、映射参数传递、边界裁剪容错 | Task-04+11 |
| Task-13 | 集成联调与边界修复 | 完整流程联调：上传→设置→预览→裁剪→导出→重置；边界值校验修复 | Task-10+11+12 |
| Task-14 | 法人章命名与枚举变更 | `sealTypes.ts`/文案/文件命名链路统一，“personal”迁移为 `legalPerson` | Task-02 |
| Task-15 | 预览拖拽交互实现 | `ImagePreview.vue`：鼠标按下拖拽更新 offset，限定 checkerboard 交互范围 | Task-04 |
| Task-16 | 左右一致性修正 | `useSealExport.ts`：修正虚框到原图映射偏差，保证与左侧最终视图一致 | Task-11+15 |

---

## 10. 风险技术决策备忘

| 决策点 | 选择 | 原因 |
|---|---|---|
| 颜色替换算法 | HSL 色相替换，保留 S×0.9 和线性 L | 保留印章原有明暗纹理，不变成纯色块 |
| 白底消除阈值 | 固定 240，不暴露给用户 | 本期限制白纸上传，固定阈值覆盖90%场景；留扩展口 |
| 原色识别时机 | 上传后立即识别（`handleUpload` 内异步执行） | 尽早知道原色，驱动颜色选项显隐 |
| OffscreenCanvas 兼容性 | 降级到普通 Canvas（Safari 兼容） | OffscreenCanvas Safari 支持有限，用 `document.createElement('canvas')` |
| 预览区缩放比 | 固定预览尺寸 300px（最长边），计算 previewScale | 预览是屏幕显示，不遵循 72dpi；与实际 Canvas 输出解耦，保证预览速度 |
| 虚框尺寸语义 | 绝对 mm 联动（引入 previewBaseMm） | 满足 42→20 视觉缩小反馈，避免“类型切换无变化”误解 |
| 裁剪策略 | 以虚框映射原图后做真实裁剪 | 与“沿边缘裁剪”文案一致，消除语义偏差 |
| 20mm 类型命名 | 统一为“法人章”，内部枚举值 `legalPerson` | 业务语义更准确，避免“个人章”歧义 |
| 交互方式 | 支持鼠标拖拽，不支持触摸拖拽（本期） | 满足高频桌面操作，控制迭代范围 |
| 拖拽边界 | A：允许出现空白 | 保持自由定位能力，适配复杂印模 |
| 输出 Canvas 尺寸 | 严格使用 MM_TO_PX≈11.811（300dpi） | 与 PM 冻结结论一致，保障输出清晰度与物理尺寸 |
| 水印叠加方式 | 两个独立 Canvas（导出Canvas + 水印Canvas合并） | 确保导出无水印 |

---

*由 Arch Agent 生成 · 2026-04-09*
