<template>
  <div class="seal-effect">
    <h3 class="section-title">印章效果</h3>

    <!-- 效果展示区 -->
    <div class="effect-container" style="position: relative;">
      <!-- 初始/已上传未预览：占位图 -->
      <div v-if="store.phase !== 'previewed'" class="placeholder">
        <img src="../assets/placeholder.svg" class="placeholder-img" alt="占位图" />
        <p class="placeholder-text">请点击按钮"查看印章效果"获取印章效果图</p>
      </div>

      <!-- 已预览：效果图 + 水印 -->
      <div v-else class="preview-result">
        <div class="result-img-wrap">
          <img :src="store.previewDataUrl!" class="result-img" alt="印章效果" />
          <!-- CSS 水印层 -->
          <div class="watermark-layer" aria-hidden="true">
            <span v-for="i in 12" :key="i" class="watermark-text">仅供展示使用参考</span>
          </div>
        </div>
        <p class="size-label">
          ●电子印章尺寸（{{ store.params.widthMm }}x{{ store.params.heightMm }}mm）●
        </p>
      </div>
      <p v-if="store.phase === 'previewed'" class="quality-tip">
        请确认印章清晰、边缘完整、无白边残留
      </p>
    </div>

  </div>
</template>

<script setup lang="ts">
import { useSealStore } from '../stores/sealStore'

const store = useSealStore()

</script>

<style scoped>
.seal-effect {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-item);
  height: 100%;
}

.section-title {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.effect-container {
  flex: 1;
  min-height: 200px;
  box-sizing: border-box;
  padding: 8px 8px 52px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-light);
  border-radius: var(--border-radius-card);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
}

/* 内侧底部居中提示 — 与 crop-tip-inline 风格一致 */
.quality-tip {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  margin: 0;
  padding: 5px 12px;
  background: #fffbe6;
  border: 1px solid #ffe58f;
  border-radius: 20px;
  font-size: 12px;
  color: #874d00;
  white-space: nowrap;
  pointer-events: none;
  z-index: 5;
  line-height: 1.5;
}

/* 占位 */
.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 32px;
  text-align: center;
}

.placeholder-img {
  width: 120px;
  height: auto;
  opacity: 0.5;
}

.placeholder-text {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-placeholder);
}

/* 效果图 */
.preview-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 16px;
  width: 100%;
}

.result-img-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-base);
  overflow: hidden;
  background: #fff;
}

.result-img {
  display: block;
  max-width: 320px;
  max-height: 320px;
  width: auto;
  height: auto;
}

/* 水印平铺层 */
.watermark-layer {
  position: absolute;
  inset: 0;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  overflow: hidden;
  pointer-events: none;
}

.watermark-text {
  flex: 0 0 auto;
  width: 50%;
  font-size: 11px;
  color: rgba(0, 0, 0, 0.10);
  transform: rotate(-30deg);
  white-space: nowrap;
  padding: 16px 8px;
  user-select: none;
}

.size-label {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-secondary);
  letter-spacing: 0.5px;
  position: relative;
  z-index: 6;
}

</style>
