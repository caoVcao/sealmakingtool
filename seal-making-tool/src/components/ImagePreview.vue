<template>
  <div class="preview-wrapper">
    <div class="preview-layout">
      <div class="preview-col">
        <div class="checkerboard-shell">
          <div
            class="checkerboard"
            :style="checkerboardStyle"
            @mousedown="onDragStart"
          >
            <div class="crop-frame" :style="cropFrameStyle">
              <img
                :src="dataUrl"
                class="preview-img"
                :style="imgStyle"
                draggable="false"
              />
            </div>
          </div>

          <div class="v-controls">
            <button class="nudge-btn" @mousedown="startNudge('y', -1)" @mouseup="stopNudge" @mouseleave="stopNudge">
              <el-icon><ArrowUp /></el-icon>
            </button>
            <span class="size-label v-label">高<br />{{ heightMm }}mm</span>
            <button class="nudge-btn" @mousedown="startNudge('y', 1)" @mouseup="stopNudge" @mouseleave="stopNudge">
              <el-icon><ArrowDown /></el-icon>
            </button>
          </div>

          <div class="h-controls">
            <button class="nudge-btn" @mousedown="startNudge('x', -1)" @mouseup="stopNudge" @mouseleave="stopNudge">
              <el-icon><ArrowLeft /></el-icon>
            </button>
            <span class="size-label">宽 {{ widthMm }}mm</span>
            <button class="nudge-btn" @mousedown="startNudge('x', 1)" @mouseup="stopNudge" @mouseleave="stopNudge">
              <el-icon><ArrowRight /></el-icon>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted } from 'vue'
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from '@element-plus/icons-vue'

const props = defineProps<{
  dataUrl: string
  widthMm: number
  heightMm: number
  previewBaseMm: number
  offsetX: number
  offsetY: number
  rotation: number
  scale: number
  opacity: number
}>()

const emit = defineEmits<{
  nudge: [axis: 'x' | 'y', delta: number]
}>()

/** 预览基准虚框像素（42mm 对应 320px）。 */
const BASE_FRAME_PX = 320
/** 棋盘格固定为 360，不随印章类型变化。 */
const CHECKERBOARD_SIZE = 360

const previewW = computed(() => {
  const scaled = (props.widthMm / props.previewBaseMm) * BASE_FRAME_PX
  return Math.max(1, Math.round(scaled))
})

const previewH = computed(() => {
  const scaled = (props.heightMm / props.previewBaseMm) * BASE_FRAME_PX
  return Math.max(1, Math.round(scaled))
})

const checkerboardStyle = computed(() => ({
  width: `${CHECKERBOARD_SIZE}px`,
  height: `${CHECKERBOARD_SIZE}px`,
  flexShrink: '0',
}))

const cropFrameStyle = computed(() => ({
  width: `${previewW.value}px`,
  height: `${previewH.value}px`,
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
}))

const imgStyle = computed(() => ({
  transform: `translate(${props.offsetX}px, ${props.offsetY}px) rotate(${props.rotation}deg) scale(${props.scale / 100})`,
  opacity: props.opacity / 100,
  transition: 'transform 0.1s, opacity 0.1s',
}))

let nudgeTimer: ReturnType<typeof setInterval> | null = null
let dragging = false
let dragLastX = 0
let dragLastY = 0

function startNudge(axis: 'x' | 'y', delta: number) {
  emit('nudge', axis, delta)
  nudgeTimer = setInterval(() => emit('nudge', axis, delta), 80)
}

function stopNudge() {
  if (nudgeTimer) { clearInterval(nudgeTimer); nudgeTimer = null }
}

/**
 * 在 checkerboard 内按下鼠标后启用拖拽，持续发送偏移增量。
 */
function onDragStart(e: MouseEvent) {
  if (e.button !== 0) return
  dragging = true
  dragLastX = e.clientX
  dragLastY = e.clientY
  window.addEventListener('mousemove', onDragging)
  window.addEventListener('mouseup', onDragEnd)
  e.preventDefault()
}

/**
 * 拖拽中按增量同步 offset，边界策略 A：不强制夹紧，允许空白。
 */
function onDragging(e: MouseEvent) {
  if (!dragging) return
  const dx = e.clientX - dragLastX
  const dy = e.clientY - dragLastY
  dragLastX = e.clientX
  dragLastY = e.clientY
  if (dx !== 0) emit('nudge', 'x', dx)
  if (dy !== 0) emit('nudge', 'y', dy)
}

/**
 * 结束鼠标拖拽并移除全局监听。
 */
function onDragEnd() {
  dragging = false
  window.removeEventListener('mousemove', onDragging)
  window.removeEventListener('mouseup', onDragEnd)
}

onUnmounted(() => {
  stopNudge()
  onDragEnd()
})
</script>

<style scoped>
.preview-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 外层：棋盘格列（左）+ 高度控制（右）*/
.preview-layout {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 392px;
}

.preview-col {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.checkerboard-shell {
  position: relative;
  display: inline-flex;
}

/* 棋盘格：固定尺寸由 JS 计算，position:relative 供虚框定位 */
.checkerboard {
  position: relative;
  background: var(--checkerboard-bg);
  border-radius: var(--border-radius-base);
  overflow: hidden;
  cursor: grab;
}

.checkerboard:active {
  cursor: grabbing;
}

.crop-frame {
  position: absolute;
  border: 1.5px dashed var(--color-primary);
  overflow: hidden;
  box-sizing: border-box;
}

.preview-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  user-select: none;
}

.h-controls {
  position: absolute;
  left: 50%;
  bottom: -34px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.v-controls {
  position: absolute;
  right: -40px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex-shrink: 0;
}

.nudge-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-base);
  background: var(--color-bg-card);
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: background 0.15s, border-color 0.15s;
  padding: 0;
}

.nudge-btn:hover {
  background: #e6f4ff;
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.nudge-btn:active {
  background: #bae0ff;
}

.size-label {
  font-size: 11px;
  color: var(--color-text-secondary);
  text-align: center;
  line-height: 1.5;
  white-space: nowrap;
}

.v-label {
  writing-mode: horizontal-tb;
}
</style>
