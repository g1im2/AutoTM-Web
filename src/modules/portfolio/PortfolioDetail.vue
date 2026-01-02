<template>
  <PageTemplate>
    <template #actions>
      <el-button @click="goBack">
        <el-icon><ArrowLeft /></el-icon>
        返回列表
      </el-button>
      <el-button type="primary" @click="showRebalanceDialog = true">
        <el-icon><Operation /></el-icon>
        调仓建议
      </el-button>
    </template>

    <!-- 加载状态 -->
    <div v-if="loading.summary" class="loading-container">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>加载中...</span>
    </div>

    <template v-else-if="portfolio">
      <!-- 第一行：基本信息卡片 -->
      <div class="detail-row-1">
        <el-card class="info-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">基本信息</span>
            </div>
          </template>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">组合代码</span>
              <span class="value">{{ portfolio.code }}</span>
            </div>
            <div class="info-item">
              <span class="label">创建时间</span>
              <span class="value">{{ formatDate(portfolio.updatedAt) }}</span>
            </div>
            <div class="info-item">
              <span class="label">总市值</span>
              <span class="value primary">¥{{ formatNumber(portfolio.totalValue) }}</span>
            </div>
            <div class="info-item">
              <span class="label">持仓数量</span>
              <span class="value">{{ portfolio.positionCount }} 只</span>
            </div>
          </div>
        </el-card>

        <!-- 风险指标卡片 -->
        <el-card class="risk-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">风险指标</span>
            </div>
          </template>
          <div class="risk-grid">
            <div class="risk-item">
              <div class="risk-label">总收益率</div>
              <div class="risk-value" :class="portfolio.totalReturn >= 0 ? 'positive' : 'negative'">
                {{ portfolio.totalReturn >= 0 ? '+' : '' }}{{ portfolio.totalReturn.toFixed(2) }}%
              </div>
            </div>
            <div class="risk-item">
              <div class="risk-label">波动率</div>
              <div class="risk-value">{{ portfolio.volatility?.toFixed(2) ?? '--' }}%</div>
            </div>
            <div class="risk-item">
              <div class="risk-label">夏普比率</div>
              <div class="risk-value">{{ portfolio.sharpe?.toFixed(2) ?? '--' }}</div>
            </div>
            <div class="risk-item">
              <div class="risk-label">最大回撤</div>
              <div class="risk-value negative">{{ portfolio.maxDrawdown?.toFixed(2) ?? '--' }}%</div>
            </div>
          </div>
        </el-card>
      </div>

      <!-- 第二行：绩效图表 -->
      <div class="detail-row-2">
        <ChartCard title="收益曲线" height="400px" show-refresh @refresh="handleRefreshPerformance">
          <div ref="performanceChartRef" class="chart-container"></div>
        </ChartCard>
      </div>

      <!-- 第三行：持仓明细 -->
      <div class="detail-row-3">
        <ChartCard title="持仓明细" height="500px" show-refresh @refresh="handleRefreshPositions">
          <div class="table-wrapper">
            <el-table :data="paginatedPositions" style="width: 100%" stripe border>
              <el-table-column type="index" label="序号" :min-width="60" align="center" header-align="center" />
              <el-table-column prop="symbol" label="代码" :min-width="100" show-overflow-tooltip header-align="center" />
              <el-table-column prop="name" label="名称" :min-width="120" show-overflow-tooltip header-align="center" />
              <el-table-column prop="sector" label="行业" :min-width="100" header-align="center">
                <template #default="{ row }">
                  <el-tag v-if="row.sector" size="small" type="info">{{ row.sector }}</el-tag>
                  <span v-else class="text-muted">--</span>
                </template>
              </el-table-column>
              <el-table-column prop="weight" label="权重" :min-width="100" align="right" header-align="center">
                <template #default="{ row }">
                  {{ row.weight.toFixed(2) }}%
                </template>
              </el-table-column>
              <el-table-column prop="shares" label="持仓数量" :min-width="110" align="right" header-align="center">
                <template #default="{ row }">
                  {{ row.shares ?? '--' }}
                </template>
              </el-table-column>
              <el-table-column prop="currentPrice" label="现价" :min-width="100" align="right" header-align="center">
                <template #default="{ row }">
                  ¥{{ row.currentPrice?.toFixed(2) ?? '--' }}
                </template>
              </el-table-column>
              <el-table-column prop="value" label="市值" :min-width="120" align="right" header-align="center">
                <template #default="{ row }">
                  ¥{{ formatNumber(row.value) }}
                </template>
              </el-table-column>
              <el-table-column prop="pnl" label="盈亏" :min-width="120" align="right" header-align="center">
                <template #default="{ row }">
                  <span :class="getPnlClass(row.pnl)">
                    {{ row.pnl >= 0 ? '+' : '' }}¥{{ formatNumber(row.pnl ?? 0) }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column prop="pnlPercent" label="盈亏比例" :min-width="110" align="right" header-align="center">
                <template #default="{ row }">
                  <span :class="getPnlClass(row.pnlPercent)">
                    {{ row.pnlPercent >= 0 ? '+' : '' }}{{ row.pnlPercent?.toFixed(2) ?? '--' }}%
                  </span>
                </template>
              </el-table-column>
            </el-table>

            <el-pagination
              v-if="positions.length > 10"
              v-model:current-page="currentPage"
              v-model:page-size="pageSize"
              :page-sizes="[10, 20, 50, 100]"
              :total="positions.length"
              layout="total, sizes, prev, pager, next, jumper"
              class="pagination"
            />
          </div>
        </ChartCard>
      </div>

      <!-- 第四行：历史调仓记录 -->
      <div class="detail-row-4">
        <ChartCard title="历史调仓记录" height="600px" show-refresh @refresh="handleRefreshHistory">
          <el-timeline v-if="rebalanceHistory.length > 0">
            <el-timeline-item
              v-for="record in rebalanceHistory"
              :key="record.id"
              :timestamp="formatDateTime(record.executedAt)"
              placement="top"
            >
              <el-card>
                <div class="history-header">
                  <h4>{{ record.reason }}</h4>
                  <el-tag :type="getStatusType(record.status)" size="small">
                    {{ getStatusText(record.status) }}
                  </el-tag>
                </div>
                <div class="history-changes">
                  <div v-for="(change, idx) in record.changes" :key="idx" class="change-item">
                    <el-tag :type="getActionType(change.action)" size="small">
                      {{ getActionText(change.action) }}
                    </el-tag>
                    <span class="stock-info">{{ change.name }} ({{ change.symbol }})</span>
                    <span class="weight-change">
                      {{ change.fromWeight.toFixed(1) }}% → {{ change.toWeight.toFixed(1) }}%
                    </span>
                    <span v-if="change.amount" class="amount">
                      ¥{{ formatNumber(change.amount) }}
                    </span>
                  </div>
                </div>
                <div v-if="record.performance" class="history-performance">
                  <span>影响: </span>
                  <span :class="record.performance.impact >= 0 ? 'positive' : 'negative'">
                    {{ record.performance.impact >= 0 ? '+' : '' }}{{ record.performance.impact.toFixed(2) }}%
                  </span>
                </div>
              </el-card>
            </el-timeline-item>
          </el-timeline>
          <div v-else class="empty-state">
            <el-icon><DocumentCopy /></el-icon>
            <span>暂无调仓记录</span>
          </div>
        </ChartCard>
      </div>
    </template>

    <!-- 调仓建议对话框 -->
    <RebalanceDialog
      v-model="showRebalanceDialog"
      :portfolio-id="portfolioId"
      @success="handleRebalanceSuccess"
    />
  </PageTemplate>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import PageTemplate from '../../components/PageTemplate.vue'
import ChartCard from '../../components/ChartCard.vue'
import RebalanceDialog from './components/RebalanceDialog.vue'
import { usePortfolioStore } from '../../stores/portfolio'
import { ArrowLeft, Loading, Operation, DocumentCopy } from '@element-plus/icons-vue'

echarts.use([LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

const route = useRoute()
const router = useRouter()
const portfolioStore = usePortfolioStore()

const { currentPortfolio: portfolio, positions, rebalanceHistory, performanceData, loading } = storeToRefs(portfolioStore)

const portfolioId = computed(() => route.params.id as string)
const pageTitle = computed(() => portfolio.value?.name ?? '组合详情')
const pageDescription = computed(() => `组合代码: ${portfolio.value?.code ?? '--'}`)

const showRebalanceDialog = ref(false)
const performanceChartRef = ref<HTMLElement>()
let performanceChart: echarts.ECharts | null = null

// 分页相关
const currentPage = ref(1)
const pageSize = ref(10)

const paginatedPositions = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return positions.value.slice(start, end)
})

// 格式化函数
function formatNumber(num: number) {
  return num.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('zh-CN')
}

function getPnlClass(value?: number) {
  if (!value) return 'text-muted'
  return value >= 0 ? 'text-success' : 'text-danger'
}

function getStatusType(status: string) {
  const map: Record<string, any> = {
    'EXECUTED': 'success',
    'PENDING': 'warning',
    'FAILED': 'danger',
    'CANCELLED': 'info'
  }
  return map[status] || 'info'
}

function getStatusText(status: string) {
  const map: Record<string, string> = {
    'EXECUTED': '已执行',
    'PENDING': '待执行',
    'FAILED': '失败',
    'CANCELLED': '已取消'
  }
  return map[status] || status
}

function getActionType(action: string) {
  const map: Record<string, any> = {
    'BUY': 'success',
    'SELL': 'danger',
    'ADJUST': 'warning'
  }
  return map[action] || 'info'
}

function getActionText(action: string) {
  const map: Record<string, string> = {
    'BUY': '买入',
    'SELL': '卖出',
    'ADJUST': '调整'
  }
  return map[action] || action
}

function goBack() {
  router.push('/portfolio/list')
}

async function handleRefreshPerformance() {
  await portfolioStore.fetchPerformanceReturns(portfolioId.value, '30d', true)
  updatePerformanceChart()
}

async function handleRefreshPositions() {
  await portfolioStore.fetchPortfolioSummary(portfolioId.value, true)
}

async function handleRefreshHistory() {
  await portfolioStore.fetchRebalanceHistory(portfolioId.value, 20, true)
}

function handleRebalanceSuccess() {
  // 刷新数据
  handleRefreshHistory()
  handleRefreshPositions()
}

// 初始化绩效图表
function initPerformanceChart() {
  if (!performanceChartRef.value) return
  
  performanceChart = echarts.init(performanceChartRef.value)
  updatePerformanceChart()
}

function updatePerformanceChart() {
  if (!performanceChart || performanceData.value.length === 0) return
  
  const dates = performanceData.value.map(d => d.date)
  const returns = performanceData.value.map(d => d.portfolioReturn ?? d.value ?? 0)
  
  performanceChart.setOption({
    tooltip: {
      trigger: 'axis'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: dates,
      boundaryGap: false
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: '{value}%'
      }
    },
    series: [
      {
        name: '组合收益',
        type: 'line',
        data: returns,
        smooth: true,
        itemStyle: {
          color: '#3b82f6'
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.05)' }
            ]
          }
        }
      }
    ]
  })
}

function resizeChart() {
  performanceChart?.resize()
}

onMounted(async () => {
  await portfolioStore.fetchPortfolioSummary(portfolioId.value)
  await portfolioStore.fetchPerformanceReturns(portfolioId.value)
  await portfolioStore.fetchRebalanceHistory(portfolioId.value)
  
  setTimeout(() => {
    initPerformanceChart()
  }, 100)
  
  window.addEventListener('resize', resizeChart)
})

onUnmounted(() => {
  if (performanceChart) {
    performanceChart.dispose()
    performanceChart = null
  }
  window.removeEventListener('resize', resizeChart)
})

watch(() => performanceData.value, () => {
  if (performanceData.value.length > 0 && !performanceChart) {
    setTimeout(initPerformanceChart, 100)
  } else if (performanceChart) {
    updatePerformanceChart()
  }
}, { deep: true })
</script>

<style scoped>
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-xxl);
  color: var(--text-secondary);
}

.is-loading {
  font-size: 48px;
  animation: rotating 2s linear infinite;
}

@keyframes rotating {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.detail-row-1 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--card-gap-lg);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-lg);
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.info-item .label {
  font-size: 14px;
  color: var(--text-secondary);
}

.info-item .value {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.info-item .value.primary {
  color: var(--color-primary);
  font-size: 24px;
}

.risk-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-lg);
}

.risk-item {
  text-align: center;
}

.risk-label {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: var(--spacing-sm);
}

.risk-value {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.risk-value.positive {
  color: var(--color-success);
}

.risk-value.negative {
  color: var(--color-danger);
}

.chart-container {
  width: 100%;
  height: 100%;
}

.text-success {
  color: var(--color-success);
}

.text-danger {
  color: var(--color-danger);
}

.text-muted {
  color: var(--text-secondary);
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.history-header h4 {
  margin: 0;
  font-size: 16px;
}

.history-changes {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.change-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm);
  background: var(--bg-secondary);
  border-radius: var(--border-radius-sm);
}

.stock-info {
  flex: 1;
  font-weight: 500;
}

.weight-change {
  color: var(--text-secondary);
  font-size: 14px;
}

.amount {
  font-weight: 600;
  color: var(--color-primary);
}

.history-performance {
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--border-color);
  font-size: 14px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-xxl);
  color: var(--text-secondary);
}

.empty-state .el-icon {
  font-size: 48px;
}

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
</style>

