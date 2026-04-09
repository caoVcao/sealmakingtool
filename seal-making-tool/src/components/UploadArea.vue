<template>
  <div
    class="upload-area"
    :class="{ 'is-dragover': isDragOver }"
    @dragover.prevent="isDragOver = true"
    @dragleave.prevent="isDragOver = false"
    @drop.prevent="onDrop"
    @click="triggerFileInput"
  >
    <input
      ref="fileInputRef"
      type="file"
      accept="image/jpeg,image/png"
      class="hidden-input"
      @change="onFileChange"
    />

    <div class="upload-content">
      <el-icon class="upload-icon"><Plus /></el-icon>
      <p class="upload-title">上传印章图片</p>
      <ul class="upload-tips">
        <li>请在白纸上盖章后，通过扫描或拍照上传印模，确保印章清晰完整且无多余边角</li>
        <li>支持 jpg/png 格式，建议大小 5M 以内</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'

const emit = defineEmits<{
  'file-selected': [file: File]
}>()

const fileInputRef = ref<HTMLInputElement | null>(null)
const isDragOver = ref(false)

const MAX_SIZE_BYTES = 5 * 1024 * 1024  // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png']

function triggerFileInput() {
  fileInputRef.value?.click()
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) validate(file)
  // 重置 input 允许重复选同一文件
  input.value = ''
}

function onDrop(e: DragEvent) {
  isDragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) validate(file)
}

function validate(file: File) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    ElMessage.error('仅支持 jpg/png 格式，请重新选择')
    return
  }
  if (file.size > MAX_SIZE_BYTES) {
    ElMessage.error('文件大小不能超过 5MB，请重新选择')
    return
  }
  emit('file-selected', file)
}
</script>

<style scoped>
.upload-area {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 200px;
  border: 2px dashed var(--color-border);
  border-radius: var(--border-radius-card);
  background: var(--color-bg-card);
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  user-select: none;
}

.upload-area:hover,
.upload-area.is-dragover {
  border-color: var(--color-primary);
  background: #e6f4ff;
}

.hidden-input {
  display: none;
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px;
  text-align: center;
}

.upload-icon {
  font-size: 32px;
  color: var(--color-text-placeholder);
}

.upload-title {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.upload-tips {
  margin: 4px 0 0;
  padding: 0 0 0 16px;
  list-style: disc;
  text-align: left;
  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 1.8;
}
</style>
