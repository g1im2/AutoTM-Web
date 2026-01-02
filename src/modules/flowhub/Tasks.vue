<template>
  <div class="flowhub-tasks">
    <div class="page-header">
      <div class="header-actions">
        <el-button type="primary" @click="$router.push('/flowhub/create')">
          <el-icon><Plus /></el-icon>
          新建任务
        </el-button>
        <el-button @click="refreshTasks">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 任务概览 -->
    <div class="tasks-overview">
      <div class="overview-cards">
        <KpiCard 
          title="总任务数" 
          :value="taskMetrics.totalTasks" 
          subtitle="已创建任务"
        />
        <KpiCard 
          title="运行中任务" 
          :value="taskMetrics.runningTasks" 
          type="success"
          subtitle="正在执行"
        />
        <KpiCard 
          title="今日处理量" 
          :value="taskMetrics.todayProcessed" 
          subtitle="数据条数"
        />
        <KpiCard 
          title="成功率" 
          :value="taskMetrics.successRate" 
          format="percentage"
          :type="taskMetrics.successRate > 95 ? 'success' : 'warning'"
          subtitle="任务执行成功率"
        />
      </div>
    </div>

    <!-- 任务列表 -->
    <div class="tasks-list">
      <ChartCard title="任务列表">
        <template #header>
          <div class="card-header">
            <div class="header-controls">
              <el-input
                v-model="searchText"
                placeholder="搜索任务名称"
                style="width: 300px"
                clearable
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
              <el-select v-model="statusFilter" placeholder="状态筛选" style="width: 150px">
                <el-option label="全部" value="" />
                <el-option
                  v-for="option in statusOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
              <el-select v-model="typeFilter" placeholder="类型筛选" style="width: 180px">
                <el-option label="全部" value="" />
                <el-option
                  v-for="option in dataTypeOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
              <el-select v-model="scheduleFilter" placeholder="调度类型" style="width: 150px">
                <el-option label="全部" value="" />
                <el-option
                  v-for="option in scheduleTypeOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </div>
          </div>
        </template>

        <div class="table-wrapper">
          <el-table :data="paginatedTasks" style="width: 100%" stripe border>
            <el-table-column prop="name" label="任务名称" :min-width="220" show-overflow-tooltip header-align="center" />
            <el-table-column prop="type" label="数据类型" :min-width="typeColumnWidth" header-align="center" class-name="type-cell-column">
              <template #default="{ row }">
                <div class="type-cell">
                  <el-tag :type="getTaskTypeColor(row.type)">{{ row.typeText }}</el-tag>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="scheduleType" label="调度类型" :min-width="120" align="center" header-align="center">
              <template #default="{ row }">
                <el-tag size="small" type="info">{{ row.scheduleTypeText }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" :min-width="100" align="center" header-align="center">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)" size="small">
                  <el-icon class="status-icon">
                    <component :is="getStatusIcon(row.status)" />
                  </el-icon>
                  {{ row.statusText }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="dataSource" label="数据源" :min-width="150" show-overflow-tooltip header-align="center" />
            <el-table-column prop="schedule" label="调度规则" :min-width="180" show-overflow-tooltip header-align="center" />
            <el-table-column prop="nextRun" label="下次运行" :min-width="170" show-overflow-tooltip header-align="center" />
            <el-table-column prop="lastRun" label="最后运行" :min-width="180" show-overflow-tooltip header-align="center" />
            <el-table-column prop="successRate" label="成功率" :min-width="100" align="right" header-align="center">
              <template #default="{ row }">
                <span :class="getSuccessRateClass(row.successRate)">
                  {{ row.successRate.toFixed(1) }}%
                </span>
              </template>
            </el-table-column>
            <el-table-column label="操作" :min-width="250" fixed="right" align="left" header-align="center">
              <template #default="{ row }">
                <div class="actions-cell">
                  <el-button size="small" type="primary" :disabled="row.dataSource !== 'flowhub'" @click="viewTaskDetail(row)">
                    <el-icon><View /></el-icon>
                    详情
                  </el-button>
                  <el-button
                    size="small"
                    :type="row.enabled ? 'danger' : 'success'"
                    :disabled="row.dataSource !== 'flowhub'"
                    @click="toggleTask(row)"
                  >
                    <el-icon v-if="row.enabled"><VideoPause /></el-icon>
                    <el-icon v-else><VideoPlay /></el-icon>
                    {{ row.enabled ? '停用' : '启用' }}
                  </el-button>
                  <el-button size="small" :disabled="row.dataSource !== 'flowhub'" @click="editTask(row)">
                    <el-icon><Edit /></el-icon>
                    编辑
                  </el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            v-if="filteredTasks.length > 10"
            v-model:current-page="tasksCurrentPage"
            v-model:page-size="tasksPageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="filteredTasks.length"
            layout="total, sizes, prev, pager, next, jumper"
            class="pagination"
          />
        </div>
      </ChartCard>
    </div>

    <!-- 任务执行统计 -->
    <div class="task-statistics">
      <div class="stats-grid">
        <!-- 任务类型分布 -->
        <ChartCard title="任务类型分布" height="350px">
          <div class="type-distribution-chart">
            <v-chart v-if="hasTasks" class="chart" :option="typeDistributionOption" autoresize />
            <div v-else class="chart-placeholder">暂无任务数据</div>
          </div>
        </ChartCard>

        <!-- 执行状态统计 -->
        <ChartCard title="执行状态统计" height="350px">
          <div class="status-stats-chart">
            <v-chart v-if="hasTasks" class="chart" :option="statusStatsOption" autoresize />
            <div v-else class="chart-placeholder">暂无执行数据</div>
          </div>
        </ChartCard>

        <!-- 数据处理量趋势 -->
        <ChartCard title="数据处理量趋势" height="350px">
          <div class="trend-chart">
            <TrendChart 
              v-if="hasTrendData"
              :data="processingTrendData" 
              color="#3b82f6"
              title="每日处理量"
              height="350px"
            />
            <div v-else class="chart-placeholder">暂无处理量数据</div>
          </div>
        </ChartCard>

        <!-- 任务执行时间分析 -->
        <ChartCard title="任务执行时间分析" height="350px">
          <div class="execution-time-chart">
            <v-chart v-if="hasDurationData" class="chart" :option="executionTimeOption" autoresize />
            <div v-else class="chart-placeholder">暂无耗时数据</div>
          </div>
        </ChartCard>
      </div>
    </div>

    <!-- 最近执行日志 -->
    <div class="recent-logs">
      <ChartCard title="最近执行日志">
        <template #header>
          <div class="card-header">
            <div class="header-controls">
              <el-select v-model="logLevelFilter" placeholder="日志级别" style="width: 120px">
                <el-option label="全部" value="" />
                <el-option label="信息" value="info" />
                <el-option label="警告" value="warning" />
                <el-option label="错误" value="error" />
              </el-select>
              <el-button size="small" @click="clearLogs">
                <el-icon><Delete /></el-icon>
                清空日志
              </el-button>
            </div>
          </div>
        </template>

        <div class="table-wrapper">
          <el-table :data="paginatedLogs" style="width: 100%" stripe border>
            <el-table-column prop="timestamp" label="时间" :min-width="180" show-overflow-tooltip header-align="center" />
            <el-table-column prop="taskName" label="任务名称" :min-width="200" show-overflow-tooltip header-align="center" />
            <el-table-column prop="level" label="级别" :min-width="80" align="center" header-align="center">
              <template #default="{ row }">
                <el-tag :type="getLogLevelType(row.level)" size="small">{{ row.level }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="message" label="消息" :min-width="300" show-overflow-tooltip header-align="center" />
            <el-table-column prop="duration" label="耗时" :min-width="100" align="right" header-align="center">
              <template #default="{ row }">
                <span v-if="row.duration">{{ formatDuration(row.duration) }}</span>
                <span v-else class="text-muted">--</span>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            v-if="filteredLogs.length > 10"
            v-model:current-page="logsCurrentPage"
            v-model:page-size="logsPageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="filteredLogs.length"
            layout="total, sizes, prev, pager, next, jumper"
            class="pagination"
          />
        </div>
      </ChartCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { flowhubApi } from '../../api/clients'
import KpiCard from '../../components/KpiCard.vue'
import ChartCard from '../../components/ChartCard.vue'
import TrendChart from '../../components/charts/TrendChart.vue'
import {
  Plus, Refresh, Search, View, Edit, VideoPlay, VideoPause, Delete,
  CircleCheck, Warning, CircleClose, Clock
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { PieChart, BarChart, LineChart } from 'echarts/charts'
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
  PieChart,
  BarChart,
  LineChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

const router = useRouter()

const statusOptions = [
  { value: 'queued', label: '排队中' },
  { value: 'running', label: '运行中' },
  { value: 'succeeded', label: '已完成' },
  { value: 'failed', label: '失败' },
  { value: 'idle', label: '未运行' },
  { value: 'disabled', label: '已停用' }
]

const dataTypeOptions = [
  { value: 'daily_ohlc', label: '日线行情' },
  { value: 'daily_basic', label: '日线基础数据' },
  { value: 'batch_daily_ohlc', label: '批量日线行情' },
  { value: 'batch_daily_basic', label: '批量日线基础数据' }
]

const dataTypeLabels = Object.fromEntries(
  dataTypeOptions.map(option => [option.value, option.label])
)

const scheduleTypeOptions = [
  { value: 'manual', label: '即时执行' },
  { value: 'interval', label: '周期执行' },
  { value: 'cron', label: '定时执行' }
]

const scheduleTypeLabels = Object.fromEntries(
  scheduleTypeOptions.map(option => [option.value, option.label])
)

const statusLabels: Record<string, string> = {
  queued: '排队中',
  running: '运行中',
  succeeded: '已完成',
  failed: '失败',
  idle: '未运行',
  disabled: '已停用'
}

interface TaskMetrics {
  totalTasks: number
  runningTasks: number
  todayProcessed: number
  successRate: number
}

interface Task {
  id: string
  name: string
  type: string
  typeText: string
  scheduleType: string
  scheduleTypeText: string
  schedule: string
  status: string
  statusText: string
  dataSource: string
  lastRun: string
  nextRun: string
  successRate: number
  createdAt?: number
  updatedAt?: number
  progress?: number
  enabled: boolean
  runCount?: number
  successCount?: number
  failedCount?: number
}

interface ExecutionLog {
  id: string
  timestamp: string
  taskName: string
  level: string
  message: string
  duration?: number
}

// 状态管理
const searchText = ref('')
const statusFilter = ref('')
const typeFilter = ref('')
const scheduleFilter = ref('')
const logLevelFilter = ref('')

// 分页相关
const tasksCurrentPage = ref(1)
const tasksPageSize = ref(10)
const logsCurrentPage = ref(1)
const logsPageSize = ref(10)

// 任务指标
const taskMetrics = ref<TaskMetrics>({
  totalTasks: 0,
  runningTasks: 0,
  todayProcessed: 0,
  successRate: 0
})

// 任务列表
const tasks = ref<Task[]>([])

// 执行日志（暂无后端端点）
const executionLogs = ref<ExecutionLog[]>([])

// 处理量趋势数据
const processingTrendData = ref<Array<{ date: string; value: number }>>([])

const hasTasks = computed(() => tasks.value.length > 0)
const hasDurationData = computed(() => tasks.value.some(task => task.createdAt && task.updatedAt))
const hasTrendData = computed(() => processingTrendData.value.some(item => item.value > 0))
const typeColumnWidth = computed(() => {
  const maxLength = tasks.value.reduce((max, task) => {
    const length = (task.typeText || task.type || '').length
    return Math.max(max, length)
  }, 0)
  const base = 80
  const perChar = 5
  return Math.min(220, Math.max(140, base + maxLength * perChar))
})

// 计算属性
const filteredTasks = computed(() => {
  let filtered = tasks.value

  if (searchText.value) {
    const search = searchText.value.toLowerCase()
    filtered = filtered.filter(task =>
      task.name.toLowerCase().includes(search)
    )
  }

  if (statusFilter.value) {
    filtered = filtered.filter(task => task.status === statusFilter.value)
  }

  if (typeFilter.value) {
    filtered = filtered.filter(task => task.type === typeFilter.value)
  }

  if (scheduleFilter.value) {
    filtered = filtered.filter(task => task.scheduleType === scheduleFilter.value)
  }

  return filtered
})

const filteredLogs = computed(() => {
  if (!logLevelFilter.value) return executionLogs.value
  return executionLogs.value.filter(log => log.level === logLevelFilter.value)
})

// 分页数据
const paginatedTasks = computed(() => {
  const start = (tasksCurrentPage.value - 1) * tasksPageSize.value
  const end = start + tasksPageSize.value
  return filteredTasks.value.slice(start, end)
})

const paginatedLogs = computed(() => {
  const start = (logsCurrentPage.value - 1) * logsPageSize.value
  const end = start + logsPageSize.value
  return filteredLogs.value.slice(start, end)
})

// 任务类型分布图表配置
const typeDistributionOption = computed(() => {
  const counts = new Map<string, number>()
  tasks.value.forEach((task) => {
    const label = task.typeText || task.type
    counts.set(label, (counts.get(label) || 0) + 1)
  })

  const data = Array.from(counts.entries()).map(([name, value]) => ({ name, value }))
  return {
    title: {
      text: '任务类型分布',
      textStyle: { color: 'var(--text-primary)', fontSize: 14 }
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 8,
      top: 'middle',
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 8,
      textStyle: { color: 'var(--text-secondary)', fontSize: 12 }
    },
    series: [
      {
        name: '任务类型',
        type: 'pie',
        radius: ['40%', '62%'],
        center: ['70%', '52%'],
        avoidLabelOverlap: true,
        label: {
          show: true,
          formatter: '{d}%',
          fontSize: 11,
          color: 'var(--text-secondary)'
        },
        labelLine: {
          length: 8,
          length2: 6,
          lineStyle: { color: 'var(--border-color)' }
        },
        data
      }
    ]
  }
})

// 执行状态统计图表配置
const statusStatsOption = computed(() => {
  const statusCounts = statusOptions.map(option => ({
    label: option.label,
    value: tasks.value.filter(task => task.status === option.value).length
  }))

  return {
    title: {
      text: '执行状态统计',
      textStyle: { color: 'var(--text-primary)', fontSize: 14 }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    xAxis: {
      type: 'category',
      data: statusCounts.map(item => item.label),
      axisLabel: { color: 'var(--text-secondary)' }
    },
    yAxis: {
      type: 'value',
      name: '任务数量',
      axisLabel: { color: 'var(--text-secondary)' }
    },
    series: [
      {
        name: '任务数量',
        type: 'bar',
        data: statusCounts.map(item => item.value),
        itemStyle: {
          color: (params: any) => {
            const colors = ['#f59e0b', '#10b981', '#3b82f6', '#ef4444']
            return colors[params.dataIndex % colors.length]
          }
        }
      }
    ]
  }
})

// 任务执行时间分析图表配置
const executionTimeOption = computed(() => {
  const names: string[] = []
  const durations: number[] = []
  tasks.value.forEach((task) => {
    if (!task.createdAt || !task.updatedAt) return
    const duration = Math.max(0, Math.round(task.updatedAt - task.createdAt))
    names.push(task.name)
    durations.push(duration)
  })

  return {
    title: {
      text: '任务执行时间分析',
      textStyle: { color: 'var(--text-primary)', fontSize: 14 }
    },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: names,
      axisLabel: {
        color: 'var(--text-secondary)',
        rotate: 45
      }
    },
    yAxis: {
      type: 'value',
      name: '执行时间 (秒)',
      axisLabel: { color: 'var(--text-secondary)' }
    },
    series: [
      {
        name: '执行时间',
        type: 'bar',
        data: durations,
        itemStyle: { color: '#8b5cf6' }
      }
    ]
  }
})

function getStatusType(status: string) {
  switch (status) {
    case 'queued': return 'warning'
    case 'running': return 'success'
    case 'failed': return 'danger'
    case 'succeeded': return 'info'
    case 'idle': return 'info'
    case 'disabled': return 'default'
    default: return 'default'
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'queued': return Clock
    case 'running': return CircleCheck
    case 'failed': return CircleClose
    case 'succeeded': return CircleCheck
    case 'idle': return Clock
    case 'disabled': return Clock
    default: return Clock
  }
}

function getLogLevelType(level: string) {
  switch (level) {
    case 'info': return 'success'
    case 'warning': return 'warning'
    case 'error': return 'danger'
    default: return 'default'
  }
}

function formatDuration(durationMs: number) {
  if (!durationMs || durationMs <= 0) return '0s'
  const totalSeconds = Math.floor(durationMs / 1000)
  const seconds = totalSeconds % 60
  const minutesTotal = Math.floor(totalSeconds / 60)
  const minutes = minutesTotal % 60
  const hours = Math.floor(minutesTotal / 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`
  }
  if (minutesTotal > 0) {
    return `${minutesTotal}m ${seconds}s`
  }
  return `${seconds}s`
}

function getTaskTypeColor(type: string) {
  if (type.includes('batch')) return 'warning'
  if (type.includes('daily')) return 'success'
  return 'info'
}

function getSuccessRateClass(rate: number) {
  if (rate >= 95) return 'success-rate-high'
  if (rate >= 90) return 'success-rate-medium'
  return 'success-rate-low'
}

function formatTimestamp(timestamp?: number) {
  if (!timestamp) return '-'
  const date = new Date(timestamp * 1000)
  return date.toLocaleString()
}

function formatDateOnly(timestamp?: number) {
  if (!timestamp) return ''
  const date = new Date(timestamp * 1000)
  return date.toISOString().split('T')[0] || ''
}

function buildTaskName(params: Record<string, any>, dataType: string) {
  const label = dataTypeLabels[dataType] || dataType
  if (params.symbol) {
    return `${label} (${params.symbol})`
  }
  if (Array.isArray(params.symbols) && params.symbols.length) {
    return `${label} (${params.symbols.length} 个标的)`
  }
  return label
}

function deriveSuccessRate(runCount = 0, successCount = 0) {
  if (!runCount) return 0
  return Math.min(100, Math.round((successCount / runCount) * 1000) / 10)
}

function formatInterval(seconds: number) {
  if (!seconds || seconds <= 0) return '-'
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  if (minutes < 60) {
    return remaining ? `${minutes}m ${remaining}s` : `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const minLeft = minutes % 60
  if (remaining) {
    return `${hours}h ${minLeft}m ${remaining}s`
  }
  if (minLeft) {
    return `${hours}h ${minLeft}m`
  }
  return `${hours}h`
}

function formatSchedule(scheduleType: string, scheduleValue: any) {
  if (scheduleType === 'manual') return '即时执行'
  if (scheduleType === 'interval') return `每${formatInterval(Number(scheduleValue || 0))}`
  if (scheduleType === 'cron') return scheduleValue || '-'
  return '-'
}

function buildProcessingTrend(tasksList: Task[]) {
  const counts = new Map<string, number>()
  tasksList.forEach((task) => {
    const date = formatDateOnly(task.updatedAt || task.createdAt)
    if (!date) return
    counts.set(date, (counts.get(date) || 0) + 1)
  })
  const data = []
  const now = new Date()
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const key = date.toISOString().split('T')[0] || ''
    data.push({ date: key, value: counts.get(key) || 0 })
  }
  return data
}

function mapTask(task: any): Task {
  const params = task.params || {}
  const dataType = task.data_type || task.job_type || task.type || params.data_type || 'unknown'
  const scheduleType = task.schedule_type || task.scheduleType || 'manual'
  const scheduleValue = task.schedule_value ?? task.scheduleValue
  const status = task.status || task.last_status || (task.enabled ? 'idle' : 'disabled')
  const createdAt = typeof task.created_at === 'number' ? task.created_at : undefined
  const updatedAt = typeof task.updated_at === 'number' ? task.updated_at : undefined
  const lastRunAt = typeof task.last_run_at === 'number' ? task.last_run_at : undefined
  const nextRunAt = typeof task.next_run_at === 'number' ? task.next_run_at : undefined
  const runCount = Number(task.run_count || 0)
  const successCount = Number(task.success_count || 0)
  return {
    id: task.task_id || task.id || '',
    name: task.name || buildTaskName(params, dataType),
    type: dataType,
    typeText: dataTypeLabels[dataType] || dataType,
    scheduleType,
    scheduleTypeText: scheduleTypeLabels[scheduleType] || scheduleType,
    schedule: formatSchedule(scheduleType, scheduleValue),
    status,
    statusText: statusLabels[status] || status,
    dataSource: task.data_source || task.dataSource || task.source || 'flowhub',
    lastRun: formatTimestamp(lastRunAt || updatedAt),
    nextRun: formatTimestamp(nextRunAt),
    successRate: deriveSuccessRate(runCount, successCount),
    createdAt,
    updatedAt,
    enabled: Boolean(task.enabled),
    runCount,
    successCount,
    failedCount: Number(task.failed_count || 0)
  }
}

async function refreshTasks() {
  try {
    const resp = await flowhubApi.get('/api/v1/tasks/overview', { params: { limit: 200, offset: 0 } })
    const payload = resp.data?.data || resp.data || {}
    const taskList = payload.tasks || payload || []
    tasks.value = Array.isArray(taskList) ? taskList.map(mapTask) : []

    const total = tasks.value.length
    const running = tasks.value.filter(task => task.status === 'running').length
    const succeeded = tasks.value.filter(task => task.status === 'succeeded').length
    const todayProcessed = 0

    taskMetrics.value = {
      totalTasks: total,
      runningTasks: running,
      todayProcessed,
      successRate: total ? Math.round((succeeded / total) * 1000) / 10 : 0
    }

    processingTrendData.value = buildProcessingTrend(tasks.value)
    try {
      const logsResp = await flowhubApi.get('/api/v1/flowhub/jobs/recent-logs', {
        params: { limit: 50, offset: 0 }
      })
      const logsPayload = logsResp.data?.data || {}
      const logs = Array.isArray(logsPayload.logs) ? logsPayload.logs : []
      executionLogs.value = logs.map((item: any) => ({
        id: item.id || item.job_id || `${item.timestamp}-${item.task_name}`,
        timestamp: item.timestamp || '-',
        taskName: item.task_name || '-',
        level: item.level || 'info',
        message: item.message || '-',
        duration: typeof item.duration === 'number' ? item.duration : undefined
      }))
    } catch (error) {
      console.warn('获取最近执行日志失败:', error)
      executionLogs.value = []
    }
    ElMessage.success('任务列表已刷新')
  } catch (error) {
    console.warn('刷新任务失败:', error)
    ElMessage.error('任务列表刷新失败')
  }
}

function viewTaskDetail(task: Task) {
  if (task.dataSource !== 'flowhub') {
    ElMessage.info('仅支持查看 Flowhub 任务详情')
    return
  }
  router.push(`/flowhub/detail/${task.id}`)
}

function editTask(task: Task) {
  if (task.dataSource !== 'flowhub') {
    ElMessage.info('仅支持编辑 Flowhub 任务')
    return
  }
  router.push(`/flowhub/create?id=${task.id}`)
}

async function toggleTask(task: Task) {
  if (task.dataSource !== 'flowhub') {
    ElMessage.info('仅支持操作 Flowhub 任务')
    return
  }
  const action = task.enabled ? 'disable' : 'enable'

  try {
    await ElMessageBox.confirm(
      `确定要${action === 'enable' ? '启用' : '停用'}任务 "${task.name}" 吗？`,
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await flowhubApi.post(`/api/v1/flowhub/tasks/${task.id}/${action}`)

    await refreshTasks()
    ElMessage.success(`任务已${action === 'enable' ? '启用' : '停用'}`)
  } catch (error) {
    if (error !== 'cancel') {
      console.warn(`${action}任务失败:`, error)
      ElMessage.error(`任务${action === 'enable' ? '启用' : '停用'}失败`)
    }
  }
}

function clearLogs() {
  executionLogs.value = []
  ElMessage.success('日志已清空')
}

onMounted(() => {
  refreshTasks()
})
</script>

<style scoped>
.flowhub-tasks {
  padding: var(--spacing-xl);
  max-width: 1600px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--section-gap-lg);
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

.tasks-overview {
  margin-bottom: var(--spacing-xl);
}

.overview-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
}

.tasks-list {
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

.task-statistics {
  margin-bottom: var(--spacing-xl);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--spacing-lg);
}

.stats-grid :deep(.chart-card) {
  min-height: 360px;
}

.type-distribution-chart,
.status-stats-chart,
.execution-time-chart {
  height: 350px;
}

.type-distribution-chart {
  padding: 8px 4px;
}

.trend-chart {
  height: 350px;
}

.chart-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-muted);
  font-size: var(--text-sm);
  background: var(--surface-bg);
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-md);
}

.chart {
  width: 100%;
  height: 100%;
}

.recent-logs {
  margin-bottom: var(--spacing-xl);
}

.status-icon {
  margin-right: var(--spacing-xs);
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

/* 响应式设计 */
@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .flowhub-tasks {
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
    flex-direction: column;
    align-items: stretch;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }
}

.table-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.type-cell {
  display: flex;
  align-items: center;
  padding: 0 var(--spacing-xs);
  white-space: normal;
}

.type-cell-column :deep(.cell) {
  white-space: normal;
  word-break: break-word;
  overflow: visible;
}

.type-cell :deep(.el-tag) {
  max-width: 100%;
  white-space: normal;
  height: auto;
  line-height: 1.2;
  padding-top: 4px;
  padding-bottom: 4px;
}

.actions-cell {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  justify-content: space-between;
  padding: 0 var(--spacing-xs);
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
