<template>
  <div class="slider-control" :class="{ 'is-disabled': disabled }">
    <span class="ctrl-label">{{ label }}</span>
    <el-slider
      v-model="innerValue"
      :min="min"
      :max="max"
      :step="step"
      :disabled="disabled"
      class="ctrl-slider"
      :show-tooltip="false"
      @input="onSliderInput"
    />
    <div class="ctrl-number-group">
      <button class="step-btn" :disabled="disabled || innerValue <= min" @click="decrement">-</button>
      <el-input-number
        v-model="innerValue"
        :min="min"
        :max="max"
        :step="step"
        :disabled="disabled"
        :controls="false"
        class="ctrl-input"
        @change="onInputChange"
      />
      <button class="step-btn" :disabled="disabled || innerValue >= max" @click="increment">+</button>
    </div>
    <span class="ctrl-unit">{{ unit }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: number
  min: number
  max: number
  step?: number
  unit: string
  label: string
  disabled?: boolean
}>(), {
  step: 1,
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [val: number]
}>()

const innerValue = ref(props.modelValue)

watch(() => props.modelValue, (v) => { innerValue.value = v })

function clamp(v: number) {
  return Math.min(props.max, Math.max(props.min, v))
}

function onSliderInput(v: number) {
  innerValue.value = v
  emit('update:modelValue', v)
}

function onInputChange(v: number | undefined) {
  if (v === undefined) return
  const clamped = clamp(v)
  innerValue.value = clamped
  emit('update:modelValue', clamped)
}

function decrement() {
  const v = clamp(innerValue.value - props.step)
  innerValue.value = v
  emit('update:modelValue', v)
}

function increment() {
  const v = clamp(innerValue.value + props.step)
  innerValue.value = v
  emit('update:modelValue', v)
}
</script>

<style scoped>
.slider-control {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.slider-control.is-disabled {
  opacity: 0.5;
  pointer-events: none;
}

.ctrl-label {
  font-size: 14px;
  color: var(--color-text-secondary);
  white-space: nowrap;
  min-width: 60px;
}

.ctrl-slider {
  flex: 1;
  min-width: 80px;
}

.ctrl-number-group {
  display: flex;
  align-items: center;
  gap: 2px;
}

.ctrl-input {
  width: 64px;
}

/* 覆盖 el-input-number 内部边距 */
.ctrl-input :deep(.el-input__wrapper) {
  padding: 0 6px;
}

.step-btn {
  width: 24px;
  height: 28px;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-base);
  background: var(--color-bg-card);
  color: var(--color-text-secondary);
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
  padding: 0;
  line-height: 1;
}

.step-btn:hover:not(:disabled) {
  background: #e6f4ff;
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.step-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.ctrl-unit {
  font-size: 12px;
  color: var(--color-text-secondary);
  min-width: 16px;
}
</style>
