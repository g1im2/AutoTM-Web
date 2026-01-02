<template>
  <el-card class="kpi-card" :class="{ 'kpi-card--danger': isDanger, 'kpi-card--warning': isWarning }">
    <template #header>
      <div class="kpi-header">
        <span class="kpi-title">{{ title }}</span>
        <el-icon v-if="icon" class="kpi-icon" :class="iconClass">
          <component :is="icon" />
        </el-icon>
      </div>
    </template>
    <div class="kpi-content">
      <div class="kpi-value" :class="valueClass">{{ formattedValue }}</div>
      <div v-if="subtitle" class="kpi-subtitle">{{ subtitle }}</div>
      <div v-if="trend !== undefined" class="kpi-trend" :class="trendClass">
        <el-icon>
          <ArrowUp v-if="trend > 0" />
          <ArrowDown v-if="trend < 0" />
          <Minus v-if="trend === 0" />
        </el-icon>
        <span>{{ Math.abs(trend) }}%</span>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ArrowUp, ArrowDown, Minus } from '@element-plus/icons-vue'

interface Props {
  title: string
  value: string | number
  subtitle?: string
  trend?: number
  icon?: any
  type?: 'default' | 'success' | 'warning' | 'danger'
  format?: 'number' | 'currency' | 'percentage'
}

const props = withDefaults(defineProps<Props>(), {
  type: 'default',
  format: 'number'
})

const formattedValue = computed(() => {
  if (typeof props.value === 'string') return props.value

  switch (props.format) {
    case 'currency':
      return new Intl.NumberFormat('zh-CN', {
        style: 'currency',
        currency: 'CNY'
      }).format(props.value)
    case 'percentage':
      return `${props.value}%`
    case 'number':
    default:
      return typeof props.value === 'number'
        ? new Intl.NumberFormat('zh-CN').format(props.value)
        : props.value
  }
})

const isDanger = computed(() => props.type === 'danger')
const isWarning = computed(() => props.type === 'warning')

const valueClass = computed(() => ({
  'kpi-value--success': props.type === 'success',
  'kpi-value--warning': props.type === 'warning',
  'kpi-value--danger': props.type === 'danger'
}))

const iconClass = computed(() => ({
  'kpi-icon--success': props.type === 'success',
  'kpi-icon--warning': props.type === 'warning',
  'kpi-icon--danger': props.type === 'danger'
}))

const trendClass = computed(() => ({
  'trend-up': props.trend && props.trend > 0,
  'trend-down': props.trend && props.trend < 0,
  'trend-neutral': props.trend === 0
}))
</script>

<style scoped>
/* 统一为 Dashboard 标准样式 */
.kpi-card {
  min-height: 110px;
  transition: all 0.2s ease;
}

.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.kpi-card :deep(.el-card__header) {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
}

.kpi-card :deep(.el-card__body) {
  padding: 12px 16px;
}

.kpi-card--warning {
  border-left: 4px solid var(--warning-color);
}

.kpi-card--danger {
  border-left: 4px solid var(--danger-color);
}

.kpi-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0;
}

.kpi-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin-bottom: 0;
}

.kpi-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

.kpi-icon {
  font-size: 16px;
  color: var(--text-muted);
  transition: var(--transition-fast);
}

.kpi-icon--success {
  color: var(--success-color);
}

.kpi-icon--warning {
  color: var(--warning-color);
}

.kpi-icon--danger {
  color: var(--danger-color);
}

.kpi-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}

.kpi-value--success {
  color: var(--success-color);
}

.kpi-value--warning {
  color: var(--warning-color);
}

.kpi-value--danger {
  color: var(--danger-color);
}

.kpi-subtitle {
  font-size: 12px;
  color: var(--text-secondary);
}

.kpi-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
}

.trend-up {
  color: var(--success-color);
}

.trend-down {
  color: var(--danger-color);
}

.trend-neutral {
  color: var(--text-muted);
}

/* 响应式优化 */
@media (max-width: 768px) {
  .kpi-card {
    min-height: 110px;
  }

  .kpi-value {
    font-size: 24px;
  }
}
</style>

