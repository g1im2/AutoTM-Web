<template>
  <PageTemplate>
    <template #actions>
      <el-button type="primary" @click="startMonitoring" :disabled="isMonitoring">
        <el-icon><VideoPlay /></el-icon>
        {{ isMonitoring ? '监控中' : '开始监控' }}
      </el-button>
      <el-button @click="stopMonitoring" :disabled="!isMonitoring">
        <el-icon><VideoPause /></el-icon>
        停止监控
      </el-button>
      <el-button @click="refreshData">
        <el-icon><Refresh /></el-icon>
        刷新数据
      </el-button>
    </template>

    <!-- 实时状态概览 -->
    <div class="overview-cards">
        <KpiCard 
          title="运行策略数" 
          :value="realtimeMetrics.runningStrategies" 
          type="success"
          subtitle="正在验证"
          :loading="metricsLoading"
        />
        <KpiCard 
          title="今日收益率" 
          :value="realtimeMetrics.todayReturn" 
          format="percentage"
          :type="realtimeMetrics.todayReturn > 0 ? 'success' : 'danger'"
          subtitle="实时计算"
          :loading="metricsLoading"
        />
        <KpiCard 
          title="实时净值" 
          :value="realtimeMetrics.currentNav" 
          format="currency"
          subtitle="最新净值"
          :loading="metricsLoading"
        />
        <KpiCard 
          title="信号数量" 
          :value="realtimeMetrics.signalCount" 
          :type="realtimeMetrics.signalCount > 0 ? 'warning' : 'success'"
          subtitle="待处理信号"
          :loading="metricsLoading"
        />
      </div>

    <!-- 实时净值曲线 -->
    <ChartCard title="实时净值曲线" height="400px" show-refresh @refresh="refreshNavData">
      <TrendChart
        :data="navData"
        :loading="navLoading"
        color="#3b82f6"
        title="净值走势"
        :real-time="true"
      />
    </ChartCard>

    <!-- 策略实时状态 -->
    <ChartCard title="策略实时状态">
        <template #header>
          <div class="card-header">
            <div class="header-controls">
              <el-switch
                v-model="autoRefresh"
                active-text="自动刷新"
                inactive-text="手动刷新"
                @change="toggleAutoRefresh"
              />
              <span class="refresh-interval">{{ refreshInterval }}s</span>
            </div>
          </div>
        </template>

        <div class="table-wrapper">
          <el-table :data="paginatedStrategyStatus" style="width: 100%" stripe border>
            <el-table-column prop="name" label="策略名称" :min-width="200" show-overflow-tooltip header-align="center" />
            <el-table-column prop="status" label="运行状态" :min-width="120" align="center" header-align="center">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)" size="small">
                  <el-icon class="status-icon">
                    <component :is="getStatusIcon(row.status)" />
                  </el-icon>
                  {{ row.statusText }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="position" label="当前仓位" :min-width="120" align="right" header-align="center">
              <template #default="{ row }">
                <span :class="getPositionClass(row.position)">
                  {{ row.position.toFixed(2) }}%
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="todayReturn" label="今日收益" :min-width="120" align="right" header-align="center">
              <template #default="{ row }">
                <span :class="getReturnClass(row.todayReturn)">
                  {{ row.todayReturn > 0 ? '+' : '' }}{{ row.todayReturn.toFixed(2) }}%
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="totalReturn" label="累计收益" :min-width="120" align="right" header-align="center">
              <template #default="{ row }">
                <span :class="getReturnClass(row.totalReturn)">
                  {{ row.totalReturn > 0 ? '+' : '' }}{{ row.totalReturn.toFixed(2) }}%
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="lastSignal" label="最新信号" :min-width="150" header-align="center">
              <template #default="{ row }">
                <el-tag v-if="row.lastSignal" :type="getSignalType(row.lastSignal.type)" size="small">
                  {{ row.lastSignal.type }} {{ row.lastSignal.symbol }}
                </el-tag>
                <span v-else class="text-muted">无信号</span>
              </template>
            </el-table-column>
            <el-table-column prop="lastUpdate" label="最后更新" :min-width="180" show-overflow-tooltip header-align="center" />
            <el-table-column label="操作" :min-width="180" fixed="right" align="left" header-align="center">
              <template #default="{ row }">
                <el-button size="small" type="primary" @click="viewStrategyDetail(row)">
                  <el-icon><View /></el-icon>
                  详情
                </el-button>
                <el-button
                  size="small"
                  :type="row.status === 'running' ? 'danger' : 'success'"
                  @click="toggleStrategy(row)"
                  >
                  {{ row.status === 'running' ? '停止' : '启动' }}
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            v-if="strategyStatus.length > 10"
            v-model:current-page="statusCurrentPage"
            v-model:page-size="statusPageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="strategyStatus.length"
            layout="total, sizes, prev, pager, next, jumper"
            class="pagination"
          />
        </div>
      </ChartCard>

    <!-- 实时信号监控 -->
    <ChartCard title="实时信号监控">
        <template #header>
          <div class="card-header">
            <div class="header-controls">
              <el-select v-model="signalFilter" placeholder="信号类型" style="width: 150px">
                <el-option label="全部" value="" />
                <el-option label="买入" value="buy" />
                <el-option label="卖出" value="sell" />
                <el-option label="持有" value="hold" />
              </el-select>
              <el-button size="small" @click="clearSignals">
                <el-icon><Delete /></el-icon>
                清空
              </el-button>
            </div>
          </div>
        </template>

        <div class="table-wrapper">
          <el-table :data="paginatedSignals" style="width: 100%" stripe border>
            <el-table-column prop="time" label="时间" :min-width="180" show-overflow-tooltip header-align="center" />
            <el-table-column prop="strategy" label="策略" :min-width="120" show-overflow-tooltip header-align="center" />
            <el-table-column prop="symbol" label="标的" :min-width="100" show-overflow-tooltip header-align="center" />
            <el-table-column prop="type" label="信号类型" :min-width="140" align="center" header-align="center">
              <template #default="{ row }">
                <el-tag :type="getSignalType(row.type)" size="small">{{ row.type }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="price" label="价格" :min-width="100" align="right" header-align="center">
              <template #default="{ row }">
                ¥{{ row.price.toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column prop="quantity" label="数量" :min-width="100" align="right" header-align="center">
              <template #default="{ row }">
                {{ row.quantity.toLocaleString() }}
              </template>
            </el-table-column>
            <el-table-column prop="confidence" label="置信度" :min-width="120" align="right" header-align="center">
              <template #default="{ row }">
                <el-progress
                  :percentage="row.confidence"
                  :color="getConfidenceColor(row.confidence)"
                  :show-text="false"
                  style="width: 60px"
                />
                <span style="margin-left: 8px; font-size: 12px;">{{ row.confidence }}%</span>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" :min-width="100" align="center" header-align="center">
              <template #default="{ row }">
                <el-tag :type="getSignalStatusType(row.status)" size="small">{{ row.statusText }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="reason" label="信号原因" fixed="right" :min-width="140" show-overflow-tooltip header-align="center" />
          </el-table>

          <el-pagination
            v-if="filteredSignals.length > 10"
            v-model:current-page="signalsCurrentPage"
            v-model:page-size="signalsPageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="filteredSignals.length"
            layout="total, sizes, prev, pager, next, jumper"
            class="pagination"
          />
        </div>
      </ChartCard>

    <!-- 性能监控 -->
    <div class="monitor-grid">
        <!-- 延迟监控 -->
        <ChartCard title="系统延迟" height="300px">
          <GaugeChart 
            :value="performanceMetrics.latency" 
            :max="1000"
            :stages="latencyStages"
            unit="ms"
            title="平均延迟"
          />
        </ChartCard>

        <!-- 吞吐量监控 -->
        <ChartCard title="信号吞吐量" height="300px">
          <div class="throughput-chart">
            <v-chart class="chart" :option="throughputOption" autoresize />
          </div>
        </ChartCard>

        <!-- 资源使用率 -->
        <ChartCard title="资源使用率" height="300px">
          <div class="resource-metrics">
            <div class="resource-item">
              <span class="resource-label">CPU使用率</span>
              <el-progress :percentage="performanceMetrics.cpuUsage" :color="getResourceColor(performanceMetrics.cpuUsage)" />
            </div>
            <div class="resource-item">
              <span class="resource-label">内存使用率</span>
              <el-progress :percentage="performanceMetrics.memoryUsage" :color="getResourceColor(performanceMetrics.memoryUsage)" />
            </div>
            <div class="resource-item">
              <span class="resource-label">网络IO</span>
              <el-progress :percentage="performanceMetrics.networkIO" :color="getResourceColor(performanceMetrics.networkIO)" />
            </div>
            <div class="resource-item">
              <span class="resource-label">磁盘IO</span>
              <el-progress :percentage="performanceMetrics.diskIO" :color="getResourceColor(performanceMetrics.diskIO)" />
            </div>
          </div>
        </ChartCard>

        <!-- 错误率监控 -->
        <ChartCard title="错误率统计" height="300px">
          <div class="error-stats">
            <div class="error-item">
              <span class="error-label">数据错误</span>
              <span class="error-count">{{ performanceMetrics.dataErrors }}</span>
            </div>
            <div class="error-item">
              <span class="error-label">网络错误</span>
              <span class="error-count">{{ performanceMetrics.networkErrors }}</span>
            </div>
            <div class="error-item">
              <span class="error-label">策略错误</span>
              <span class="error-count">{{ performanceMetrics.strategyErrors }}</span>
            </div>
            <div class="error-item">
              <span class="error-label">系统错误</span>
              <span class="error-count">{{ performanceMetrics.systemErrors }}</span>
            </div>
          </div>
        </ChartCard>
      </div>
  </PageTemplate>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import PageTemplate from '../../components/PageTemplate.vue'
import { executionApi } from '../../api/clients'
import KpiCard from '../../components/KpiCard.vue'
import ChartCard from '../../components/ChartCard.vue'
import TrendChart from '../../components/charts/TrendChart.vue'
import GaugeChart from '../../components/charts/GaugeChart.vue'
import {
  VideoPlay, VideoPause, Refresh, View, Delete,
  CircleCheck, Warning, CircleClose
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import VChart from 'vue-echarts'

// 注册 ECharts 组件
use([
  CanvasRenderer,
  LineChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

interface RealtimeMetrics {
  runningStrategies: number
  todayReturn: number
  currentNav: number
  signalCount: number
}

interface StrategyStatus {
  id: string
  name: string
  status: string
  statusText: string
  position: number
  todayReturn: number
  totalReturn: number
  lastSignal?: {
    type: string
    symbol: string
  }
  lastUpdate: string
}

interface Signal {
  id: string
  time: string
  strategy: string
  symbol: string
  type: string
  price: number
  quantity: number
  confidence: number
  status: string
  statusText: string
  reason: string
}

interface PerformanceMetrics {
  latency: number
  cpuUsage: number
  memoryUsage: number
  networkIO: number
  diskIO: number
  dataErrors: number
  networkErrors: number
  strategyErrors: number
  systemErrors: number
}

// 状态管理
const isMonitoring = ref(false)
const autoRefresh = ref(true)
const refreshInterval = ref(5)
const signalFilter = ref('')
const metricsLoading = ref(false)
const navLoading = ref(false)

// 分页相关
const statusCurrentPage = ref(1)
const statusPageSize = ref(10)
const signalsCurrentPage = ref(1)
const signalsPageSize = ref(10)

// 定时器
let refreshTimer: number | null = null
let navUpdateTimer: number | null = null

// 实时指标
const realtimeMetrics = ref<RealtimeMetrics>({
  runningStrategies: 3,
  todayReturn: 1.25,
  currentNav: 1.0856,
  signalCount: 2
})

// 净值数据
const navData = ref<Array<{ date: string; value: number }>>([])

// 策略状态
const strategyStatus = ref<StrategyStatus[]>([
  {
    id: 'ST001',
    name: '双均线趋势策略',
    status: 'running',
    statusText: '运行中',
    position: 75.5,
    todayReturn: 1.8,
    totalReturn: 15.8,
    lastSignal: { type: '买入', symbol: '000001' },
    lastUpdate: new Date().toLocaleString()
  },
  {
    id: 'ST002',
    name: 'RSI均值回归',
    status: 'running',
    statusText: '运行中',
    position: 45.2,
    todayReturn: 0.9,
    totalReturn: 12.3,
    lastSignal: { type: '卖出', symbol: '600519' },
    lastUpdate: new Date().toLocaleString()
  },
  {
    id: 'ST003',
    name: '动量突破策略',
    status: 'stopped',
    statusText: '已停止',
    position: 0,
    todayReturn: 0,
    totalReturn: 8.7,
    lastUpdate: new Date().toLocaleString()
  }
])

// 信号数据
const signals = ref<Signal[]>([
  {
    id: 'SIG001',
    time: new Date().toLocaleString(),
    strategy: '双均线趋势策略',
    symbol: '000001',
    type: '买入',
    price: 12.58,
    quantity: 5000,
    confidence: 85,
    status: 'pending',
    statusText: '待执行',
    reason: '5日均线上穿20日均线，趋势向上'
  },
  {
    id: 'SIG002',
    time: new Date(Date.now() - 5 * 60 * 1000).toLocaleString(),
    strategy: 'RSI均值回归',
    symbol: '600519',
    type: '卖出',
    price: 1680.50,
    quantity: 100,
    confidence: 92,
    status: 'executed',
    statusText: '已执行',
    reason: 'RSI指标超买，价格回调概率高'
  }
])

// 性能指标
const performanceMetrics = ref<PerformanceMetrics>({
  latency: 125,
  cpuUsage: 45,
  memoryUsage: 68,
  networkIO: 32,
  diskIO: 28,
  dataErrors: 0,
  networkErrors: 1,
  strategyErrors: 0,
  systemErrors: 0
})

// 延迟阶段配置
const latencyStages = [
  { min: 0, max: 100, color: '#10b981', label: '优秀' },
  { min: 100, max: 300, color: '#f59e0b', label: '良好' },
  { min: 300, max: 500, color: '#ef4444', label: '较差' },
  { min: 500, max: 1000, color: '#7c2d12', label: '很差' }
]

// 计算属性
const filteredSignals = computed(() => {
  if (!signalFilter.value) return signals.value
  return signals.value.filter(signal => signal.type === signalFilter.value)
})

// 分页数据
const paginatedStrategyStatus = computed(() => {
  const start = (statusCurrentPage.value - 1) * statusPageSize.value
  const end = start + statusPageSize.value
  return strategyStatus.value.slice(start, end)
})

const paginatedSignals = computed(() => {
  const start = (signalsCurrentPage.value - 1) * signalsPageSize.value
  const end = start + signalsPageSize.value
  return filteredSignals.value.slice(start, end)
})

// 吞吐量图表配置
const throughputOption = computed(() => ({
  title: {
    text: '信号处理量',
    textStyle: { color: 'var(--text-primary)', fontSize: 14 }
  },
  tooltip: {
    trigger: 'axis'
  },
  xAxis: {
    type: 'category',
    data: generateTimeLabels(10),
    axisLabel: { color: 'var(--text-secondary)' }
  },
  yAxis: {
    type: 'value',
    name: '信号数/分钟',
    axisLabel: { color: 'var(--text-secondary)' }
  },
  series: [
    {
      name: '信号处理量',
      type: 'line',
      data: generateThroughputData(),
      smooth: true,
      itemStyle: { color: '#3b82f6' }
    }
  ]
}))

// 方法
function getStatusType(status: string) {
  switch (status) {
    case 'running': return 'success'
    case 'stopped': return 'info'
    case 'error': return 'danger'
    default: return 'default'
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'running': return CircleCheck
    case 'stopped': return CircleClose
    case 'error': return Warning
    default: return CircleClose
  }
}

function getPositionClass(position: number) {
  if (position > 70) return 'text-danger'
  if (position > 30) return 'text-warning'
  return 'text-success'
}

function getReturnClass(returnValue: number) {
  if (returnValue > 0) return 'text-success'
  if (returnValue < 0) return 'text-danger'
  return 'text-muted'
}

function getSignalType(type: string) {
  switch (type) {
    case '买入': return 'success'
    case '卖出': return 'danger'
    case '持有': return 'info'
    default: return 'default'
  }
}

function getSignalStatusType(status: string) {
  switch (status) {
    case 'executed': return 'success'
    case 'pending': return 'warning'
    case 'cancelled': return 'info'
    case 'failed': return 'danger'
    default: return 'default'
  }
}

function getConfidenceColor(confidence: number) {
  if (confidence >= 80) return '#10b981'
  if (confidence >= 60) return '#f59e0b'
  return '#ef4444'
}

function getResourceColor(usage: number) {
  if (usage >= 80) return '#ef4444'
  if (usage >= 60) return '#f59e0b'
  return '#10b981'
}

function generateTimeLabels(count: number) {
  const labels = []
  const now = new Date()
  for (let i = count - 1; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 1000)
    labels.push(time.toLocaleTimeString().slice(0, 5))
  }
  return labels
}

function generateThroughputData() {
  return Array.from({ length: 10 }, () => Math.floor(Math.random() * 20) + 5)
}

function generateNavData() {
  const data = []
  const now = new Date()
  let currentNav = 1.0

  for (let i = 100; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 60 * 1000)
    currentNav += (Math.random() - 0.5) * 0.002

    data.push({
      date: date.toISOString(),
      value: currentNav
    })
  }

  return data
}

async function startMonitoring() {
  isMonitoring.value = true

  try {
    await executionApi.post('/api/v1/realtime/start')
    ElMessage.success('实时监控已启动')

    // 启动自动刷新
    if (autoRefresh.value) {
      startAutoRefresh()
    }

    // 启动净值更新
    startNavUpdate()
  } catch (error) {
    console.warn('启动监控失败:', error)
    ElMessage.error('启动实时监控失败')
  }
}

async function stopMonitoring() {
  isMonitoring.value = false

  try {
    await executionApi.post('/api/v1/realtime/stop')
    ElMessage.success('实时监控已停止')

    // 停止自动刷新
    stopAutoRefresh()
    stopNavUpdate()
  } catch (error) {
    console.warn('停止监控失败:', error)
    ElMessage.error('停止实时监控失败')
  }
}

function toggleAutoRefresh(enabled: boolean) {
  if (enabled && isMonitoring.value) {
    startAutoRefresh()
  } else {
    stopAutoRefresh()
  }
}

function startAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer)

  refreshTimer = setInterval(() => {
    refreshData()
  }, refreshInterval.value * 1000)
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

function startNavUpdate() {
  if (navUpdateTimer) clearInterval(navUpdateTimer)

  navUpdateTimer = setInterval(() => {
    updateNavData()
  }, 1000) // 每秒更新净值
}

function stopNavUpdate() {
  if (navUpdateTimer) {
    clearInterval(navUpdateTimer)
    navUpdateTimer = null
  }
}

async function refreshData() {
  metricsLoading.value = true

  try {
    const { data } = await executionApi.get('/api/v1/realtime/metrics')

    if (data?.data) {
      const metrics = data.data
      realtimeMetrics.value.todayReturn = metrics.today_return || 0
      realtimeMetrics.value.currentNav = metrics.current_nav || 1.0
      realtimeMetrics.value.signalCount = metrics.signal_count || 0

      if (metrics.strategies && Array.isArray(metrics.strategies)) {
        strategyStatus.value = metrics.strategies
      }

      if (metrics.performance) {
        performanceMetrics.value.latency = metrics.performance.latency || 0
        performanceMetrics.value.cpuUsage = metrics.performance.cpu_usage || 0
        performanceMetrics.value.memoryUsage = metrics.performance.memory_usage || 0
      }
    }
  } catch (error) {
    console.warn('刷新数据失败:', error)
  } finally {
    metricsLoading.value = false
  }
}

async function refreshNavData() {
  navLoading.value = true

  try {
    const { data } = await executionApi.get('/api/v1/realtime/nav')

    if (data?.data?.nav_series && Array.isArray(data.data.nav_series)) {
      navData.value = data.data.nav_series.map((item: any) => ({
        time: item.time || item.timestamp,
        value: item.value || item.nav || 1.0
      }))
    } else {
      // 如果后端返回空数据，使用空数组
      navData.value = []
    }
  } catch (error) {
    console.warn('刷新净值数据失败:', error)
    navData.value = []
  } finally {
    navLoading.value = false
  }
}

function updateNavData() {
  if (navData.value.length === 0) return

  // 添加新的净值点
  const lastNav = navData.value[navData.value.length - 1]
  if (!lastNav) return

  const newNav = lastNav.value + (Math.random() - 0.5) * 0.002

  navData.value.push({
    date: new Date().toISOString(),
    value: newNav
  })

  // 保持最近100个点
  if (navData.value.length > 100) {
    navData.value.shift()
  }

  // 更新当前净值
  realtimeMetrics.value.currentNav = newNav
}

function viewStrategyDetail(strategy: StrategyStatus) {
  ElMessage.info(`查看策略详情: ${strategy.name}`)
}

async function toggleStrategy(strategy: StrategyStatus) {
  const action = strategy.status === 'running' ? 'stop' : 'start'

  try {
    await executionApi.post(`/api/v1/strategy/${strategy.id}/${action}`)

    strategy.status = strategy.status === 'running' ? 'stopped' : 'running'
    strategy.statusText = strategy.status === 'running' ? '运行中' : '已停止'
    strategy.lastUpdate = new Date().toLocaleString()

    // 更新运行策略数量
    realtimeMetrics.value.runningStrategies = strategyStatus.value.filter(s => s.status === 'running').length

    ElMessage.success(`策略已${action === 'start' ? '启动' : '停止'}`)
  } catch (error) {
    console.warn(`${action}策略失败:`, error)
    ElMessage.error(`${action === 'start' ? '启动' : '停止'}策略失败`)
  }
}

function clearSignals() {
  signals.value = []
  ElMessage.success('信号已清空')
}

onMounted(() => {
  // 初始化数据
  navData.value = generateNavData()

  // 如果需要自动启动监控
  if (autoRefresh.value) {
    startMonitoring()
  }
})

onUnmounted(() => {
  // 清理定时器
  stopAutoRefresh()
  stopNavUpdate()
})
</script>

<style scoped>
.overview-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--card-gap-lg);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.card-header h3 {
  margin: 0;
  color: var(--text-primary);
}

.header-controls {
  display: flex;
  gap: var(--spacing-md);
  align-items: center;
}

.refresh-interval {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.status-icon {
  margin-right: var(--spacing-xs);
}

.monitor-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--card-gap-lg);
}

.throughput-chart {
  height: 300px;
}

.chart {
  width: 100%;
  height: 100%;
}

.resource-metrics {
  padding: var(--spacing-lg);
}

.resource-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
}

.resource-item:last-child {
  margin-bottom: 0;
}

.resource-label {
  font-weight: 600;
  color: var(--text-secondary);
  min-width: 80px;
}

.error-stats {
  padding: var(--spacing-lg);
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--card-gap-lg);
}

.error-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  background-color: var(--surface-bg);
  border-radius: var(--radius-md);
}

.error-label {
  font-weight: 600;
  color: var(--text-secondary);
}

.error-count {
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--danger-color);
}

/* 表格样式增强 */
.el-table .text-success {
  color: var(--success-color);
  font-weight: 600;
}

.el-table .text-danger {
  color: var(--danger-color);
  font-weight: 600;
}

.el-table .text-warning {
  color: var(--warning-color);
  font-weight: 600;
}

.el-table .text-muted {
  color: var(--text-muted);
}

/* 开关样式 */
.el-switch {
  --el-switch-on-color: var(--success-color);
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .monitor-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .execution-realtime {
    padding: var(--spacing-md);
  }

  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: var(--spacing-md);
  }

  .header-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .overview-cards {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-md);
  }

  .card-header {
    flex-direction: column;
    align-items: stretch;
    gap: var(--spacing-md);
  }

  .header-controls {
    justify-content: space-between;
  }

  .monitor-grid {
    grid-template-columns: 1fr;
  }

  .error-stats {
    grid-template-columns: 1fr;
  }
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

/* 标签样式增强 */
.el-tag {
  font-weight: 500;
}

/* 按钮样式 */
.el-button + .el-button {
  margin-left: var(--spacing-xs);
}
</style>
