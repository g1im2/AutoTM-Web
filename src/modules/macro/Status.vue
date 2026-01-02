<template>
  <PageTemplate>

    <!-- 经济周期概览 -->
    <div class="cycle-overview">
      <ChartCard title="经济周期概览" height="400px" show-refresh @refresh="refreshCycleData">
        <GaugeChart 
          :value="cyclePosition" 
          :loading="cycleLoading"
          title="当前周期位置"
          unit=""
          :stages="cycleStages"
        />
      </ChartCard>
    </div>

    <!-- 关键指标 -->
    <div class="indicators-grid">
      <KpiCard 
        v-for="indicator in keyIndicators" 
        :key="indicator.name"
        :title="indicator.name"
        :value="indicator.value"
        :subtitle="indicator.description"
        :trend="indicator.trend"
        :type="indicator.type"
        :format="indicator.format"
      />
    </div>

    <!-- 宏观趋势图表 -->
    <div class="charts-grid">
      <ChartCard title="GDP增长趋势" height="350px" show-refresh @refresh="refreshGdpData">
        <TrendChart 
          :data="gdpData" 
          :loading="gdpLoading"
          color="#10b981"
        />
      </ChartCard>

      <ChartCard title="通胀率走势" height="350px" show-refresh @refresh="refreshInflationData">
        <TrendChart 
          :data="inflationData" 
          :loading="inflationLoading"
          color="#f59e0b"
        />
      </ChartCard>

      <ChartCard title="利率环境" height="350px" show-refresh @refresh="refreshRateData">
        <TrendChart 
          :data="rateData" 
          :loading="rateLoading"
          color="#3b82f6"
        />
      </ChartCard>

      <ChartCard title="就业指标" height="350px" show-refresh @refresh="refreshEmploymentData">
        <TrendChart 
          :data="employmentData" 
          :loading="employmentLoading"
          color="#8b5cf6"
        />
      </ChartCard>
    </div>
  </PageTemplate>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import PageTemplate from '../../components/PageTemplate.vue'
import ChartCard from '../../components/ChartCard.vue'
import KpiCard from '../../components/KpiCard.vue'
import TrendChart from '../../components/charts/TrendChart.vue'
import GaugeChart from '../../components/charts/GaugeChart.vue'
import { macroApi } from '../../api/clients'

// 周期数据
const cyclePosition = ref(45)
const cycleLoading = ref(false)
const cycleStages = [
  { min: 0, max: 25, color: '#10b981', label: '复苏期' },
  { min: 25, max: 50, color: '#3b82f6', label: '繁荣期' },
  { min: 50, max: 75, color: '#f59e0b', label: '衰退期' },
  { min: 75, max: 100, color: '#ef4444', label: '萧条期' }
]

// 关键指标
const keyIndicators = ref([
  { name: 'GDP增长率', value: 6.8, description: '同比增长', trend: 2.1, type: 'success' as const, format: 'percentage' as const },
  { name: 'CPI', value: 2.3, description: '消费者价格指数', trend: -0.5, type: 'warning' as const, format: 'percentage' as const },
  { name: '失业率', value: 5.2, description: '城镇调查失业率', trend: -0.3, type: 'success' as const, format: 'percentage' as const },
  { name: '基准利率', value: 3.75, description: '央行基准利率', trend: 0, type: 'default' as const, format: 'percentage' as const },
  { name: 'PMI', value: 52.1, description: '制造业采购经理指数', trend: 1.2, type: 'success' as const, format: 'number' as const },
  { name: '汇率', value: 7.23, description: 'USD/CNY', trend: -0.8, type: 'warning' as const, format: 'number' as const }
])

// 图表数据
const gdpData = ref<Array<{ date: string; value: number }>>([])
const gdpLoading = ref(false)

const inflationData = ref<Array<{ date: string; value: number }>>([])
const inflationLoading = ref(false)

const rateData = ref<Array<{ date: string; value: number }>>([])
const rateLoading = ref(false)

const employmentData = ref<Array<{ date: string; value: number }>>([])
const employmentLoading = ref(false)

// 数据刷新函数
async function refreshCycleData() {
  cycleLoading.value = true
  try {
    const { data } = await macroApi.get('/api/v1/macro/cycle/position')
    cyclePosition.value = data?.data?.position ?? Math.random() * 100
  } catch (e) {
    cyclePosition.value = Math.random() * 100
  } finally {
    cycleLoading.value = false
  }
}

async function refreshGdpData() {
  gdpLoading.value = true
  try {
    await macroApi.get('/api/v1/macro/indicators', { params: { keys: 'gdp' } })
    gdpData.value = generateMockData(12, 5, 8)
  } catch (e) {
    gdpData.value = generateMockData(12, 5, 8)
  } finally {
    gdpLoading.value = false
  }
}

async function refreshInflationData() {
  inflationLoading.value = true
  try {
    await macroApi.get('/api/v1/macro/indicators', { params: { keys: 'inflation' } })
    inflationData.value = generateMockData(12, 1, 4)
  } catch (e) {
    inflationData.value = generateMockData(12, 1, 4)
  } finally {
    inflationLoading.value = false
  }
}

async function refreshRateData() {
  rateLoading.value = true
  try {
    await macroApi.get('/api/v1/macro/indicators', { params: { keys: 'rates' } })
    rateData.value = generateMockData(12, 2, 5)
  } catch (e) {
    rateData.value = generateMockData(12, 2, 5)
  } finally {
    rateLoading.value = false
  }
}

async function refreshEmploymentData() {
  employmentLoading.value = true
  try {
    await macroApi.get('/api/v1/macro/indicators', { params: { keys: 'employment' } })
    employmentData.value = generateMockData(12, 4, 7)
  } catch (e) {
    employmentData.value = generateMockData(12, 4, 7)
  } finally {
    employmentLoading.value = false
  }
}

function generateMockData(months: number, min: number, max: number): Array<{ date: string; value: number }> {
  const data = []
  const now = new Date()
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    data.push({
      date: date.toISOString().split('T')[0]!,
      value: Math.random() * (max - min) + min
    })
  }
  return data
}

onMounted(async () => {
  await Promise.all([
    refreshCycleData(),
    refreshGdpData(),
    refreshInflationData(),
    refreshRateData(),
    refreshEmploymentData()
  ])
})
</script>

<style scoped>
/* 移除所有 margin-bottom，由 PageTemplate 的 gap 统一控制 */
.indicators-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--card-gap-lg);
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: var(--card-gap-lg);
}

/* 响应式优化 */
@media (max-width: 767px) {
  .indicators-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--card-gap-xs);
  }

  .charts-grid {
    grid-template-columns: 1fr;
    gap: var(--card-gap-xs);
  }
}

@media (min-width: 768px) and (max-width: 1199px) {
  .indicators-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: var(--card-gap-md);
  }

  .charts-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--card-gap-md);
  }
}

@media (min-width: 1200px) and (max-width: 1599px) {
  .indicators-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: var(--card-gap-lg);
  }

  .charts-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--card-gap-lg);
  }
}

@media (min-width: 1600px) {
  .indicators-grid {
    gap: var(--card-gap-xl);
  }

  .charts-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: var(--card-gap-xl);
  }
}
</style>
