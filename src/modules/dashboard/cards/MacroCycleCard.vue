<template>
  <ChartCard title="宏观经济周期" height="350px" show-refresh @refresh="handleRefresh">
    <div class="cycle-container">
      <GaugeChart 
        :value="cycleValue" 
        :loading="loading"
        title="当前周期位置"
        unit=""
        :stages="cycleStages"
      />
      <div class="cycle-info">
        <div class="info-item">
          <span class="label">周期阶段</span>
          <span class="value" :class="`phase-${phaseName}`">{{ phaseLabel }}</span>
        </div>
        <div class="info-item">
          <span class="label">中期趋势</span>
          <span class="value" :class="`trend-${trendName}`">
            <el-icon v-if="trendName === 'UP'"><CaretTop /></el-icon>
            <el-icon v-else-if="trendName === 'DOWN'"><CaretBottom /></el-icon>
            <el-icon v-else><Minus /></el-icon>
            {{ trendLabel }}
          </span>
        </div>
        <div v-if="confidence" class="info-item">
          <span class="label">置信度</span>
          <span class="value">{{ (confidence * 100).toFixed(0) }}%</span>
        </div>
      </div>
    </div>
  </ChartCard>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import ChartCard from '../../../components/ChartCard.vue'
import GaugeChart from '../../../components/charts/GaugeChart.vue'
import { useMacroStore } from '../../../stores/macro'
import { CaretTop, CaretBottom, Minus } from '@element-plus/icons-vue'

const macroStore = useMacroStore()
const { cyclePosition, loading: storeLoading } = storeToRefs(macroStore)

const loading = computed(() => storeLoading.value.cycle)

const cycleValue = computed(() => cyclePosition.value?.position ?? 50)
const phaseName = computed(() => cyclePosition.value?.phase ?? 'EXPANSION')
const trendName = computed(() => cyclePosition.value?.trend ?? 'FLAT')
const confidence = computed(() => cyclePosition.value?.confidence)

const phaseLabel = computed(() => {
  const map: Record<string, string> = {
    RECOVERY: '复苏期',
    EXPANSION: '繁荣期',
    SLOWDOWN: '衰退期',
    RECESSION: '萧条期'
  }
  return cyclePosition.value?.phaseName ?? map[phaseName.value] ?? '未知'
})

const trendLabel = computed(() => {
  const map: Record<string, string> = {
    UP: '上行',
    DOWN: '下行',
    FLAT: '震荡'
  }
  return map[trendName.value] ?? '未知'
})

const cycleStages = [
  { min: 0, max: 25, color: '#10b981', label: '复苏期' },
  { min: 25, max: 50, color: '#3b82f6', label: '繁荣期' },
  { min: 50, max: 75, color: '#f59e0b', label: '衰退期' },
  { min: 75, max: 100, color: '#ef4444', label: '萧条期' }
]

async function handleRefresh() {
  await macroStore.fetchCyclePosition(true)
}

onMounted(async () => {
  await macroStore.fetchCyclePosition()
})
</script>

<style scoped>
.cycle-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-lg);
  height: 100%;
  padding: var(--spacing-md);
}

.cycle-info {
  display: flex;
  gap: var(--spacing-xl);
  flex-wrap: wrap;
  justify-content: center;
  width: 100%;
}

.info-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
  min-width: 100px;
}

.info-item .label {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  font-weight: 500;
}

.info-item .value {
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.phase-RECOVERY {
  color: #10b981;
}

.phase-EXPANSION {
  color: #3b82f6;
}

.phase-SLOWDOWN {
  color: #f59e0b;
}

.phase-RECESSION {
  color: #ef4444;
}

.trend-UP {
  color: var(--success-color);
}

.trend-DOWN {
  color: var(--danger-color);
}

.trend-FLAT {
  color: var(--text-muted);
}

@media (max-width: 768px) {
  .cycle-info {
    gap: var(--spacing-md);
  }
  
  .info-item {
    min-width: 80px;
  }
  
  .info-item .value {
    font-size: var(--text-base);
  }
}
</style>

