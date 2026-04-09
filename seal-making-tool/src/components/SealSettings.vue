<template>
  <div class="seal-settings">
    <h3 class="section-title">印章尺寸设置</h3>

    <!-- 印章类型 -->
    <div class="form-row">
      <label class="form-label">印章类型</label>
      <el-select
        v-model="store.params.sealType"
        class="type-select"
        @change="store.updateSealType"
      >
        <el-option
          v-for="t in SEAL_TYPES"
          :key="t.value"
          :label="t.label"
          :value="t.value"
        />
      </el-select>
    </div>

    <!-- 尺寸 -->
    <div class="form-row size-row">
      <div class="size-field">
        <label class="form-label">印章宽度</label>
        <el-input-number
          v-model="store.params.widthMm"
          :min="sizeMin"
          :max="sizeMax"
          :disabled="!store.isSizeEditable"
          :controls="false"
          class="size-input"
          @change="(v: number) => store.updateCustomSize('width', v)"
        />
        <span class="unit">mm</span>
      </div>
      <div class="size-field">
        <label class="form-label">印章高度</label>
        <el-input-number
          v-model="store.params.heightMm"
          :min="sizeMin"
          :max="sizeMax"
          :disabled="!store.isSizeEditable"
          :controls="false"
          class="size-input"
          @change="(v: number) => store.updateCustomSize('height', v)"
        />
        <span class="unit">mm</span>
      </div>
    </div>

    <!-- 自定义尺寸提示 -->
    <p v-if="store.isSizeEditable" class="custom-tip">
      自定义尺寸范围：{{ CUSTOM_SIZE_MIN }} ~ {{ CUSTOM_SIZE_MAX }} mm
    </p>

    <!-- 印章颜色 -->
    <div class="form-row color-row">
      <label class="form-label">印章颜色</label>
      <div class="color-options">
        <button
          v-for="opt in visibleColors"
          :key="opt.key"
          class="color-btn"
          :class="{ 'is-selected': store.params.colorKey === opt.key }"
          :style="{ backgroundColor: opt.hex }"
          :title="opt.label"
          @click="store.updateColor(opt.key)"
        >
          <el-icon v-if="store.params.colorKey === opt.key" class="check-icon">
            <Check />
          </el-icon>
          <span v-if="opt.key === 'original'" class="original-tag">原色</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Check } from '@element-plus/icons-vue'
import { useSealStore } from '../stores/sealStore'
import { SEAL_TYPES, CUSTOM_SIZE_MIN, CUSTOM_SIZE_MAX } from '../constants/sealTypes'

const store = useSealStore()

const sizeMin = computed(() => store.isSizeEditable ? CUSTOM_SIZE_MIN : 1)
const sizeMax = computed(() => store.isSizeEditable ? CUSTOM_SIZE_MAX : 999)

const visibleColors = computed(() => store.colorOptions.filter(c => c.visible))
</script>

<style scoped>
.seal-settings {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-item);
}

.section-title {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.form-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
}

.form-label {
  font-size: 14px;
  color: var(--color-text-secondary);
  white-space: nowrap;
  min-width: 60px;
}

.type-select {
  flex: 1;
  min-width: 200px;
}

.size-row {
  gap: 16px;
}

.size-field {
  display: flex;
  align-items: center;
  gap: 6px;
}

.size-input {
  width: 90px;
}

.unit {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.custom-tip {
  margin: 0;
  font-size: 12px;
  color: var(--color-primary);
  padding-left: 64px;
}

.color-row {
  align-items: center;
}

.color-options {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.color-btn {
  position: relative;
  width: 48px;
  height: 28px;
  border-radius: var(--border-radius-base);
  border: 2px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.15s, transform 0.1s;
  outline: none;
  overflow: hidden;
}

.color-btn:hover {
  transform: scale(1.05);
  border-color: rgba(255, 255, 255, 0.6);
}

.color-btn.is-selected {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 1px var(--color-primary);
}

.check-icon {
  color: #fff;
  font-size: 14px;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));
}

.original-tag {
  position: absolute;
  bottom: 1px;
  right: 2px;
  font-size: 9px;
  color: rgba(255,255,255,0.9);
  text-shadow: 0 1px 2px rgba(0,0,0,0.6);
  line-height: 1;
}
</style>
