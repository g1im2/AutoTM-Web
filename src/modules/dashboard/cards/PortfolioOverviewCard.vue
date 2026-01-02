<template>
  <ChartCard title="投资组合概览" height="450px" show-refresh @refresh="handleRefresh">
    <div class="portfolio-overview">
      <div v-if="loading" class="loading-state">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>加载中...</span>
      </div>
      <div v-else-if="portfolios.length === 0" class="empty-state">
        <el-icon><Wallet /></el-icon>
        <span>暂无组合数据</span>
        <el-button type="primary" size="small" @click="goToCreate">创建组合</el-button>
      </div>
      <div v-else class="overview-content">
        <!-- 组合选择器 -->
        <div class="portfolio-selector">
          <el-select v-model="selectedPortfolioId" placeholder="选择组合" style="width: 100%">
            <el-option
              v-for="pf in portfolios"
              :key="pf.id"
              :label="pf.name"
              :value="pf.id"
            />
          </el-select>
        </div>

        <!-- KPI 指标 -->
        <div class="kpi-grid">
          <div class="kpi-item">
            <span class="kpi-label">总资产</span>
            <span class="kpi-value">{{ formatCurrency(currentPortfolio?.totalValue ?? 0) }}</span>
          </div>
          <div class="kpi-item">
            <span class="kpi-label">总收益率</span>
            <span v-if="currentPortfolio?.totalReturn !== undefined && currentPortfolio?.totalReturn !== null" class="kpi-value" :class="returnClass">
              {{ currentPortfolio.totalReturn >= 0 ? '+' : '' }}{{ currentPortfolio.totalReturn.toFixed(2) }}%
            </span>
            <span v-else class="kpi-value">--</span>
          </div>
          <div class="kpi-item">
            <span class="kpi-label">夏普比率</span>
            <span class="kpi-value">{{ currentPortfolio?.sharpe?.toFixed(3) ?? '--' }}</span>
          </div>
          <div class="kpi-item">
            <span class="kpi-label">最大回撤</span>
            <span class="kpi-value text-danger">{{ currentPortfolio?.maxDrawdown?.toFixed(2) ?? '--' }}%</span>
          </div>
        </div>

        <!-- 仓位分布饼图 -->
        <div class="position-chart">
          <div ref="pieChartRef" class="pie-chart"></div>
        </div>

        <!-- 操作按钮 -->
        <div class="actions">
          <el-button size="small" @click="goToDetail">查看详情</el-button>
          <el-button size="small" type="primary" @click="goToRebalance">调仓建议</el-button>
        </div>
      </div>
    </div>
  </ChartCard>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import * as echarts from 'echarts/core'
import { PieChart } from 'echarts/charts'
import { TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import ChartCard from '../../../components/ChartCard.vue'
import { usePortfolioStore } from '../../../stores/portfolio'
import { Loading, Wallet } from '@element-plus/icons-vue'

echarts.use([PieChart, TooltipComponent, LegendComponent, CanvasRenderer])

const router = useRouter()
const portfolioStore = usePortfolioStore()
const { portfolios, currentPortfolio, positions, loading: storeLoading } = storeToRefs(portfolioStore)

const loading = computed(() => storeLoading.value.portfolios || storeLoading.value.summary)
const selectedPortfolioId = ref<string>('')

const returnClass = computed(() => {
  const ret = currentPortfolio.value?.totalReturn ?? 0
  return ret >= 0 ? 'text-success' : 'text-danger'
})

const pieChartRef = ref<HTMLElement>()
let pieChartInstance: echarts.ECharts | null = null

const pieChartOption = computed(() => {
  const data = positions.value.slice(0, 10).map(pos => ({
    name: pos.name,
    value: pos.value
  }))

  return {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      textStyle: { color: 'var(--text-secondary)', fontSize: 12 }
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold'
          }
        },
        data
      }
    ]
  }
})

function formatCurrency(value: number) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 0
  }).format(value)
}

function initPieChart() {
  if (!pieChartRef.value) return
  pieChartInstance = echarts.init(pieChartRef.value)
  pieChartInstance.setOption(pieChartOption.value)
}

function updatePieChart() {
  if (pieChartInstance) {
    pieChartInstance.setOption(pieChartOption.value)
  }
}

function resizePieChart() {
  if (pieChartInstance) {
    pieChartInstance.resize()
  }
}

async function handleRefresh() {
  await portfolioStore.refreshAll()
  if (selectedPortfolioId.value) {
    await portfolioStore.fetchPortfolioSummary(selectedPortfolioId.value, true)
  }
}

function goToCreate() {
  router.push('/portfolio/create')
}

function goToDetail() {
  if (selectedPortfolioId.value) {
    router.push(`/portfolio/detail?id=${selectedPortfolioId.value}`)
  }
}

function goToRebalance() {
  if (selectedPortfolioId.value) {
    router.push(`/portfolio/rebalance?id=${selectedPortfolioId.value}`)
  }
}

watch(selectedPortfolioId, async (newId) => {
  if (newId) {
    await portfolioStore.fetchPortfolioSummary(newId)
    setTimeout(() => {
      if (positions.value.length > 0) {
        if (!pieChartInstance) {
          initPieChart()
        } else {
          updatePieChart()
        }
      }
    }, 100)
  }
})

watch(() => positions.value, () => {
  if (positions.value.length > 0 && pieChartInstance) {
    updatePieChart()
  }
}, { deep: true })

onMounted(async () => {
  await portfolioStore.fetchPortfolios()
  if (portfolios.value.length > 0) {
    selectedPortfolioId.value = portfolios.value[0].id
  }
  window.addEventListener('resize', resizePieChart)
})

onUnmounted(() => {
  if (pieChartInstance) {
    pieChartInstance.dispose()
    pieChartInstance = null
  }
  window.removeEventListener('resize', resizePieChart)
})
</script>

<style scoped>
.portfolio-overview {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.loading-state,
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  color: var(--text-secondary);
}

.loading-state .el-icon,
.empty-state .el-icon {
  font-size: 48px;
}

.overview-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  height: 100%;
}

.portfolio-selector {
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px solid var(--border-color);
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
}

.kpi-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.kpi-label {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  font-weight: 500;
}

.kpi-value {
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--text-primary);
}

.text-success {
  color: var(--success-color);
}

.text-danger {
  color: var(--danger-color);
}

.position-chart {
  flex: 1;
  min-height: 200px;
}

.pie-chart {
  width: 100%;
  height: 100%;
}

.actions {
  display: flex;
  gap: var(--spacing-sm);
  padding-top: var(--spacing-sm);
  border-top: 1px solid var(--border-color);
}

.is-loading {
  animation: rotating 2s linear infinite;
}

@keyframes rotating {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>

