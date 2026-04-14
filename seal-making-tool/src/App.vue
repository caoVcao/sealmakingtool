<template>
  <div class="page">
    <header class="page-header">
      <h1 class="page-title">图片制章</h1>
    </header>

    <main class="page-content">
      <!-- 上半区：上传预览（左）/ 印章效果（右）-->
      <section class="col-left">
        <div class="card upload-card">
          <UploadArea v-if="store.phase === 'initial'" @file-selected="onFileSelected" />
          <div v-else class="uploaded-block">
            <div class="uploaded-header">
              <p class="crop-tip-inline">请沿印章边缘裁剪，以确保电子印章和实际印章签署后的大小一致</p>
              <el-button size="small" plain :icon="RefreshLeft" @click="onReplaceImage">
                更换
              </el-button>
            </div>
            <ImagePreview
              :data-url="store.image.dataUrl!"
              :width-mm="store.params.widthMm"
              :height-mm="store.params.heightMm"
              :preview-base-mm="store.image.previewBaseMm"
              :offset-x="store.image.offsetX"
              :offset-y="store.image.offsetY"
              :rotation="store.params.rotation"
              :scale="store.params.scale"
              :opacity="store.params.opacity"
              @nudge="store.nudgeOffset"
            />
          </div>
        </div>
      </section>

      <section class="col-right">
        <div class="card effect-card">
          <SealEffect />
        </div>
      </section>
    </main>

    <!-- 下半区：印章设置 -->
    <section class="card combined-settings" :class="{ 'section-disabled': !store.isUploaded }">
      <div v-if="!store.isUploaded" class="disabled-overlay" />
      <div class="combined-settings-inner">
        <div class="settings-col">
          <SealSettings />
        </div>
        <div class="settings-divider" />
        <div class="settings-col">
          <OtherSettings />
        </div>
      </div>

      <div class="settings-actions">
        <el-button
          type="primary"
          :loading="store.isProcessing"
          :disabled="!store.isUploaded"
          @click="onGenerate"
        >
          查看印章效果
        </el-button>
        <el-button @click="onReset">重置</el-button>
        <el-button
          v-if="store.canExport"
          type="primary"
          class="save-btn"
          @click="onSave"
        >
          保存
        </el-button>
      </div>
    </section>

    <!-- 更换图片用隐藏 input -->
    <input
      ref="replaceInputRef"
      type="file"
      accept="image/jpeg,image/png"
      style="display:none"
      @change="onReplaceFileChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { RefreshLeft } from '@element-plus/icons-vue'
import { useSealStore } from './stores/sealStore'
import { renderSeal, detectSealColor, downloadPng } from './composables/useSealExport'
import UploadArea from './components/UploadArea.vue'
import ImagePreview from './components/ImagePreview.vue'
import SealSettings from './components/SealSettings.vue'
import OtherSettings from './components/OtherSettings.vue'
import SealEffect from './components/SealEffect.vue'

const store = useSealStore()
const replaceInputRef = ref<HTMLInputElement | null>(null)
const MAX_SIZE = 5 * 1024 * 1024

async function onFileSelected(file: File) {
  const dataUrl = await readFileAsDataUrl(file)
  store.setImageData(file, dataUrl)
  store.isProcessing = true
  try {
    const color = await detectSealColor(dataUrl)
    store.setDetectedColor(color)
  } catch {
    // 主色识别失败静默处理
  } finally {
    store.isProcessing = false
  }
}

function onReplaceImage() {
  replaceInputRef.value?.click()
}

async function onReplaceFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    ElMessage.error('仅支持 jpg/png 格式')
    return
  }
  if (file.size > MAX_SIZE) {
    ElMessage.error('文件大小不能超过 5MB')
    return
  }
  await onFileSelected(file)
}

async function onGenerate() {
  if (!store.isUploaded) return
  store.isProcessing = true
  try {
    const { previewDataUrl, exportDataUrl } = await renderSeal(store.params, store.image)
    store.setPreviewResult(previewDataUrl, exportDataUrl)
  } catch (err) {
    ElMessage.error('印章处理失败，请重试')
    console.error(err)
  } finally {
    store.isProcessing = false
  }
}

function onSave() {
  if (!store.exportDataUrl) return
  downloadPng(store.exportDataUrl, store.currentSealType.label, store.image.file?.name)
}

function onReset() {
  store.resetSettings()
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
</script>

<style scoped>
.page {
  background: var(--color-bg-app);
  padding: var(--spacing-page);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  align-items: center;
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.page-content {
  display: flex;
  gap: 20px;
  align-items: stretch; /* 两栏等高 */
}

.col-left,
.col-right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 左栏第一张卡（上传/预览）与右栏第一张卡（效果）互相撑高 */
.col-left .upload-card,
.col-right .effect-card {
  flex: 1;
}

.card {
  background: var(--color-bg-card);
  border-radius: var(--border-radius-card);
  box-shadow: var(--shadow-card);
  padding: var(--spacing-card);
}

.upload-card {
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.upload-card > :deep(.upload-area) {
  flex: 1;
  min-height: 200px;
}

.uploaded-block {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: var(--spacing-card);
}

.uploaded-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.crop-tip-inline {
  flex: 1;
  margin: 0;
  padding: 5px 10px;
  background: #fffbe6;
  border: 1px solid #ffe58f;
  border-radius: var(--border-radius-base);
  font-size: 12px;
  color: #874d00;
  line-height: 1.5;
}

.section-disabled {
  position: relative;
}

/* 合并印章设置卡（左：常规 / 右：微调）*/
.combined-settings {
  position: relative;
  padding-bottom: 56px;
}

.combined-settings-inner {
  display: flex;
  gap: 0;
}

.settings-col {
  flex: 1;
  min-width: 0;
  padding: 4px 8px;
}

.settings-divider {
  width: 1px;
  background: var(--color-border-light);
  margin: 8px 12px;
  flex-shrink: 0;
}

.settings-actions {
  position: absolute;
  right: var(--spacing-card);
  bottom: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.save-btn {
  min-width: 72px;
  font-weight: 600;
  font-size: 15px;
}
</style>
