<template>
  <div class="flowhub-detail">
    <div class="page-header">
      <div class="header-left">
        <div class="task-meta">
          <el-tag :type="getStatusType(taskDetail.status)" size="large">
            <el-icon class="status-icon">
              <component :is="getStatusIcon(taskDetail.status)" />
            </el-icon>
            {{ taskDetail.statusText }}
          </el-tag>
          <el-tag :type="getTaskTypeColor(taskDetail.type)">{{ taskDetail.typeText }}</el-tag>
          <span class="meta-text">创建时间：{{ taskDetail.createdAt }}</span>
          <span class="meta-text">最后运行：{{ taskDetail.lastRun }}</span>
        </div>
      </div>
      <div class="header-actions">
        <el-button @click="$router.back()">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <el-button @click="editTask">
          <el-icon><Edit /></el-icon>
          编辑
        </el-button>
        <el-button 
          :type="taskDetail.status === 'disabled' ? 'success' : 'danger'"
          @click="toggleTask"
        >
          <el-icon v-if="taskDetail.status === 'disabled'"><VideoPlay /></el-icon>
          <el-icon v-else><VideoPause /></el-icon>
          {{ taskDetail.status === 'disabled' ? '启用任务' : '停用任务' }}
        </el-button>
        <el-button type="primary" @click="runTaskNow">
          <el-icon><CaretRight /></el-icon>
          立即执行
        </el-button>
      </div>
    </div>

    <!-- 任务概览 -->
    <div class="task-overview">
      <div class="overview-cards">
        <KpiCard 
          title="总执行次数" 
          :value="taskMetrics.totalRuns" 
          subtitle="历史执行次数"
        />
        <KpiCard 
          title="成功率" 
          :value="taskMetrics.successRate" 
          format="percentage"
          :type="taskMetrics.successRate > 95 ? 'success' : 'warning'"
          subtitle="执行成功率"
        />
        <KpiCard 
          title="平均耗时" 
          :value="taskMetrics.avgDuration" 
          subtitle="秒"
        />
        <KpiCard 
          title="处理数据量" 
          :value="taskMetrics.totalProcessed" 
          subtitle="总条数"
        />
      </div>
    </div>

    <!-- 任务配置和统计 -->
    <div class="task-content">
      <el-row :gutter="24">
        <!-- 左侧：任务配置 -->
        <el-col :span="12">
          <ChartCard title="任务配置">
            <div class="config-section">
              <el-descriptions :column="1" border>
                <el-descriptions-item label="任务名称">{{ taskDetail.name }}</el-descriptions-item>
                <el-descriptions-item label="任务类型">{{ taskDetail.typeText }}</el-descriptions-item>
                <el-descriptions-item label="调度类型">{{ taskDetail.scheduleTypeText }}</el-descriptions-item>
                <el-descriptions-item label="数据源">{{ taskDetail.dataSource }}</el-descriptions-item>
                <el-descriptions-item label="目标存储">{{ taskDetail.targetStorage }}</el-descriptions-item>
                <el-descriptions-item label="调度规则">{{ taskDetail.schedule }}</el-descriptions-item>
                <el-descriptions-item label="下次运行">{{ taskDetail.nextRun }}</el-descriptions-item>
              </el-descriptions>
            </div>

            <div class="config-section">
              <el-descriptions :column="2" border>
                <el-descriptions-item label="进度">
                  {{ taskDetail.sourceConfig.progress ?? '-' }}%
                </el-descriptions-item>
                <el-descriptions-item label="错误信息">
                  {{ taskDetail.sourceConfig.error || '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="超时时间">
                  {{ taskDetail.timeout ? `${taskDetail.timeout}秒` : '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="重试次数">
                  {{ taskDetail.retryCount ? `${taskDetail.retryCount}次` : '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="并发数">
                  {{ taskDetail.concurrency || '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="失败处理">
                  {{ taskDetail.failureHandling.length ? taskDetail.failureHandling.join(', ') : '-' }}
                </el-descriptions-item>
              </el-descriptions>
            </div>

            <div class="config-section">
              <div class="source-config">
                <pre>{{ JSON.stringify(taskDetail.sourceConfig, null, 2) }}</pre>
              </div>
            </div>
          </ChartCard>
        </el-col>

        <!-- 右侧：执行统计 -->
        <el-col :span="12">
          <ChartCard title="执行统计" height="600px">
            <div class="stats-content">
              <!-- 执行状态分布 -->
              <div class="stat-item">
                <h4>执行状态分布</h4>
                <div class="status-distribution">
                  <v-chart class="chart" :option="statusDistributionOption" autoresize />
                </div>
              </div>

              <!-- 执行时间趋势 -->
              <div class="stat-item">
                <h4>执行时间趋势</h4>
                <div class="duration-trend">
                  <TrendChart 
                    :data="durationTrendData" 
                    color="#8b5cf6"
                    title="执行耗时"
                    unit="秒"
                  />
                </div>
              </div>
            </div>
          </ChartCard>
        </el-col>
      </el-row>
    </div>

    <!-- 执行历史 -->
    <div class="execution-history">
      <ChartCard title="执行历史">
        <template #header>
          <div class="card-header">
            <h3>执行历史</h3>
            <div class="header-controls">
              <el-select v-model="statusFilter" placeholder="状态筛选" style="width: 150px">
                <el-option label="全部" value="" />
                <el-option label="排队中" value="queued" />
                <el-option label="运行中" value="running" />
                <el-option label="已完成" value="succeeded" />
                <el-option label="失败" value="failed" />
              </el-select>
              <el-date-picker
                v-model="dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                style="width: 240px"
              />
              <el-button @click="refreshHistory">
                <el-icon><Refresh /></el-icon>
                刷新
              </el-button>
            </div>
          </div>
        </template>

        <div class="table-wrapper">
          <el-table :data="paginatedHistory" style="width: 100%" stripe border>
            <el-table-column prop="runId" label="执行ID" :min-width="120" header-align="center" />
            <el-table-column prop="startTime" label="开始时间" :min-width="180" show-overflow-tooltip header-align="center" />
            <el-table-column prop="endTime" label="结束时间" :min-width="180" show-overflow-tooltip header-align="center" />
            <el-table-column prop="duration" label="耗时" :min-width="100" align="right" header-align="center">
              <template #default="{ row }">
                {{ row.duration }}秒
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" :min-width="100" align="center" header-align="center">
              <template #default="{ row }">
                <el-tag :type="getExecutionStatusType(row.status)" size="small">{{ row.statusText }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="processedCount" label="处理数量" :min-width="120" align="right" header-align="center">
              <template #default="{ row }">
                {{ row.processedCount.toLocaleString() }}
              </template>
            </el-table-column>
            <el-table-column prop="errorCount" label="错误数量" :min-width="120" align="right" header-align="center">
              <template #default="{ row }">
                <span :class="row.errorCount > 0 ? 'text-danger' : 'text-muted'">
                  {{ row.errorCount.toLocaleString() }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="message" label="消息" :min-width="200" show-overflow-tooltip header-align="center" />
            <el-table-column label="操作" :min-width="120" fixed="right" align="left" header-align="center">
              <template #default="{ row }">
                <el-button size="small" type="primary" @click="viewExecutionDetail(row)">
                  <el-icon><View /></el-icon>
                  详情
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            v-if="filteredHistory.length > 10"
            v-model:current-page="historyCurrentPage"
            v-model:page-size="historyPageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="filteredHistory.length"
            layout="total, sizes, prev, pager, next, jumper"
            class="pagination"
          />
        </div>
      </ChartCard>
    </div>

    <!-- 实时日志 -->
    <div class="realtime-logs" v-if="taskDetail.status === 'running'">
      <ChartCard title="实时日志">
        <template #header>
          <div class="card-header">
            <h3>实时日志</h3>
            <div class="header-controls">
              <el-switch
                v-model="autoScroll"
                active-text="自动滚动"
                inactive-text="停止滚动"
              />
              <el-button size="small" @click="clearLogs">
                <el-icon><Delete /></el-icon>
                清空
              </el-button>
            </div>
          </div>
        </template>

        <div class="log-container" ref="logContainer">
          <div 
            v-for="log in realtimeLogs" 
            :key="log.id"
            class="log-entry"
            :class="`log-${log.level}`"
          >
            <span class="log-time">{{ log.timestamp }}</span>
            <span class="log-level">{{ log.level.toUpperCase() }}</span>
            <span class="log-message">{{ log.message }}</span>
          </div>
        </div>
      </ChartCard>
    </div>

    <!-- 执行详情对话框 -->
    <el-dialog v-model="showExecutionDialog" :title="`执行详情 - ${selectedExecution?.runId}`" width="80%">
      <div v-if="selectedExecution" class="execution-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="执行ID">{{ selectedExecution.runId }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getExecutionStatusType(selectedExecution.status)">{{ selectedExecution.statusText }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="开始时间">{{ selectedExecution.startTime }}</el-descriptions-item>
          <el-descriptions-item label="结束时间">{{ selectedExecution.endTime }}</el-descriptions-item>
          <el-descriptions-item label="执行耗时">{{ selectedExecution.duration }}秒</el-descriptions-item>
          <el-descriptions-item label="处理数量">{{ selectedExecution.processedCount.toLocaleString() }}</el-descriptions-item>
          <el-descriptions-item label="错误数量">{{ selectedExecution.errorCount.toLocaleString() }}</el-descriptions-item>
          <el-descriptions-item label="成功率">{{ selectedExecution.successRate.toFixed(2) }}%</el-descriptions-item>
        </el-descriptions>

        <div class="execution-logs" style="margin-top: 20px;">
          <h4>执行日志</h4>
          <div class="table-wrapper">
            <el-table :data="paginatedExecutionLogs" style="width: 100%" stripe border>
              <el-table-column prop="timestamp" label="时间" :min-width="180" show-overflow-tooltip header-align="center" />
              <el-table-column prop="level" label="级别" :min-width="80" align="center" header-align="center">
                <template #default="{ row }">
                  <el-tag :type="getLogLevelType(row.level)" size="small">{{ row.level }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="message" label="消息" :min-width="300" show-overflow-tooltip header-align="center" />
            </el-table>

            <el-pagination
              v-if="selectedExecution.logs && selectedExecution.logs.length > 10"
              v-model:current-page="logsCurrentPage"
              v-model:page-size="logsPageSize"
              :page-sizes="[10, 20, 50, 100]"
              :total="selectedExecution.logs.length"
              layout="total, sizes, prev, pager, next, jumper"
              class="pagination"
            />
          </div>
        </div>
      </div>
      
      <template #footer>
        <el-button @click="showExecutionDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { flowhubApi } from '../../api/clients'
import KpiCard from '../../components/KpiCard.vue'
import ChartCard from '../../components/ChartCard.vue'
import TrendChart from '../../components/charts/TrendChart.vue'
import {
  ArrowLeft, Edit, VideoPlay, VideoPause, CaretRight, Refresh, View,
  CircleCheck, CircleClose, Clock
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { PieChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent
} from 'echarts/components'
import VChart from 'vue-echarts'

// 注册 ECharts 组件
use([CanvasRenderer, PieChart, TitleComponent, TooltipComponent, LegendComponent])

const route = useRoute()
const router = useRouter()

const statusLabels: Record<string, string> = {
  queued: '排队中',
  running: '运行中',
  succeeded: '已完成',
  failed: '失败',
  idle: '未运行',
  disabled: '已停用'
}

const dataTypeLabels: Record<string, string> = {
  daily_ohlc: '日线行情',
  daily_basic: '日线基础数据',
  batch_daily_ohlc: '批量日线行情',
  batch_daily_basic: '批量日线基础数据'
}

const scheduleTypeLabels: Record<string, string> = {
  manual: '即时执行',
  interval: '周期执行',
  cron: '定时执行'
}

interface TaskDetail {
  id: string
  name: string
  type: string
  typeText: string
  scheduleType: string
  scheduleTypeText: string
  status: string
  statusText: string
  dataSource: string
  targetStorage: string
  schedule: string
  createdAt: string
  lastRun: string
  nextRun: string
  timeout: number
  retryCount: number
  concurrency: number
  failureHandling: string[]
  sourceConfig: Record<string, any>
}

interface TaskMetrics {
  totalRuns: number
  successRate: number
  avgDuration: number
  totalProcessed: number
}

interface ExecutionHistory {
  runId: string
  startTime: string
  endTime: string
  duration: number
  status: string
  statusText: string
  processedCount: number
  errorCount: number
  successRate: number
  message: string
}

interface RealtimeLog {
  id: string
  timestamp: string
  level: string
  message: string
}

// 状态管理
const statusFilter = ref('')
const dateRange = ref<[Date, Date] | null>(null)
const autoScroll = ref(true)
const showExecutionDialog = ref(false)
const selectedExecution = ref<ExecutionHistory | null>(null)
const logContainer = ref<HTMLElement>()

// 分页相关
const historyCurrentPage = ref(1)
const historyPageSize = ref(10)
const logsCurrentPage = ref(1)
const logsPageSize = ref(10)

// 任务详情
const taskDetail = ref<TaskDetail>({
  id: '',
  name: '-',
  type: 'unknown',
  typeText: 'unknown',
  scheduleType: 'manual',
  scheduleTypeText: scheduleTypeLabels.manual,
  status: 'queued',
  statusText: statusLabels.queued,
  dataSource: 'flowhub',
  targetStorage: '-',
  schedule: '-',
  createdAt: '-',
  lastRun: '-',
  nextRun: '-',
  timeout: 0,
  retryCount: 0,
  concurrency: 0,
  failureHandling: [],
  sourceConfig: {}
})

// 任务指标
const taskMetrics = ref<TaskMetrics>({
  totalRuns: 0,
  successRate: 0,
  avgDuration: 0,
  totalProcessed: 0
})

// 执行历史
const executionHistory = ref<ExecutionHistory[]>([])

// 实时日志
const realtimeLogs = ref<RealtimeLog[]>([])

const filteredHistory = computed(() => {
  let filtered = executionHistory.value
  if (statusFilter.value) {
    filtered = filtered.filter(item => item.status === statusFilter.value)
  }
  if (dateRange.value) {
    const [start, end] = dateRange.value
    filtered = filtered.filter(item => {
      const startTime = new Date(item.startTime)
      return startTime >= start && startTime <= end
    })
  }
  return filtered
})

const paginatedHistory = computed(() => {
  const start = (historyCurrentPage.value - 1) * historyPageSize.value
  const end = start + historyPageSize.value
  return filteredHistory.value.slice(start, end)
})

const paginatedLogs = computed(() => {
  const start = (logsCurrentPage.value - 1) * logsPageSize.value
  const end = start + logsPageSize.value
  return realtimeLogs.value.slice(start, end)
})

const statusDistributionOption = computed(() => {
  const counts = {
    queued: 0,
    running: 0,
    succeeded: 0,
    failed: 0
  }
  executionHistory.value.forEach(item => {
    if (item.status in counts) {
      counts[item.status as keyof typeof counts] += 1
    }
  })

  return {
    tooltip: { trigger: 'item' },
    series: [
      {
        name: '执行状态',
        type: 'pie',
        radius: ['40%', '70%'],
        data: [
          { value: counts.queued, name: statusLabels.queued, itemStyle: { color: '#f59e0b' } },
          { value: counts.running, name: statusLabels.running, itemStyle: { color: '#10b981' } },
          { value: counts.succeeded, name: statusLabels.succeeded, itemStyle: { color: '#3b82f6' } },
          { value: counts.failed, name: statusLabels.failed, itemStyle: { color: '#ef4444' } }
        ]
      }
    ]
  }
})

const durationTrendData = computed(() => {
  return executionHistory.value.map(item => ({
    date: item.startTime.split(' ')[0],
    value: item.duration
  }))
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

function getTaskTypeColor(type: string) {
  if (type.includes('batch')) return 'warning'
  if (type.includes('daily')) return 'success'
  return 'info'
}

function getExecutionStatusType(status: string) {
  switch (status) {
    case 'queued': return 'warning'
    case 'running': return 'success'
    case 'failed': return 'danger'
    case 'succeeded': return 'info'
    default: return 'default'
  }
}

function formatTimestamp(timestamp?: number) {
  if (!timestamp) return '-'
  return new Date(timestamp * 1000).toLocaleString()
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

function extractProcessedCount(result: any) {
  if (!result || typeof result !== 'object') return 0
  const keys = ['processed', 'processed_count', 'count', 'rows', 'records', 'total']
  for (const key of keys) {
    const value = result[key]
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }
  }
  return 0
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

function updateMetrics() {
  const totalRuns = executionHistory.value.length
  const succeededRuns = executionHistory.value.filter(item => item.status === 'succeeded').length
  const avgDuration = totalRuns
    ? Math.round(executionHistory.value.reduce((sum, item) => sum + item.duration, 0) / totalRuns)
    : 0
  const totalProcessed = executionHistory.value.reduce((sum, item) => sum + item.processedCount, 0)

  taskMetrics.value = {
    totalRuns,
    successRate: totalRuns ? Math.round((succeededRuns / totalRuns) * 1000) / 10 : 0,
    avgDuration,
    totalProcessed
  }
}

async function refreshHistory() {
  try {
    const taskId = taskDetail.value.id
    if (!taskId) return
    const resp = await flowhubApi.get(`/api/v1/flowhub/tasks/${taskId}/history`)
    const payload = resp.data?.data || resp.data || {}
    const history = payload.history || []

    executionHistory.value = Array.isArray(history)
      ? history.map((item: any, idx: number) => ({
        runId: item.run_id || item.id || `${taskId}-${idx}`,
        startTime: item.start_time || '-',
        endTime: item.end_time || '-',
        duration: Number(item.duration || 0),
        status: item.status || 'queued',
        statusText: statusLabels[item.status] || item.status || '排队中',
        processedCount: Number(item.processed_count || 0),
        errorCount: Number(item.error_count || 0),
        successRate: Number(item.success_rate || 0),
        message: item.message || '-'
      }))
      : []

    updateMetrics()
  } catch (error) {
    console.warn('获取执行历史失败:', error)
    executionHistory.value = []
    updateMetrics()
  }
}

async function loadTaskDetail() {
  const taskId = route.params.id as string
  if (!taskId) {
    ElMessage.warning('未指定任务ID')
    router.replace('/flowhub/tasks')
    return
  }

  try {
    const resp = await flowhubApi.get(`/api/v1/flowhub/tasks/${taskId}`)
    const task = resp.data?.data || resp.data
    if (!task) throw new Error('任务不存在')

    const params = task.params || {}
    const dataType = task.data_type || params.data_type || 'unknown'
    const status = task.status || task.last_status || (task.enabled ? 'idle' : 'disabled')
    const scheduleType = task.schedule_type || 'manual'
    const scheduleValue = task.schedule_value

    let lastResult = null
    let lastError = null
    let lastProgress = null
    if (task.last_job_id) {
      try {
        const jobResp = await flowhubApi.get(`/api/v1/flowhub/jobs/${task.last_job_id}`)
        const job = jobResp.data?.data || jobResp.data
        lastResult = job?.result || null
        lastError = job?.error || null
        lastProgress = job?.progress ?? null
      } catch (error) {
        console.warn('获取最近执行结果失败:', error)
      }
    }

    taskDetail.value = {
      id: task.task_id || taskId,
      name: task.name || buildTaskName(params, dataType),
      type: dataType,
      typeText: dataTypeLabels[dataType] || dataType,
      scheduleType,
      scheduleTypeText: scheduleTypeLabels[scheduleType] || scheduleType,
      status,
      statusText: statusLabels[status] || status,
      dataSource: 'flowhub',
      targetStorage: '-',
      schedule: formatSchedule(scheduleType, scheduleValue),
      createdAt: formatTimestamp(task.created_at),
      lastRun: formatTimestamp(task.last_run_at || task.updated_at),
      nextRun: formatTimestamp(task.next_run_at),
      timeout: 0,
      retryCount: 0,
      concurrency: 0,
      failureHandling: [],
      sourceConfig: {
        params,
        result: lastResult,
        error: lastError,
        progress: lastProgress
      }
    }
  } catch (error) {
    console.warn('获取任务详情失败:', error)
    ElMessage.error('任务详情加载失败')
  }
}

function editTask() {
  router.push(`/flowhub/create?id=${taskDetail.value.id}`)
}

async function toggleTask() {
  const action = taskDetail.value.status === 'disabled' ? 'enable' : 'disable'

  try {
    await ElMessageBox.confirm(
      `确定要${action === 'enable' ? '启用' : '停用'}任务 "${taskDetail.value.name}" 吗？`,
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await flowhubApi.post(`/api/v1/flowhub/tasks/${taskDetail.value.id}/${action}`)
    await loadTaskDetail()
    ElMessage.success(`任务已${action === 'enable' ? '启用' : '停用'}`)
  } catch (error) {
    if (error !== 'cancel') {
      console.warn(`${action}任务失败:`, error)
      ElMessage.error(`任务${action === 'enable' ? '启用' : '停用'}失败`)
    }
  }
}

async function runTaskNow() {
  try {
    await ElMessageBox.confirm(
      `确定要立即执行任务 "${taskDetail.value.name}" 吗？`,
      '立即执行',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await flowhubApi.post(`/api/v1/flowhub/tasks/${taskDetail.value.id}/run`)
    ElMessage.success('任务已触发')
    await loadTaskDetail()
  } catch (error) {
    if (error !== 'cancel') {
      console.warn('立即执行失败:', error)
      ElMessage.error('任务触发失败')
    }
  }
}

function viewExecutionDetail(execution: ExecutionHistory) {
  selectedExecution.value = execution
  showExecutionDialog.value = true
}

watch(autoScroll, () => {
  if (autoScroll.value && logContainer.value) {
    logContainer.value.scrollTop = logContainer.value.scrollHeight
  }
})

onMounted(async () => {
  await loadTaskDetail()
  await refreshHistory()
})
</script>

<style scoped>
.flowhub-detail {
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

.header-left h1 {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: var(--text-3xl);
  font-weight: 700;
  color: var(--text-primary);
}

.header-left p {
  margin: 0 0 var(--spacing-md) 0;
  color: var(--text-secondary);
  font-size: var(--text-lg);
}

.task-meta {
  display: flex;
  gap: var(--spacing-md);
  align-items: center;
  flex-wrap: wrap;
}

.meta-text {
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.status-icon {
  margin-right: var(--spacing-xs);
}

.header-actions {
  display: flex;
  gap: var(--spacing-md);
  align-items: center;
}

.task-overview {
  margin-bottom: var(--spacing-xl);
}

.overview-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
}

.task-content {
  margin-bottom: var(--spacing-xl);
}

.config-section {
  margin-bottom: var(--spacing-xl);
}

.config-section h4 {
  margin: 0 0 var(--spacing-md) 0;
  color: var(--text-primary);
  font-size: var(--text-lg);
  font-weight: 600;
}

.source-config {
  background-color: var(--surface-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: var(--text-sm);
  color: var(--text-secondary);
  overflow-x: auto;
}

.stats-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.stat-item h4 {
  margin: 0 0 var(--spacing-md) 0;
  color: var(--text-primary);
  font-size: var(--text-lg);
  font-weight: 600;
}

.status-distribution,
.duration-trend {
  height: 250px;
}

.chart {
  width: 100%;
  height: 100%;
}

.execution-history {
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

.realtime-logs {
  margin-bottom: var(--spacing-xl);
}

.log-container {
  height: 300px;
  overflow-y: auto;
  background-color: var(--surface-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: var(--text-sm);
}

.log-entry {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xs);
  padding: var(--spacing-xs);
  border-radius: var(--radius-sm);
}

.log-entry.log-info {
  background-color: rgba(16, 185, 129, 0.1);
}

.log-entry.log-warning {
  background-color: rgba(245, 158, 11, 0.1);
}

.log-entry.log-error {
  background-color: rgba(239, 68, 68, 0.1);
}

.log-time {
  color: var(--text-muted);
  min-width: 120px;
}

.log-level {
  color: var(--text-secondary);
  min-width: 60px;
  font-weight: 600;
}

.log-message {
  color: var(--text-primary);
  flex: 1;
}

.execution-detail {
  max-height: 600px;
  overflow-y: auto;
}

.execution-logs h4 {
  margin: 0 0 var(--spacing-md) 0;
  color: var(--text-primary);
  font-size: var(--text-lg);
  font-weight: 600;
}

/* 表格样式增强 */
.el-table .text-danger {
  color: var(--danger-color);
  font-weight: 600;
}

.el-table .text-muted {
  color: var(--text-muted);
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .task-content .el-col {
    margin-bottom: var(--spacing-lg);
  }
}

@media (max-width: 768px) {
  .flowhub-detail {
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

  .task-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-sm);
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
}

/* 标签样式增强 */
.el-tag {
  font-weight: 500;
}

/* 按钮样式 */
.el-button + .el-button {
  margin-left: var(--spacing-xs);
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
