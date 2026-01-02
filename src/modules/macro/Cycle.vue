<template>
  <PageTemplate>
    <!-- 当前周期位置 -->
    <ChartCard title="当前经济周期位置" height="400px" show-refresh @refresh="refreshCycleData">
      <GaugeChart
        :value="currentPosition"
        :loading="cycleLoading"
        title="周期位置"
        unit=""
        :stages="cycleStages"
      />
    </ChartCard>

    <!-- 周期历史 -->
    <ChartCard title="经济周期历史" height="400px" show-refresh @refresh="refreshHistoryData">
      <TrendChart
        :data="historyData"
        :loading="historyLoading"
        color="#3b82f6"
        title="周期指数"
      />
    </ChartCard>

    <!-- 周期指标 -->
    <ChartCard title="周期关键指标">
      <div class="table-wrapper">
        <el-table :data="paginatedIndicators" style="width: 100%" stripe border>
          <el-table-column prop="name" label="指标名称" :min-width="200" show-overflow-tooltip header-align="center" />
          <el-table-column prop="current" label="当前值" :min-width="120" align="right" header-align="center" />
          <el-table-column prop="trend" label="趋势" :min-width="100" align="center" header-align="center">
            <template #default="{ row }">
              <el-tag :type="getTrendType(row.trend)">{{ row.trend }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="signal" label="信号强度" :min-width="180" align="center" header-align="center">
            <template #default="{ row }">
              <el-progress
                :percentage="row.signal"
                :color="getSignalColor(row.signal)"
                :show-text="false"
                style="width: 100px"
              />
              <span style="margin-left: 8px">{{ row.signal }}%</span>
            </template>
          </el-table-column>
        </el-table>

        <el-pagination
          v-if="cycleIndicators.length > 10"
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="cycleIndicators.length"
          layout="total, sizes, prev, pager, next, jumper"
          class="pagination"
        />
      </div>
    </ChartCard>
  </PageTemplate>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import PageTemplate from '../../components/PageTemplate.vue'
import ChartCard from '../../components/ChartCard.vue'
import TrendChart from '../../components/charts/TrendChart.vue'
import GaugeChart from '../../components/charts/GaugeChart.vue'
import { macroApi } from '../../api/clients'

const currentPosition = ref(45)
const cycleLoading = ref(false)
const historyData = ref<Array<{ date: string; value: number }>>([])
const historyLoading = ref(false)

const cycleStages = [
  { min: 0, max: 25, color: '#10b981', label: '复苏期' },
  { min: 25, max: 50, color: '#3b82f6', label: '繁荣期' },
  { min: 50, max: 75, color: '#f59e0b', label: '衰退期' },
  { min: 75, max: 100, color: '#ef4444', label: '萧条期' }
]

// 分页相关
const currentPage = ref(1)
const pageSize = ref(10)

const cycleIndicators = ref([
  { name: '领先指标', current: '102.3', trend: '上升', signal: 75 },
  { name: '同步指标', current: '98.7', trend: '稳定', signal: 60 },
  { name: '滞后指标', current: '95.2', trend: '下降', signal: 40 },
  { name: '消费者信心', current: '108.5', trend: '上升', signal: 80 },
  { name: '制造业PMI', current: '52.1', trend: '上升', signal: 70 },
  { name: '服务业PMI', current: '54.3', trend: '稳定', signal: 65 }
])

// 分页数据
const paginatedIndicators = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return cycleIndicators.value.slice(start, end)
})

function getTrendType(trend: string) {
  switch (trend) {
    case '上升': return 'success'
    case '下降': return 'danger'
    case '稳定': return 'info'
    default: return 'default'
  }
}

function getSignalColor(signal: number) {
  if (signal >= 70) return '#10b981'
  if (signal >= 50) return '#f59e0b'
  return '#ef4444'
}

async function refreshCycleData() {
  cycleLoading.value = true
  try {
    const { data } = await macroApi.get('/api/v1/macro/cycle/position')
    currentPosition.value = data?.data?.position ?? Math.random() * 100
  } catch (e) {
    currentPosition.value = Math.random() * 100
  } finally {
    cycleLoading.value = false
  }
}

async function refreshHistoryData() {
  historyLoading.value = true
  try {
    await macroApi.get('/api/v1/macro/history')
    // 生成模拟历史数据
    const data = []
    const now = new Date()
    for (let i = 59; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 30 * 24 * 60 * 60 * 1000)
      data.push({
        date: date.toISOString().split('T')[0]!,
        value: Math.sin(i * 0.1) * 30 + 50 + Math.random() * 10
      })
    }
    historyData.value = data
  } catch (e) {
    console.warn('获取历史数据失败:', e)
  } finally {
    historyLoading.value = false
  }
}

onMounted(async () => {
  await Promise.all([
    refreshCycleData(),
    refreshHistoryData()
  ])
})
</script>

<style scoped>
.table-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.pagination {
  display: flex;
  justify-content: flex-end;
  padding-top: var(--spacing-sm);
}

/* 所有布局由 PageTemplate 统一管理，无需自定义样式 */
</style>
