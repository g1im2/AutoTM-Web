<template>
  <div class="page-template">
    <!-- 仅在有 actions 插槽时显示操作栏 -->
    <div class="page-actions" v-if="$slots.actions">
      <slot name="actions" />
    </div>

    <slot />
  </div>
</template>

<script setup lang="ts">
interface Props {
  title?: string
  description?: string
}

defineProps<Props>()
</script>

<style scoped>
.page-template {
  width: 100%;
  max-width: 1600px;
  margin: 0 auto;
  min-height: calc(100vh - 60px); /* 减去header高度 */
  display: flex;
  flex-direction: column;
  /* 统一使用 card-gap-lg 作为页面 padding 和卡片间距 */
  padding: var(--card-gap-lg);
  gap: var(--card-gap-lg);
}

.page-actions {
  display: flex;
  gap: var(--spacing-md);
  align-items: center;
  justify-content: flex-end;
  flex-shrink: 0;
}

/* 响应式断点优化 */
@media (max-width: 767px) {
  .page-template {
    padding: var(--card-gap-xs);
    gap: var(--card-gap-xs);
  }

  .page-actions {
    flex-wrap: wrap;
  }
}

@media (min-width: 768px) and (max-width: 1199px) {
  .page-template {
    padding: var(--card-gap-md);
    gap: var(--card-gap-md);
  }
}

@media (min-width: 1200px) and (max-width: 1599px) {
  .page-template {
    padding: var(--card-gap-lg);
    gap: var(--card-gap-lg);
  }
}

@media (min-width: 1600px) {
  .page-template {
    padding: var(--card-gap-xl);
    gap: var(--card-gap-xl);
  }
}
</style>
