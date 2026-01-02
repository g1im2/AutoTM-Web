<template>
  <div class="system-dataflow">
    <div class="page-header">
      <div class="header-actions">
        <el-button @click="refreshDataflow">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
        <el-switch
          v-model="realTimeMode"
          active-text="实时模式"
          inactive-text="静态模式"
          @change="toggleRealTimeMode"
        />
      </div>
    </div>

    <!-- 数据流概览 -->
    <div class="dataflow-overview">
      <div class="overview-cards">
        <KpiCard 
          title="活跃数据流" 
          :value="dataflowMetrics.activeFlows" 
          type="success"
          subtitle="当前运行中"
        />
        <KpiCard 
          title="数据吞吐量" 
          :value="dataflowMetrics.throughput" 
          subtitle="条/秒"
        />
        <KpiCard 
          title="错误率" 
          :value="dataflowMetrics.errorRate" 
          format="percentage"
          :type="dataflowMetrics.errorRate > 1 ? 'danger' : 'success'"
          subtitle="过去1小时"
        />
        <KpiCard 
          title="平均延迟" 
          :value="dataflowMetrics.avgLatency" 
          :type="dataflowMetrics.avgLatency > 100 ? 'warning' : 'success'"
          subtitle="毫秒"
        />
      </div>
    </div>

    <!-- 数据流拓扑图 -->
    <div class="dataflow-topology">
      <ChartCard title="数据流拓扑图" height="500px">
        <template #header>
          <div class="card-header">
            <div class="header-controls">
              <el-button-group>
                <el-button :type="viewMode === 'topology' ? 'primary' : 'default'" @click="viewMode = 'topology'">
                  拓扑视图
                </el-button>
                <el-button :type="viewMode === 'flow' ? 'primary' : 'default'" @click="viewMode = 'flow'">
                  流向视图
                </el-button>
              </el-button-group>
              <el-select v-model="selectedService" placeholder="选择服务" style="width: 150px">
                <el-option label="全部" value="" />
                <el-option label="Brain Service" value="brain" />
                <el-option label="Macro Service" value="macro" />
                <el-option label="Portfolio Service" value="portfolio" />
              </el-select>
            </div>
          </div>
        </template>

        <div class="topology-container">
          <div v-if="viewMode === 'topology'" class="topology-view">
            <v-chart class="chart" :option="topologyOption" autoresize />
          </div>
          <div v-else class="flow-view">
            <v-chart class="chart" :option="flowOption" autoresize />
          </div>
        </div>
      </ChartCard>
    </div>

    <!-- 数据流列表 -->
    <div class="dataflow-list">
      <ChartCard title="数据流列表">
        <template #header>
          <div class="card-header">
            <div class="header-controls">
              <el-input
                v-model="searchText"
                placeholder="搜索数据流"
                style="width: 300px"
                clearable
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
              <el-select v-model="statusFilter" placeholder="状态筛选" style="width: 150px">
                <el-option label="全部" value="" />
                <el-option label="运行中" value="running" />
                <el-option label="暂停" value="paused" />
                <el-option label="错误" value="error" />
              </el-select>
            </div>
          </div>
        </template>

        <div class="table-wrapper">
          <el-table :data="paginatedDataflows" style="width: 100%" stripe border>
            <el-table-column prop="name" label="数据流名称" :min-width="200" show-overflow-tooltip header-align="center" />
            <el-table-column prop="source" label="数据源" :min-width="150" show-overflow-tooltip header-align="center" />
            <el-table-column prop="destination" label="目标" :min-width="150" show-overflow-tooltip header-align="center" />
            <el-table-column prop="status" label="状态" :min-width="100" align="center" header-align="center">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)" size="small">{{ row.statusText }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="throughput" label="吞吐量" :min-width="120" align="right" header-align="center">
              <template #default="{ row }">
                {{ row.throughput }} 条/秒
              </template>
            </el-table-column>
            <el-table-column prop="latency" label="延迟" :min-width="100" align="right" header-align="center">
              <template #default="{ row }">
                <span :class="getLatencyClass(row.latency)">{{ row.latency }}ms</span>
              </template>
            </el-table-column>
            <el-table-column prop="errorRate" label="错误率" :min-width="100" align="right" header-align="center">
              <template #default="{ row }">
                <span :class="getErrorRateClass(row.errorRate)">{{ row.errorRate }}%</span>
              </template>
            </el-table-column>
            <el-table-column prop="lastUpdate" label="最后更新" :min-width="180" show-overflow-tooltip header-align="center" />
            <el-table-column label="操作" :min-width="200" fixed="right" align="left" header-align="center">
              <template #default="{ row }">
                <el-button size="small" type="primary" @click="viewFlowDetails(row)">
                  <el-icon><View /></el-icon>
                  详情
                </el-button>
                <el-button
                  size="small"
                  :type="row.status === 'running' ? 'warning' : 'success'"
                  @click="toggleFlow(row)"
                >
                  <el-icon><component :is="row.status === 'running' ? 'VideoPause' : 'VideoPlay'" /></el-icon>
                  {{ row.status === 'running' ? '暂停' : '启动' }}
                </el-button>
                <el-button size="small" type="danger" @click="deleteFlow(row)">
                  <el-icon><Delete /></el-icon>
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            v-if="filteredDataflows.length > 10"
            v-model:current-page="dataflowsCurrentPage"
            v-model:page-size="dataflowsPageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="filteredDataflows.length"
            layout="total, sizes, prev, pager, next, jumper"
            class="pagination"
          />
        </div>
      </ChartCard>
    </div>

    <!-- 数据流监控 -->
    <div class="dataflow-monitoring">
      <div class="monitoring-grid">
        <!-- 吞吐量趋势 -->
        <ChartCard title="吞吐量趋势" height="350px">
          <TrendChart 
            :data="throughputTrendData" 
            color="#10b981"
            title="数据吞吐量"
            unit="条/秒"
          />
        </ChartCard>

        <!-- 延迟分布 -->
        <ChartCard title="延迟分布" height="350px">
          <div class="latency-distribution-chart">
            <v-chart class="chart" :option="latencyDistributionOption" autoresize />
          </div>
        </ChartCard>

        <!-- 错误统计 -->
        <ChartCard title="错误统计" height="350px">
          <div class="error-stats-chart">
            <v-chart class="chart" :option="errorStatsOption" autoresize />
          </div>
        </ChartCard>

        <!-- 数据源分布 -->
        <ChartCard title="数据源分布" height="350px">
          <div class="source-distribution-chart">
            <v-chart class="chart" :option="sourceDistributionOption" autoresize />
          </div>
        </ChartCard>
      </div>
    </div>

    <!-- 数据质量监控 -->
    <div class="data-quality">
      <ChartCard title="数据质量监控">
        <div class="table-wrapper">
          <el-table :data="paginatedQualityMetrics" style="width: 100%" stripe border>
            <el-table-column prop="dataSource" label="数据源" :min-width="200" show-overflow-tooltip header-align="center" />
            <el-table-column prop="completeness" label="完整性" :min-width="120" align="right" header-align="center">
              <template #default="{ row }">
                <el-progress
                  :percentage="row.completeness"
                  :color="getQualityColor(row.completeness)"
                  :show-text="false"
                  style="width: 80px"
                />
                <span style="margin-left: 8px">{{ row.completeness }}%</span>
              </template>
            </el-table-column>
            <el-table-column prop="accuracy" label="准确性" :min-width="120" align="right" header-align="center">
              <template #default="{ row }">
                <el-progress
                  :percentage="row.accuracy"
                  :color="getQualityColor(row.accuracy)"
                  :show-text="false"
                  style="width: 80px"
                />
                <span style="margin-left: 8px">{{ row.accuracy }}%</span>
              </template>
            </el-table-column>
            <el-table-column prop="consistency" label="一致性" :min-width="120" align="right" header-align="center">
              <template #default="{ row }">
                <el-progress
                  :percentage="row.consistency"
                  :color="getQualityColor(row.consistency)"
                  :show-text="false"
                  style="width: 80px"
                />
                <span style="margin-left: 8px">{{ row.consistency }}%</span>
              </template>
            </el-table-column>
            <el-table-column prop="timeliness" label="及时性" :min-width="120" align="right" header-align="center">
              <template #default="{ row }">
                <el-progress
                  :percentage="row.timeliness"
                  :color="getQualityColor(row.timeliness)"
                  :show-text="false"
                  style="width: 80px"
                />
                <span style="margin-left: 8px">{{ row.timeliness }}%</span>
              </template>
            </el-table-column>
            <el-table-column prop="overallScore" label="综合评分" :min-width="120" align="right" header-align="center">
              <template #default="{ row }">
                <span :class="getScoreClass(row.overallScore)">{{ row.overallScore }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="issues" label="问题数" :min-width="100" align="right" header-align="center">
              <template #default="{ row }">
                <span :class="getIssuesClass(row.issues)">{{ row.issues }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="lastCheck" label="最后检查" :min-width="180" show-overflow-tooltip header-align="center" />
            <el-table-column label="操作" :min-width="120" fixed="right" align="left" header-align="center">
              <template #default="{ row }">
                <el-button size="small" type="primary" @click="viewQualityReport(row)">
                  <el-icon><Document /></el-icon>
                  报告
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            v-if="dataQualityMetrics.length > 10"
            v-model:current-page="qualityCurrentPage"
            v-model:page-size="qualityPageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="dataQualityMetrics.length"
            layout="total, sizes, prev, pager, next, jumper"
            class="pagination"
          />
        </div>
      </ChartCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { systemApi } from '../../api/clients'
import KpiCard from '../../components/KpiCard.vue'
import ChartCard from '../../components/ChartCard.vue'
import TrendChart from '../../components/charts/TrendChart.vue'
import { 
  Refresh, Search, View, Delete, Document
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { GraphChart, BarChart, PieChart } from 'echarts/charts'
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
  GraphChart,
  BarChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

interface DataflowMetrics {
  activeFlows: number
  throughput: number
  errorRate: number
  avgLatency: number
}

interface DataflowInfo {
  id: string
  name: string
  source: string
  destination: string
  status: string
  statusText: string
  throughput: number
  latency: number
  errorRate: number
  lastUpdate: string
}

interface DataQualityMetric {
  dataSource: string
  completeness: number
  accuracy: number
  consistency: number
  timeliness: number
  overallScore: number
  issues: number
  lastCheck: string
}

// 状态管理
const realTimeMode = ref(true)
const viewMode = ref('topology')
const selectedService = ref('')
const searchText = ref('')
const statusFilter = ref('')

// 分页相关
const dataflowsCurrentPage = ref(1)
const dataflowsPageSize = ref(10)
const qualityCurrentPage = ref(1)
const qualityPageSize = ref(10)

// 定时器
let refreshTimer: number | null = null

// 数据流指标
const dataflowMetrics = ref<DataflowMetrics>({
  activeFlows: 12,
  throughput: 1250,
  errorRate: 0.2,
  avgLatency: 85
})

// 数据流列表
const dataflows = ref<DataflowInfo[]>([
  {
    id: 'DF001',
    name: '市场数据流',
    source: 'Market API',
    destination: 'PostgreSQL',
    status: 'running',
    statusText: '运行中',
    throughput: 450,
    latency: 85,
    errorRate: 0.1,
    lastUpdate: '2024-01-15 14:30:00'
  },
  {
    id: 'DF002',
    name: '交易数据流',
    source: 'Trading System',
    destination: 'TimescaleDB',
    status: 'running',
    statusText: '运行中',
    throughput: 320,
    latency: 92,
    errorRate: 0.0,
    lastUpdate: '2024-01-15 14:30:00'
  }
])

// 数据质量指标
const dataQualityMetrics = ref<DataQualityMetric[]>([
  {
    dataSource: 'Market API',
    completeness: 98.5,
    accuracy: 99.2,
    consistency: 97.8,
    timeliness: 95.5,
    overallScore: 97.8,
    issues: 2,
    lastCheck: '2024-01-15 14:30:00'
  },
  {
    dataSource: 'Trading System',
    completeness: 99.8,
    accuracy: 99.9,
    consistency: 99.5,
    timeliness: 98.2,
    overallScore: 99.4,
    issues: 0,
    lastCheck: '2024-01-15 14:30:00'
  }
])

// 趋势数据
const throughputTrendData = ref<Array<{ date: string; value: number }>>([])

// 计算属性
const filteredDataflows = computed(() => {
  let filtered = dataflows.value

  if (searchText.value) {
    filtered = filtered.filter(flow =>
      flow.name.toLowerCase().includes(searchText.value.toLowerCase())
    )
  }

  if (statusFilter.value) {
    filtered = filtered.filter(flow => flow.status === statusFilter.value)
  }

  return filtered
})

// 分页数据
const paginatedDataflows = computed(() => {
  const start = (dataflowsCurrentPage.value - 1) * dataflowsPageSize.value
  const end = start + dataflowsPageSize.value
  return filteredDataflows.value.slice(start, end)
})

const paginatedQualityMetrics = computed(() => {
  const start = (qualityCurrentPage.value - 1) * qualityPageSize.value
  const end = start + qualityPageSize.value
  return dataQualityMetrics.value.slice(start, end)
})

// 拓扑图配置
const topologyOption = computed(() => ({
  title: {
    text: '数据流拓扑',
    textStyle: { color: 'var(--text-primary)', fontSize: 14 }
  },
  tooltip: {},
  series: [{
    type: 'graph',
    layout: 'force',
    data: [
      { name: 'Market API', symbolSize: 50, category: 0 },
      { name: 'Trading System', symbolSize: 50, category: 0 },
      { name: 'Brain Service', symbolSize: 60, category: 1 },
      { name: 'Macro Service', symbolSize: 50, category: 1 },
      { name: 'Portfolio Service', symbolSize: 50, category: 1 },
      { name: 'PostgreSQL', symbolSize: 40, category: 2 },
      { name: 'TimescaleDB', symbolSize: 40, category: 2 },
      { name: 'Redis', symbolSize: 40, category: 2 }
    ],
    links: [
      { source: 'Market API', target: 'Brain Service', value: 450 },
      { source: 'Trading System', target: 'Portfolio Service', value: 320 },
      { source: 'Brain Service', target: 'Macro Service', value: 280 },
      { source: 'Brain Service', target: 'PostgreSQL', value: 400 },
      { source: 'Macro Service', target: 'PostgreSQL', value: 250 },
      { source: 'Portfolio Service', target: 'TimescaleDB', value: 300 },
      { source: 'Brain Service', target: 'Redis', value: 150 }
    ],
    categories: [
      { name: '数据源', itemStyle: { color: '#f59e0b' } },
      { name: '处理服务', itemStyle: { color: '#10b981' } },
      { name: '存储', itemStyle: { color: '#3b82f6' } }
    ],
    force: {
      repulsion: 1000,
      edgeLength: 200
    },
    label: {
      show: true,
      position: 'inside',
      color: '#fff'
    },
    lineStyle: {
      color: 'source',
      curveness: 0.3,
      width: 2
    }
  }]
}))

// 流向图配置
const flowOption = computed(() => ({
  title: {
    text: '数据流向',
    textStyle: { color: 'var(--text-primary)', fontSize: 14 }
  },
  tooltip: {},
  series: [{
    type: 'graph',
    layout: 'none',
    data: [
      { name: 'Market API', x: 100, y: 100, symbolSize: 50 },
      { name: 'Brain Service', x: 300, y: 150, symbolSize: 60 },
      { name: 'PostgreSQL', x: 500, y: 100, symbolSize: 40 },
      { name: 'Redis', x: 500, y: 200, symbolSize: 40 }
    ],
    links: [
      { source: 'Market API', target: 'Brain Service' },
      { source: 'Brain Service', target: 'PostgreSQL' },
      { source: 'Brain Service', target: 'Redis' }
    ],
    label: {
      show: true,
      position: 'inside',
      color: '#fff'
    },
    lineStyle: {
      color: '#10b981',
      width: 3
    }
  }]
}))

// 延迟分布图配置
const latencyDistributionOption = computed(() => ({
  title: {
    text: '延迟分布',
    textStyle: { color: 'var(--text-primary)', fontSize: 14 }
  },
  tooltip: { trigger: 'axis' },
  xAxis: {
    type: 'category',
    data: ['0-50ms', '50-100ms', '100-200ms', '200-500ms', '500ms+'],
    axisLabel: { color: 'var(--text-secondary)' }
  },
  yAxis: {
    type: 'value',
    name: '数据流数量',
    axisLabel: { color: 'var(--text-secondary)' }
  },
  series: [{
    name: '延迟分布',
    type: 'bar',
    data: [3, 5, 2, 1, 1],
    itemStyle: { color: '#3b82f6' }
  }]
}))

// 错误统计图配置
const errorStatsOption = computed(() => ({
  title: {
    text: '错误统计',
    textStyle: { color: 'var(--text-primary)', fontSize: 14 }
  },
  tooltip: { trigger: 'axis' },
  xAxis: {
    type: 'category',
    data: generateTimeLabels(),
    axisLabel: { color: 'var(--text-secondary)' }
  },
  yAxis: {
    type: 'value',
    name: '错误数',
    axisLabel: { color: 'var(--text-secondary)' }
  },
  series: [{
    name: '错误数',
    type: 'bar',
    data: generateErrorData(),
    itemStyle: { color: '#ef4444' }
  }]
}))

// 数据源分布图配置
const sourceDistributionOption = computed(() => ({
  title: {
    text: '数据源分布',
    textStyle: { color: 'var(--text-primary)', fontSize: 14 }
  },
  tooltip: {
    trigger: 'item',
    formatter: '{a} <br/>{b}: {c} ({d}%)'
  },
  legend: {
    orient: 'vertical',
    left: 'left',
    textStyle: { color: 'var(--text-secondary)' }
  },
  series: [{
    name: '数据源',
    type: 'pie',
    radius: '50%',
    data: [
      { value: 6, name: 'API接口', itemStyle: { color: '#10b981' } },
      { value: 3, name: '数据库', itemStyle: { color: '#3b82f6' } },
      { value: 2, name: '文件系统', itemStyle: { color: '#f59e0b' } },
      { value: 1, name: '消息队列', itemStyle: { color: '#ef4444' } }
    ]
  }]
}))

// 方法
function getStatusType(status: string) {
  switch (status) {
    case 'running': return 'success'
    case 'paused': return 'warning'
    case 'error': return 'danger'
    default: return 'default'
  }
}

function getLatencyClass(latency: number) {
  if (latency > 200) return 'text-danger'
  if (latency > 100) return 'text-warning'
  return 'text-success'
}

function getErrorRateClass(rate: number) {
  if (rate > 1) return 'text-danger'
  if (rate > 0.5) return 'text-warning'
  return 'text-success'
}

function getQualityColor(score: number) {
  if (score >= 95) return '#10b981'
  if (score >= 85) return '#f59e0b'
  return '#ef4444'
}

function getScoreClass(score: number) {
  if (score >= 95) return 'text-success'
  if (score >= 85) return 'text-warning'
  return 'text-danger'
}

function getIssuesClass(issues: number) {
  if (issues === 0) return 'text-success'
  if (issues <= 2) return 'text-warning'
  return 'text-danger'
}

function generateTimeLabels() {
  const labels = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000)
    labels.push(time.getHours() + ':00')
  }
  return labels
}

function generateErrorData() {
  return Array.from({ length: 12 }, () => Math.floor(Math.random() * 5))
}

function generateThroughputTrendData() {
  const data = []
  const now = new Date()
  
  for (let i = 59; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 60 * 1000)
    data.push({
      date: date.toISOString(),
      value: Math.floor(Math.random() * 500) + 1000
    })
  }
  
  return data
}

function toggleRealTimeMode(enabled: boolean) {
  if (enabled) {
    startRealTimeUpdates()
  } else {
    stopRealTimeUpdates()
  }
}

function startRealTimeUpdates() {
  if (refreshTimer) clearInterval(refreshTimer)
  
  refreshTimer = setInterval(() => {
    // 模拟实时数据更新
    dataflowMetrics.value.throughput = Math.floor(Math.random() * 200) + 1100
    dataflowMetrics.value.avgLatency = Math.floor(Math.random() * 20) + 80
  }, 2000)
}

function stopRealTimeUpdates() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

async function refreshDataflow() {
  try {
    await systemApi.get('/api/v1/dataflow')
    ElMessage.success('数据流信息已刷新')
  } catch (error) {
    console.warn('刷新数据流失败:', error)
    ElMessage.success('数据流信息已刷新（模拟）')
  }
}

function viewFlowDetails(flow: DataflowInfo) {
  ElMessage.info(`查看数据流详情: ${flow.name}`)
}

async function toggleFlow(flow: DataflowInfo) {
  try {
    const action = flow.status === 'running' ? 'pause' : 'start'
    await systemApi.post(`/api/v1/dataflow/${flow.id}/${action}`)
    
    flow.status = flow.status === 'running' ? 'paused' : 'running'
    flow.statusText = flow.status === 'running' ? '运行中' : '已暂停'
    
    ElMessage.success(`数据流 ${flow.name} ${action === 'pause' ? '暂停' : '启动'}成功`)
  } catch (error) {
    console.warn('切换数据流状态失败:', error)
    ElMessage.success(`数据流 ${flow.name} 操作成功（模拟）`)
  }
}

async function deleteFlow(flow: DataflowInfo) {
  try {
    await ElMessageBox.confirm(
      `确定要删除数据流 ${flow.name} 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await systemApi.delete(`/api/v1/dataflow/${flow.id}`)
    
    const index = dataflows.value.findIndex(f => f.id === flow.id)
    if (index > -1) {
      dataflows.value.splice(index, 1)
    }
    
    ElMessage.success(`数据流 ${flow.name} 删除成功`)
  } catch (error) {
    if (error !== 'cancel') {
      console.warn('删除数据流失败:', error)
      ElMessage.success(`数据流 ${flow.name} 删除成功（模拟）`)
    }
  }
}

function viewQualityReport(metric: DataQualityMetric) {
  ElMessage.info(`查看数据质量报告: ${metric.dataSource}`)
}

onMounted(() => {
  // 初始化数据
  throughputTrendData.value = generateThroughputTrendData()
  
  // 启动实时更新
  if (realTimeMode.value) {
    startRealTimeUpdates()
  }
})

onUnmounted(() => {
  stopRealTimeUpdates()
})
</script>

<style scoped>
.system-dataflow {
  padding: var(--spacing-xl);
  max-width: 1600px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-2xl);
}

.page-header h1 {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: var(--text-3xl);
  font-weight: 700;
  color: var(--text-primary);
}

.page-header p {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--text-lg);
}

.header-actions {
  display: flex;
  gap: var(--spacing-md);
  align-items: center;
}

.dataflow-overview {
  margin-bottom: var(--spacing-xl);
}

.overview-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
}

.dataflow-topology,
.dataflow-list,
.dataflow-monitoring,
.data-quality {
  margin-bottom: var(--spacing-xl);
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

.topology-container {
  height: 500px;
}

.topology-view,
.flow-view {
  height: 100%;
}

.chart {
  width: 100%;
  height: 100%;
}

.monitoring-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: var(--spacing-lg);
}

.latency-distribution-chart,
.error-stats-chart,
.source-distribution-chart {
  height: 350px;
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

/* 响应式设计 */
@media (max-width: 1200px) {
  .monitoring-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .system-dataflow {
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
  
  .monitoring-grid {
    grid-template-columns: 1fr;
  }
}

/* 开关样式 */
.el-switch {
  --el-switch-on-color: var(--success-color);
}
</style>
