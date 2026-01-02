<template>
  <el-card class="chart-card" :class="{ 'chart-card--full-height': fullHeight }">
    <template #header>
      <div class="card-header">
        <span class="card-title">{{ title }}</span>
        <div class="card-actions">
          <el-button
            v-if="showRefresh"
            size="small"
            :icon="Refresh"
            @click="emit('refresh')"
            type="text"
            class="refresh-btn"
          />
        </div>
      </div>
    </template>
    <div class="chart-content" :style="{ height: computedHeight }">
      <div class="chart-wrapper">
        <slot />
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Refresh } from '@element-plus/icons-vue'

interface Props {
  title: string
  height?: string
  showRefresh?: boolean
  fullHeight?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  height: '300px',
  showRefresh: false,
  fullHeight: false
})

const computedHeight = computed(() => {
  if (props.fullHeight) {
    return 'auto'
  }
  return props.height
})

const emit = defineEmits<{
  (e: 'refresh'): void
}>()
</script>

<style scoped>
.chart-card {
  height: 100%;
  display: flex !important;
  flex-direction: column !important;
  transition: var(--transition-normal);
}

/* 确保 el-card 内部结构正确 - 减小 padding 使布局更紧凑 */
.chart-card :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: var(--spacing-md);
}

.chart-card :deep(.el-card__header) {
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--border-color);
}

.chart-card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-1px);
}

.chart-card--full-height {
  height: auto;
  min-height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0;
}

.card-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.4;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.refresh-btn {
  color: var(--text-secondary);
  padding: var(--spacing-xs);
}

.refresh-btn:hover {
  color: var(--finance-blue);
  background-color: var(--surface-bg);
}

.chart-content {
  width: 100%;
  flex: 1;
  display: flex !important;
  flex-direction: column !important;
  position: relative;
  overflow: hidden;
  min-height: 0; /* 防止 flex 子项溢出 */
}

.chart-wrapper {
  width: 100%;
  height: 100%;
  display: flex !important;
  flex-direction: column !important;
  align-items: stretch;
  justify-content: flex-start;
  position: relative;
  min-height: 0; /* 防止 flex 子项溢出 */
}

/* 确保图表内容居中（表格不强制 100% 高度，避免错位） */
.chart-wrapper > * {
  width: 100%;
}
.chart-wrapper > :not(.el-table) {
  height: 100%;
}

/* 表格在卡片中的特殊处理 */
.chart-content:has(.el-table) {
  padding: 0;
  overflow: auto; /* 允许表格产生滚动，避免 fixed 列/内容溢出 */
  -webkit-overflow-scrolling: touch;
}

.chart-content:has(.el-table) .chart-wrapper {
  align-items: stretch !important;
  justify-content: flex-start !important;
}

/* 确保表格容器正确布局 */
.chart-wrapper .el-table {
  flex: 1 1 auto;
  min-height: 0;
  height: auto;
}

/* 确保图表容器正确布局 */
.chart-wrapper .chart-container,
.chart-wrapper .chart {
  width: 100% !important;
  height: 100% !important;
  flex: 1;
  min-height: 0;
}

/* 响应式优化 */
@media (max-width: 768px) {
  .card-title {
    font-size: var(--text-base);
  }

  .refresh-btn {
    padding: var(--spacing-xs);
  }

  /* 移动端表格优化 */
  .chart-content:has(.el-table) {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .chart-wrapper .el-table {
    min-width: 600px; /* 确保表格有最小宽度 */
  }

  /* 移动端图表优化 */
  .chart-wrapper .chart-container,
  .chart-wrapper .chart {
    min-height: 250px; /* 移动端最小高度 */
  }
}

/* 平板端优化 */
@media (min-width: 769px) and (max-width: 1024px) {
  .chart-wrapper .el-table {
    font-size: var(--text-sm);
  }
}
</style>

