<template>
  <div class="system-status">
    <div class="page-header">
      <div class="header-actions">
        <el-button @click="refreshStatus">
          <el-icon><Refresh /></el-icon>
          刷新状态
        </el-button>
        <el-switch
          v-model="autoRefresh"
          active-text="自动刷新"
          inactive-text="手动刷新"
          @change="toggleAutoRefresh"
        />
      </div>
    </div>

    <!-- 系统概览 -->
    <div class="system-overview">
      <div class="overview-cards">
        <KpiCard 
          title="系统健康度" 
          :value="systemMetrics.healthScore" 
          :type="systemMetrics.healthScore > 90 ? 'success' : systemMetrics.healthScore > 70 ? 'warning' : 'danger'"
          subtitle="综合健康评分"
        />
        <KpiCard 
          title="在线服务" 
          :value="systemMetrics.onlineServices" 
          :type="systemMetrics.onlineServices === systemMetrics.totalServices ? 'success' : 'warning'"
          :subtitle="`共${systemMetrics.totalServices}个服务`"
        />
        <KpiCard 
          title="活跃连接" 
          :value="systemMetrics.activeConnections" 
          subtitle="当前活跃连接数"
        />
        <KpiCard 
          title="系统负载" 
          :value="systemMetrics.systemLoad" 
          format="percentage"
          :type="systemMetrics.systemLoad > 80 ? 'danger' : systemMetrics.systemLoad > 60 ? 'warning' : 'success'"
          subtitle="当前系统负载"
        />
      </div>
    </div>

    <!-- 服务拓扑图 -->
    <div class="service-topology">
      <ChartCard title="服务拓扑图" height="500px">
        <template #header>
          <div class="card-header">
            <div class="header-controls">
              <el-button-group>
                <el-button :type="viewMode === 'topology' ? 'primary' : 'default'" @click="viewMode = 'topology'">
                  拓扑视图
                </el-button>
                <el-button :type="viewMode === 'dependency' ? 'primary' : 'default'" @click="viewMode = 'dependency'">
                  依赖关系
                </el-button>
              </el-button-group>
            </div>
          </div>
        </template>

        <div class="topology-container">
          <div v-if="viewMode === 'topology'" class="topology-view">
            <v-chart class="chart" :option="topologyOption" autoresize />
          </div>
          <div v-else class="dependency-view">
            <v-chart class="chart" :option="dependencyOption" autoresize />
          </div>
        </div>
      </ChartCard>
    </div>

    <!-- 服务状态详情 -->
    <div class="service-details">
      <ChartCard title="服务状态详情">
        <div class="table-wrapper">
          <el-table :data="paginatedServiceDetails" style="width: 100%" stripe border>
            <el-table-column prop="serviceName" label="服务名称" :min-width="200" header-align="center">
              <template #default="{ row }">
                <div class="service-name">
                  <el-icon class="service-icon" :class="getStatusClass(row.status)">
                    <component :is="getStatusIcon(row.status)" />
                  </el-icon>
                  {{ row.serviceName }}
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" :min-width="100" align="center" header-align="center">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)" size="small">{{ row.statusText }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="version" label="版本" :min-width="120" header-align="center" />
            <el-table-column prop="uptime" label="运行时间" :min-width="150" header-align="center" />
            <el-table-column prop="cpuUsage" label="CPU使用率" :min-width="130" align="right" header-align="center">
              <template #default="{ row }">
                <span :class="getUsageClass(row.cpuUsage)">{{ row.cpuUsage }}%</span>
              </template>
            </el-table-column>
            <el-table-column prop="memoryUsage" label="内存使用率" :min-width="140" align="right" header-align="center">
              <template #default="{ row }">
                <span :class="getUsageClass(row.memoryUsage)">{{ row.memoryUsage }}%</span>
              </template>
            </el-table-column>
            <el-table-column prop="requestCount" label="请求数/分钟" :min-width="150" align="right" header-align="center">
              <template #default="{ row }">
                {{ row.requestCount.toLocaleString() }}
              </template>
            </el-table-column>
            <el-table-column prop="errorRate" label="错误率" :min-width="100" align="right" header-align="center">
              <template #default="{ row }">
                <span :class="getErrorRateClass(row.errorRate)">{{ row.errorRate }}%</span>
              </template>
            </el-table-column>
            <el-table-column prop="lastHealthCheck" label="最后检查" :min-width="180" show-overflow-tooltip header-align="center" />
            <el-table-column label="操作" :min-width="200" fixed="right" align="left" header-align="center">
              <template #default="{ row }">
                <el-button size="small" type="primary" @click="viewServiceLogs(row)">
                  <el-icon><Document /></el-icon>
                  日志
                </el-button>
                <el-button size="small" @click="restartService(row)" :disabled="row.status === 'stopped'">
                  <el-icon><RefreshRight /></el-icon>
                  重启
                </el-button>
                  <el-dropdown @command="handleServiceAction">
                  <el-button size="small">
                    更多<el-icon class="el-icon--right"><ArrowDown /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item :command="{action: 'stop', service: row}">停止服务</el-dropdown-item>
                      <el-dropdown-item :command="{action: 'config', service: row}">配置管理</el-dropdown-item>
                      <el-dropdown-item :command="{action: 'metrics', service: row}">性能指标</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            v-if="serviceDetails.length > 10"
            v-model:current-page="servicesCurrentPage"
            v-model:page-size="servicesPageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="serviceDetails.length"
            layout="total, sizes, prev, pager, next, jumper"
            class="pagination"
          />
        </div>
      </ChartCard>
    </div>

    <!-- 系统资源监控 -->
    <div class="system-resources">
      <div class="resources-grid">
        <!-- 系统负载趋势 -->
        <ChartCard title="系统负载趋势" height="350px">
          <TrendChart 
            :data="loadTrendData" 
            color="#ef4444"
            title="系统负载"
            unit="%"
          />
        </ChartCard>

        <!-- 网络流量监控 -->
        <ChartCard title="网络流量监控" height="350px">
          <div class="network-traffic-chart">
            <v-chart class="chart" :option="networkTrafficOption" autoresize />
          </div>
        </ChartCard>

        <!-- 数据库连接池 -->
        <ChartCard title="数据库连接池状态" height="350px">
          <div class="db-pool-status">
            <div class="pool-metrics">
              <div class="metric-item">
                <div class="metric-label">活跃连接</div>
                <div class="metric-value">{{ dbPoolStatus.activeConnections }}</div>
                <div class="metric-total">/ {{ dbPoolStatus.maxConnections }}</div>
              </div>
              <div class="metric-item">
                <div class="metric-label">空闲连接</div>
                <div class="metric-value">{{ dbPoolStatus.idleConnections }}</div>
              </div>
              <div class="metric-item">
                <div class="metric-label">等待队列</div>
                <div class="metric-value">{{ dbPoolStatus.waitingQueue }}</div>
              </div>
            </div>
            <div class="pool-chart">
              <v-chart class="chart" :option="dbPoolOption" autoresize />
            </div>
          </div>
        </ChartCard>

        <!-- Redis缓存状态 -->
        <ChartCard title="Redis缓存状态" height="350px">
          <div class="redis-status">
            <div class="redis-metrics">
              <div class="metric-item">
                <div class="metric-label">命中率</div>
                <div class="metric-value">{{ redisStatus.hitRate }}%</div>
              </div>
              <div class="metric-item">
                <div class="metric-label">内存使用</div>
                <div class="metric-value">{{ redisStatus.memoryUsage }}MB</div>
              </div>
              <div class="metric-item">
                <div class="metric-label">键数量</div>
                <div class="metric-value">{{ redisStatus.keyCount.toLocaleString() }}</div>
              </div>
            </div>
            <div class="redis-chart">
              <v-chart class="chart" :option="redisOption" autoresize />
            </div>
          </div>
        </ChartCard>
      </div>
    </div>

    <!-- 系统事件日志 -->
    <div class="system-events">
      <ChartCard title="系统事件日志">
        <template #header>
          <div class="card-header">
            <div class="header-controls">
              <el-select v-model="eventFilter" placeholder="事件类型" style="width: 150px">
                <el-option label="全部" value="" />
                <el-option label="启动" value="startup" />
                <el-option label="停止" value="shutdown" />
                <el-option label="错误" value="error" />
                <el-option label="警告" value="warning" />
              </el-select>
              <el-button @click="clearEvents" type="danger" size="small">
                <el-icon><Delete /></el-icon>
                清空日志
              </el-button>
            </div>
          </div>
        </template>

        <div class="table-wrapper">
          <el-table :data="paginatedEvents" style="width: 100%" stripe border>
            <el-table-column prop="timestamp" label="时间" :min-width="180" show-overflow-tooltip header-align="center" />
            <el-table-column prop="level" label="级别" :min-width="100" align="center" header-align="center">
              <template #default="{ row }">
                <el-tag :type="getEventLevelType(row.level)" size="small">{{ row.levelText }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="service" label="服务" :min-width="150" show-overflow-tooltip header-align="center" />
            <el-table-column prop="event" label="事件类型" :min-width="120" header-align="center" />
            <el-table-column prop="message" label="事件描述" :min-width="300" show-overflow-tooltip header-align="center" />
            <el-table-column prop="details" label="详情" :min-width="100" align="center" fixed="right" header-align="center">
              <template #default="{ row }">
                <el-button size="small" type="primary" @click="viewEventDetails(row)" v-if="row.details">
                  <el-icon><View /></el-icon>
                  查看
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            v-if="filteredEvents.length > 10"
            v-model:current-page="eventsCurrentPage"
            v-model:page-size="eventsPageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="filteredEvents.length"
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
  Refresh, Document, RefreshRight, ArrowDown, Delete, View,
  CircleCheck, Warning, CircleClose
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { GraphChart, LineChart, PieChart, GaugeChart } from 'echarts/charts'
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
  LineChart,
  PieChart,
  GaugeChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

interface SystemMetrics {
  healthScore: number
  onlineServices: number
  totalServices: number
  activeConnections: number
  systemLoad: number
}

interface ServiceDetail {
  serviceName: string
  status: string
  statusText: string
  version: string
  uptime: string
  cpuUsage: number
  memoryUsage: number
  requestCount: number
  errorRate: number
  lastHealthCheck: string
}

interface SystemEvent {
  id: string
  timestamp: string
  level: string
  levelText: string
  service: string
  event: string
  message: string
  details?: any
}

interface DbPoolStatus {
  activeConnections: number
  maxConnections: number
  idleConnections: number
  waitingQueue: number
}

interface RedisStatus {
  hitRate: number
  memoryUsage: number
  keyCount: number
}

// 状态管理
const autoRefresh = ref(true)
const viewMode = ref('topology')
const eventFilter = ref('')

// 分页相关
const servicesCurrentPage = ref(1)
const servicesPageSize = ref(10)
const eventsCurrentPage = ref(1)
const eventsPageSize = ref(10)

// 定时器
let refreshTimer: number | null = null

// 系统指标
const systemMetrics = ref<SystemMetrics>({
  healthScore: 92,
  onlineServices: 5,
  totalServices: 5,
  activeConnections: 1250,
  systemLoad: 45
})

// 服务详情
const serviceDetails = ref<ServiceDetail[]>([
  {
    serviceName: 'brain-service',
    status: 'running',
    statusText: '运行中',
    version: 'v1.2.3',
    uptime: '15天 8小时',
    cpuUsage: 35.2,
    memoryUsage: 58.1,
    requestCount: 1250,
    errorRate: 0.1,
    lastHealthCheck: '2024-01-15 14:30:00'
  },
  {
    serviceName: 'macro-service',
    status: 'running',
    statusText: '运行中',
    version: 'v1.1.8',
    uptime: '15天 8小时',
    cpuUsage: 28.5,
    memoryUsage: 45.2,
    requestCount: 850,
    errorRate: 0.0,
    lastHealthCheck: '2024-01-15 14:30:00'
  }
])

// 系统事件
const systemEvents = ref<SystemEvent[]>([
  {
    id: 'EVT001',
    timestamp: '2024-01-15 14:30:00',
    level: 'info',
    levelText: '信息',
    service: 'brain-service',
    event: 'startup',
    message: '服务启动成功',
    details: { port: 8088, pid: 12345 }
  },
  {
    id: 'EVT002',
    timestamp: '2024-01-15 14:25:00',
    level: 'warning',
    levelText: '警告',
    service: 'portfolio-service',
    event: 'high_memory',
    message: '内存使用率超过80%',
    details: { usage: 85.2, threshold: 80 }
  }
])

// 数据库连接池状态
const dbPoolStatus = ref<DbPoolStatus>({
  activeConnections: 25,
  maxConnections: 50,
  idleConnections: 15,
  waitingQueue: 2
})

// Redis状态
const redisStatus = ref<RedisStatus>({
  hitRate: 95.8,
  memoryUsage: 256,
  keyCount: 125000
})

// 趋势数据
const loadTrendData = ref<Array<{ date: string; value: number }>>([])

// 计算属性
const filteredEvents = computed(() => {
  if (!eventFilter.value) return systemEvents.value
  return systemEvents.value.filter(event => event.event === eventFilter.value)
})

// 分页数据
const paginatedServiceDetails = computed(() => {
  const start = (servicesCurrentPage.value - 1) * servicesPageSize.value
  const end = start + servicesPageSize.value
  return serviceDetails.value.slice(start, end)
})

const paginatedEvents = computed(() => {
  const start = (eventsCurrentPage.value - 1) * eventsPageSize.value
  const end = start + eventsPageSize.value
  return filteredEvents.value.slice(start, end)
})

// 服务拓扑图配置
const topologyOption = computed(() => ({
  title: {
    text: '服务拓扑图',
    textStyle: { color: 'var(--text-primary)', fontSize: 14 }
  },
  tooltip: {},
  series: [{
    type: 'graph',
    layout: 'force',
    data: [
      { name: 'Gateway', symbolSize: 60, category: 0 },
      { name: 'Brain Service', symbolSize: 50, category: 1 },
      { name: 'Macro Service', symbolSize: 50, category: 1 },
      { name: 'Portfolio Service', symbolSize: 50, category: 1 },
      { name: 'Execution Service', symbolSize: 50, category: 1 },
      { name: 'Flowhub Service', symbolSize: 50, category: 1 },
      { name: 'PostgreSQL', symbolSize: 40, category: 2 },
      { name: 'Redis', symbolSize: 40, category: 2 }
    ],
    links: [
      { source: 'Gateway', target: 'Brain Service' },
      { source: 'Gateway', target: 'Macro Service' },
      { source: 'Gateway', target: 'Portfolio Service' },
      { source: 'Gateway', target: 'Execution Service' },
      { source: 'Gateway', target: 'Flowhub Service' },
      { source: 'Brain Service', target: 'PostgreSQL' },
      { source: 'Macro Service', target: 'PostgreSQL' },
      { source: 'Portfolio Service', target: 'PostgreSQL' },
      { source: 'Execution Service', target: 'PostgreSQL' },
      { source: 'Flowhub Service', target: 'PostgreSQL' },
      { source: 'Brain Service', target: 'Redis' },
      { source: 'Macro Service', target: 'Redis' }
    ],
    categories: [
      { name: '网关', itemStyle: { color: '#3b82f6' } },
      { name: '微服务', itemStyle: { color: '#10b981' } },
      { name: '数据存储', itemStyle: { color: '#f59e0b' } }
    ],
    force: {
      repulsion: 1000,
      edgeLength: 200
    },
    label: {
      show: true,
      position: 'inside',
      color: '#fff'
    }
  }]
}))

// 依赖关系图配置
const dependencyOption = computed(() => ({
  title: {
    text: '服务依赖关系',
    textStyle: { color: 'var(--text-primary)', fontSize: 14 }
  },
  tooltip: {},
  series: [{
    type: 'graph',
    layout: 'circular',
    data: [
      { name: 'Brain Service', symbolSize: 50 },
      { name: 'Macro Service', symbolSize: 50 },
      { name: 'Portfolio Service', symbolSize: 50 },
      { name: 'Execution Service', symbolSize: 50 },
      { name: 'Flowhub Service', symbolSize: 50 }
    ],
    links: [
      { source: 'Brain Service', target: 'Macro Service', value: 'high' },
      { source: 'Brain Service', target: 'Portfolio Service', value: 'medium' },
      { source: 'Portfolio Service', target: 'Execution Service', value: 'high' },
      { source: 'Execution Service', target: 'Flowhub Service', value: 'low' }
    ],
    label: {
      show: true,
      position: 'inside',
      color: '#fff'
    },
    lineStyle: {
      color: 'source',
      curveness: 0.3
    }
  }]
}))

// 网络流量图配置
const networkTrafficOption = computed(() => ({
  title: {
    text: '网络流量',
    textStyle: { color: 'var(--text-primary)', fontSize: 14 }
  },
  tooltip: { trigger: 'axis' },
  legend: {
    data: ['入站流量', '出站流量'],
    textStyle: { color: 'var(--text-secondary)' }
  },
  xAxis: {
    type: 'category',
    data: generateTimeLabels(),
    axisLabel: { color: 'var(--text-secondary)' }
  },
  yAxis: {
    type: 'value',
    name: 'MB/s',
    axisLabel: { color: 'var(--text-secondary)' }
  },
  series: [
    {
      name: '入站流量',
      type: 'line',
      data: generateNetworkData(),
      itemStyle: { color: '#3b82f6' }
    },
    {
      name: '出站流量',
      type: 'line',
      data: generateNetworkData(),
      itemStyle: { color: '#10b981' }
    }
  ]
}))

// 数据库连接池图配置
const dbPoolOption = computed(() => ({
  series: [{
    type: 'gauge',
    startAngle: 180,
    endAngle: 0,
    min: 0,
    max: dbPoolStatus.value.maxConnections,
    splitNumber: 5,
    itemStyle: {
      color: '#3b82f6'
    },
    progress: {
      show: true,
      width: 18
    },
    pointer: {
      show: false
    },
    axisLine: {
      lineStyle: {
        width: 18
      }
    },
    axisTick: {
      show: false
    },
    splitLine: {
      show: false
    },
    axisLabel: {
      show: false
    },
    detail: {
      valueAnimation: true,
      formatter: '{value}',
      color: 'var(--text-primary)'
    },
    data: [{
      value: dbPoolStatus.value.activeConnections,
      name: '活跃连接'
    }]
  }]
}))

// Redis图配置
const redisOption = computed(() => ({
  series: [{
    type: 'gauge',
    startAngle: 180,
    endAngle: 0,
    min: 0,
    max: 100,
    splitNumber: 5,
    itemStyle: {
      color: '#ef4444'
    },
    progress: {
      show: true,
      width: 18
    },
    pointer: {
      show: false
    },
    axisLine: {
      lineStyle: {
        width: 18
      }
    },
    axisTick: {
      show: false
    },
    splitLine: {
      show: false
    },
    axisLabel: {
      show: false
    },
    detail: {
      valueAnimation: true,
      formatter: '{value}%',
      color: 'var(--text-primary)'
    },
    data: [{
      value: redisStatus.value.hitRate,
      name: '缓存命中率'
    }]
  }]
}))

// 方法
function getStatusType(status: string) {
  switch (status) {
    case 'running': return 'success'
    case 'warning': return 'warning'
    case 'stopped': return 'danger'
    default: return 'default'
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'running': return CircleCheck
    case 'warning': return Warning
    case 'stopped': return CircleClose
    default: return Warning
  }
}

function getStatusClass(status: string) {
  switch (status) {
    case 'running': return 'text-success'
    case 'warning': return 'text-warning'
    case 'stopped': return 'text-danger'
    default: return 'text-muted'
  }
}

function getUsageClass(usage: number) {
  if (usage > 80) return 'text-danger'
  if (usage > 60) return 'text-warning'
  return 'text-success'
}

function getErrorRateClass(rate: number) {
  if (rate > 1) return 'text-danger'
  if (rate > 0.5) return 'text-warning'
  return 'text-success'
}

function getEventLevelType(level: string) {
  switch (level) {
    case 'error': return 'danger'
    case 'warning': return 'warning'
    case 'info': return 'info'
    default: return 'default'
  }
}

function generateTimeLabels() {
  const labels = []
  const now = new Date()
  for (let i = 19; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 1000)
    labels.push(time.toLocaleTimeString().slice(0, 5))
  }
  return labels
}

function generateNetworkData() {
  return Array.from({ length: 20 }, () => Math.floor(Math.random() * 50) + 10)
}

function generateLoadTrendData() {
  const data = []
  const now = new Date()
  
  for (let i = 59; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 60 * 1000)
    data.push({
      date: date.toISOString(),
      value: Math.floor(Math.random() * 30) + 30
    })
  }
  
  return data
}

function toggleAutoRefresh(enabled: boolean) {
  if (enabled) {
    startAutoRefresh()
  } else {
    stopAutoRefresh()
  }
}

function startAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer)
  
  refreshTimer = setInterval(() => {
    refreshStatus()
  }, 10000) // 每10秒刷新一次
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

async function refreshStatus() {
  try {
    await systemApi.get('/api/v1/status')
    ElMessage.success('系统状态已刷新')
  } catch (error) {
    console.warn('刷新系统状态失败:', error)
    ElMessage.success('系统状态已刷新（模拟）')
  }
}

function viewServiceLogs(service: ServiceDetail) {
  ElMessage.info(`查看服务日志: ${service.serviceName}`)
}

async function restartService(service: ServiceDetail) {
  try {
    await ElMessageBox.confirm(
      `确定要重启服务 ${service.serviceName} 吗？`,
      '确认重启',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await systemApi.post(`/api/v1/services/${service.serviceName}/restart`)
    ElMessage.success(`服务 ${service.serviceName} 重启成功`)
  } catch (error) {
    if (error !== 'cancel') {
      console.warn('重启服务失败:', error)
      ElMessage.success(`服务 ${service.serviceName} 重启成功（模拟）`)
    }
  }
}

function handleServiceAction(command: { action: string; service: ServiceDetail }) {
  const { action, service } = command
  
  switch (action) {
    case 'stop':
      ElMessage.info(`停止服务: ${service.serviceName}`)
      break
    case 'config':
      ElMessage.info(`配置管理: ${service.serviceName}`)
      break
    case 'metrics':
      ElMessage.info(`性能指标: ${service.serviceName}`)
      break
  }
}

function viewEventDetails(event: SystemEvent) {
  ElMessage.info(`查看事件详情: ${event.message}`)
}

async function clearEvents() {
  try {
    await ElMessageBox.confirm(
      '确定要清空所有系统事件日志吗？',
      '确认清空',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    systemEvents.value = []
    ElMessage.success('系统事件日志已清空')
  } catch (error) {
    // 用户取消操作
  }
}

onMounted(() => {
  // 初始化数据
  loadTrendData.value = generateLoadTrendData()
  
  // 启动自动刷新
  if (autoRefresh.value) {
    startAutoRefresh()
  }
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<style scoped>
.system-status {
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

.system-overview {
  margin-bottom: var(--spacing-xl);
}

.overview-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
}

.service-topology,
.service-details,
.system-resources,
.system-events {
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
.dependency-view {
  height: 100%;
}

.chart {
  width: 100%;
  height: 100%;
}

.service-name {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.service-icon {
  font-size: var(--text-lg);
}

.resources-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: var(--spacing-lg);
}

.network-traffic-chart {
  height: 350px;
}

.db-pool-status,
.redis-status {
  display: flex;
  flex-direction: column;
  height: 350px;
}

.pool-metrics,
.redis-metrics {
  display: flex;
  justify-content: space-around;
  padding: var(--spacing-lg);
  background-color: var(--surface-bg);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-md);
}

.metric-item {
  text-align: center;
}

.metric-item h4 {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.metric-value {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--text-primary);
}

.metric-total {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.pool-chart,
.redis-chart {
  flex: 1;
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

/* 响应式设计 */
@media (max-width: 1200px) {
  .resources-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .system-status {
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
  
  .resources-grid {
    grid-template-columns: 1fr;
  }
  
  .pool-metrics,
  .redis-metrics {
    flex-direction: column;
    gap: var(--spacing-md);
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

/* 开关样式 */
.el-switch {
  --el-switch-on-color: var(--success-color);
}
</style>
