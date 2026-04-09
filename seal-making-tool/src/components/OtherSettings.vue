<template>
  <div class="other-settings">
    <h3 class="section-title">其他设置</h3>

    <SliderControl
      v-model="store.params.rotation"
      label="旋转角度"
      :min="-180"
      :max="180"
      unit="°"
      :disabled="!store.isUploaded"
    />

    <SliderControl
      v-model="store.params.scale"
      label="图片缩放"
      :min="10"
      :max="200"
      unit="%"
      :disabled="!store.isUploaded"
    />

    <SliderControl
      v-model="store.params.opacity"
      label="不透明度"
      :min="10"
      :max="100"
      unit="%"
      :disabled="!store.isUploaded"
    />
  </div>
</template>

<script setup lang="ts">
import { useSealStore } from '../stores/sealStore'
import SliderControl from './SliderControl.vue'

const store = useSealStore()
</script>

<style scoped>
.other-settings {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-item);
}

.section-title {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-secondary);
}
</style>
