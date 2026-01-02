<template>
  <div class="macro-indicators-strip">
    <div v-if="loading" class="loading-state">
      <el-icon class="is-loading"><Loading /></el-icon>
    </div>
    <div v-else class="indicators-grid">
      <div v-for="indicator in displayIndicators" :key="indicator.key" class="indicator-card">
        <div class="indicator-header">
          <span class="indicator-name">{{ indicator.name }}</span>
          <el-tag v-if="indicator.change !== undefined" :type="getChangeType(indicator.change)" size="small">
            {{ indicator.change >= 0 ? '+' : '' }}{{ indicator.change.toFixed(2) }}
          </el-tag>
        </div>
        <div class="indicator-value">
          {{ indicator.value }}{{ indicator.unit }}
        </div>
        <div v-if="indicator.trend && indicator.trend.length > 0" class="indicator-trend">
          <Sparkline :data="indicator.trend" :color="getTrendColor(indicator.change)" height="30px" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useMacroStore } from '../../../stores/macro'
import Sparkline from '../../../components/charts/Sparkline.vue'
import { Loading } from '@element-plus/icons-vue'

const macroStore = useMacroStore()
const { indicators, loading: storeLoading } = storeToRefs(macroStore)

const loading = computed(() => storeLoading.value.indicators)

const displayIndicators = computed(() => {
  // 优先显示关键指标
  const keyIndicators = ['GDP', 'CPI', 'PMI', 'RATE']
  const result = []
  
  for (const key of keyIndicators) {
    const ind = indicators.value.find(i => i.key === key)
    if (ind) {
      result.push(ind)
    }
  }
  
  // 如果不足4个，补充其他指标
  if (result.length < 4) {
    const others = indicators.value.filter(i => !keyIndicators.includes(i.key))
    result.push(...others.slice(0, 4 - result.length))
  }
  
  return result.slice(0, 4)
})

function getChangeType(change: number) {
  if (change > 0) return 'success'
  if (change < 0) return 'danger'
  return 'info'
}

function getTrendColor(change?: number) {
  if (!change) return '#3b82f6'
  return change >= 0 ? '#10b981' : '#ef4444'
}

onMounted(async () => {
  await macroStore.fetchIndicators('GDP,CPI,PMI,RATE')
})
</script>

<style scoped>
.macro-indicators-strip {
  width: 100%;
  padding: 0;
  margin: 0;
}

.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px;
  color: var(--text-secondary);
}

.indicators-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--card-gap-lg);
}

.indicator-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  background-color: var(--surface-bg);
  border-radius: 8px;
  border: 1px solid var(--border-color);
  transition: all 0.2s ease;
  min-height: 90px;
}

.indicator-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
  border-color: var(--finance-blue);
}

.indicator-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.indicator-name {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}

.indicator-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

.indicator-trend {
  margin-top: 4px;
}

.is-loading {
  animation: rotating 2s linear infinite;
}

@keyframes rotating {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .indicators-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--card-gap-xs);
  }

  .indicator-card {
    min-height: 80px;
    padding: 10px;
  }

  .indicator-value {
    font-size: 18px;
  }
}

@media (min-width: 769px) and (max-width: 1200px) {
  .indicators-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
  }
}
</style>

