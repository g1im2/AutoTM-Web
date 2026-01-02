<template>
  <div class="system-tasks">
    <div class="page-header">
      <div class="header-actions">
        <el-button type="primary" @click="showCreateDialog = true">
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
          title="运行中任务" 
          :value="taskMetrics.runningTasks" 
          type="success"
          :subtitle="`共${taskMetrics.totalTasks}个任务`"
        />
        <KpiCard 
          title="最近24h执行" 
          :value="taskMetrics.recentExecutions" 
          subtitle="执行次数"
        />
        <KpiCard 
          title="成功率" 
          :value="taskMetrics.successRate" 
          format="percentage"
          :type="taskMetrics.successRate > 95 ? 'success' : taskMetrics.successRate > 90 ? 'warning' : 'danger'"
          subtitle="最近24小时"
        />
        <KpiCard 
          title="失败次数" 
          :value="taskMetrics.failedExecutions" 
          :type="taskMetrics.failedExecutions > 0 ? 'warning' : 'success'"
          subtitle="最近24小时"
        />
      </div>
    </div>

    <!-- 任务列表 -->
    <div class="tasks-list">
      <ChartCard title="定时任务列表">
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
                <el-option label="运行中" value="active" />
                <el-option label="暂停" value="paused" />
                <el-option label="停止" value="stopped" />
              </el-select>
              <el-select v-model="sourceFilter" placeholder="来源筛选" style="width: 150px">
                <el-option label="全部" value="" />
                <el-option label="系统任务" value="system" />
                <el-option label="自定义任务" value="custom" />
              </el-select>
            </div>
          </div>
        </template>

        <div class="table-wrapper">
          <el-table :data="paginatedTasks" style="width: 100%" stripe border>
            <el-table-column prop="name" label="任务名称" :min-width="220" show-overflow-tooltip header-align="center" />
            <el-table-column prop="id" label="任务ID" :min-width="220" show-overflow-tooltip header-align="center" />
            <el-table-column prop="source" label="来源" :min-width="120" header-align="center">
              <template #default="{ row }">
                <el-tag :type="row.source === 'custom' ? 'success' : 'info'" size="small">
                  {{ row.source === 'custom' ? '自定义' : '系统' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" :min-width="100" align="center" header-align="center">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)" size="small">{{ row.statusText }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="cron" label="调度规则" :min-width="180" show-overflow-tooltip header-align="center" />
            <el-table-column prop="functionName" label="任务函数" :min-width="160" show-overflow-tooltip header-align="center" />
            <el-table-column prop="lastRun" label="最近执行" :min-width="180" show-overflow-tooltip header-align="center" />
            <el-table-column prop="successRate" label="成功率" :min-width="100" align="right" header-align="center">
              <template #default="{ row }">
                <span :class="getSuccessRateClass(row.successRate)">{{ row.successRate }}%</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" :min-width="250" fixed="right" align="left" header-align="center">
            <template #default="{ row }">
              <el-button-group>
                <el-button 
                  size="small" 
                  type="success" 
                  @click="executeTask(row)" 
                  :disabled="row.status === 'active'"
                >
                  <el-icon><VideoPlay /></el-icon>
                  执行
                </el-button>
                <el-button 
                  size="small" 
                  :type="row.status === 'active' ? 'warning' : 'primary'" 
                  @click="toggleTask(row)"
                  :disabled="row.source !== 'custom'"
                >
                  <el-icon><component :is="row.status === 'active' ? 'VideoPause' : 'VideoPlay'" /></el-icon>
                  {{ row.status === 'active' ? '暂停' : '启动' }}
                </el-button>
              </el-button-group>
              <el-dropdown @command="handleTaskAction" style="margin-left: 8px">
                <el-button size="small">
                  更多<el-icon class="el-icon--right"><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item :command="{action: 'edit', task: row}" :disabled="row.source !== 'custom'">编辑任务</el-dropdown-item>
                    <el-dropdown-item :command="{action: 'logs', task: row}">查看日志</el-dropdown-item>
                    <el-dropdown-item :command="{action: 'history', task: row}">执行历史</el-dropdown-item>
                    <el-dropdown-item :command="{action: 'delete', task: row}" :disabled="row.source !== 'custom'" divided>删除任务</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
                </el-dropdown>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            v-if="filteredTasks.length > 10"
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="filteredTasks.length"
            layout="total, sizes, prev, pager, next, jumper"
            class="pagination"
          />
        </div>
      </ChartCard>
    </div>

    <!-- 任务监控 -->
    <div class="task-monitoring">
      <div class="monitoring-grid">
        <!-- 执行次数趋势 -->
        <ChartCard title="任务执行趋势" height="350px">
          <TrendChart 
            :data="executionTrendData" 
            color="#10b981"
            title="执行次数"
            unit="次"
          />
        </ChartCard>

        <!-- 任务来源分布 -->
        <ChartCard title="任务来源分布" height="350px">
          <div class="type-distribution-chart">
            <v-chart class="chart" :option="typeDistributionOption" autoresize />
          </div>
        </ChartCard>

        <!-- 执行结果分布 -->
        <ChartCard title="执行结果分布" height="350px">
          <div class="duration-distribution-chart">
            <v-chart class="chart" :option="durationDistributionOption" autoresize />
          </div>
        </ChartCard>

        <!-- 成功率统计 -->
        <ChartCard title="任务成功率统计" height="350px">
          <div class="success-rate-chart">
            <v-chart class="chart" :option="successRateOption" autoresize />
          </div>
        </ChartCard>
      </div>
    </div>

    <!-- 执行历史 -->
    <div class="execution-history">
      <el-card>
        <template #header>
          <div class="card-header">
            <h3>最近执行历史</h3>
            <div class="header-controls">
              <el-date-picker
                v-model="dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                style="width: 240px"
              />
              <el-select v-model="resultFilter" placeholder="结果筛选" style="width: 120px">
                <el-option label="全部" value="" />
                <el-option label="成功" value="completed" />
                <el-option label="失败" value="failed" />
                <el-option label="跳过" value="skipped" />
              </el-select>
            </div>
          </div>
        </template>

        <el-table
          :data="filteredHistory"
          style="width: 100%"
          stripe
          border
        >
          <el-table-column prop="executionTime" label="执行时间" width="180" show-overflow-tooltip />
          <el-table-column prop="taskName" label="任务名称" width="200" show-overflow-tooltip />
          <el-table-column prop="result" label="执行结果" width="120" align="center">
            <template #default="{ row }">
              <el-tag :type="getResultType(row.result)" size="small">{{ row.resultText }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="message" label="执行信息" min-width="250" show-overflow-tooltip />
          <el-table-column label="操作" width="120" align="center">
            <template #default="{ row }">
              <el-button size="small" type="primary" @click="viewExecutionDetails(row)">
                <el-icon><View /></el-icon>
                详情
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <!-- 新建/编辑任务对话框 -->
    <el-dialog 
      v-model="showCreateDialog" 
      :title="editingTask ? '编辑任务' : '新建任务'" 
      width="600px"
    >
      <el-form :model="taskForm" :rules="taskRules" ref="taskFormRef" label-width="120px">
        <el-form-item label="任务名称" prop="name" required>
          <el-input v-model="taskForm.name" placeholder="请输入任务名称" />
        </el-form-item>
        
        <el-form-item label="调度规则" prop="cron" required>
          <el-input v-model="taskForm.cron" placeholder="例如: every:30m 或 at:02:00" />
          <div style="margin-top: 4px; font-size: 12px; color: var(--text-muted);">
            支持 every:<n>m/h/d 或 at:HH:MM[:SS]
          </div>
        </el-form-item>

        <el-form-item label="任务函数" prop="function" required>
          <el-input v-model="taskForm.function" placeholder="例如: daily_data_fetch" />
        </el-form-item>

        <el-form-item label="Payload">
          <el-input v-model="taskForm.payload" type="textarea" :rows="3" placeholder='可选 JSON，如 {"symbols":["000001.SH"]}' />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="saveTask" :loading="saving">
          {{ editingTask ? '更新' : '创建' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { systemApi } from '../../api/clients'
import KpiCard from '../../components/KpiCard.vue'
import ChartCard from '../../components/ChartCard.vue'
import TrendChart from '../../components/charts/TrendChart.vue'
import { 
  Plus, Refresh, Search, VideoPlay, VideoPause, ArrowDown, View
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { PieChart, BarChart } from 'echarts/charts'
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
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

interface TaskMetrics {
  runningTasks: number
  totalTasks: number
  recentExecutions: number
  successRate: number
  failedExecutions: number
}

interface TaskInfo {
  id: string
  name: string
  source: 'system' | 'custom'
  status: string
  statusText: string
  lastRun: string
  cron: string
  functionName: string
  successRate: number
}

interface ExecutionHistory {
  id: string
  executionTime: string
  taskName: string
  result: string
  resultText: string
  message: string
}

interface TaskForm {
  name: string
  cron: string
  function: string
  payload: string
}

// 状态管理
const searchText = ref('')
const statusFilter = ref('')
const sourceFilter = ref('')
const resultFilter = ref('')
const dateRange = ref<[Date, Date] | null>(null)
const showCreateDialog = ref(false)

// 分页相关
const currentPage = ref(1)
const pageSize = ref(10)
const editingTask = ref<TaskInfo | null>(null)
const saving = ref(false)

// 表单引用
const taskFormRef = ref<FormInstance>()

// 任务指标
const taskMetrics = ref<TaskMetrics>({
  runningTasks: 0,
  totalTasks: 0,
  recentExecutions: 0,
  successRate: 0,
  failedExecutions: 0
})

// 任务列表
const tasks = ref<TaskInfo[]>([])

// 执行历史
const executionHistory = ref<ExecutionHistory[]>([])

// 趋势数据
const executionTrendData = ref<Array<{ date: string; value: number }>>([])

// 任务表单
const taskForm = ref<TaskForm>({
  name: '',
  cron: '',
  function: '',
  payload: ''
})

// 表单验证规则
const taskRules: FormRules = {
  name: [
    { required: true, message: '请输入任务名称', trigger: 'blur' }
  ],
  cron: [
    { required: true, message: '请输入调度规则', trigger: 'blur' }
  ],
  function: [
    { required: true, message: '请输入任务函数', trigger: 'blur' }
  ]
}

// 计算属性
const filteredTasks = computed(() => {
  let filtered = tasks.value
  
  if (searchText.value) {
    const query = searchText.value.toLowerCase()
    filtered = filtered.filter(task => 
      task.name.toLowerCase().includes(query) ||
      task.id.toLowerCase().includes(query)
    )
  }
  
  if (statusFilter.value) {
    filtered = filtered.filter(task => task.status === statusFilter.value)
  }
  
  if (sourceFilter.value) {
    filtered = filtered.filter(task => task.source === sourceFilter.value)
  }
  
  return filtered
})

// 分页数据
const paginatedTasks = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredTasks.value.slice(start, end)
})

const filteredHistory = computed(() => {
  let filtered = executionHistory.value
  
  if (resultFilter.value) {
    filtered = filtered.filter(history => history.result === resultFilter.value)
  }

  if (dateRange.value) {
    const [start, end] = dateRange.value
    const startTs = start.getTime()
    const endTs = end.getTime()
    filtered = filtered.filter(history => {
      const ts = history.executionTime ? new Date(history.executionTime).getTime() : 0
      return ts >= startTs && ts <= endTs
    })
  }
  
  return filtered
})

// 任务类型分布图配置
const typeDistributionOption = computed(() => ({
  title: {
    text: '任务来源分布',
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
    name: '任务来源',
    type: 'pie',
    radius: '50%',
    data: [
      { value: tasks.value.filter(t => t.source === 'system').length, name: '系统任务', itemStyle: { color: '#3b82f6' } },
      { value: tasks.value.filter(t => t.source === 'custom').length, name: '自定义任务', itemStyle: { color: '#10b981' } }
    ]
  }]
}))

// 执行结果分布图配置
const durationDistributionOption = computed(() => ({
  title: {
    text: '执行结果分布',
    textStyle: { color: 'var(--text-primary)', fontSize: 14 }
  },
  tooltip: { trigger: 'axis' },
  xAxis: {
    type: 'category',
    data: ['completed', 'failed', 'skipped'],
    axisLabel: { color: 'var(--text-secondary)' }
  },
  yAxis: {
    type: 'value',
    name: '次数',
    axisLabel: { color: 'var(--text-secondary)' }
  },
  series: [{
    name: '执行结果',
    type: 'bar',
    data: [
      executionHistory.value.filter(h => h.result === 'completed').length,
      executionHistory.value.filter(h => h.result === 'failed').length,
      executionHistory.value.filter(h => h.result === 'skipped').length
    ],
    itemStyle: { color: '#f59e0b' }
  }]
}))

// 成功率统计图配置
const successRateOption = computed(() => ({
  title: {
    text: '任务成功率',
    textStyle: { color: 'var(--text-primary)', fontSize: 14 }
  },
  tooltip: { trigger: 'axis' },
  xAxis: {
    type: 'category',
    data: tasks.value.map(t => t.name),
    axisLabel: { 
      color: 'var(--text-secondary)',
      interval: 0,
      rotate: 45
    }
  },
  yAxis: {
    type: 'value',
    name: '成功率 (%)',
    min: 90,
    max: 100,
    axisLabel: { color: 'var(--text-secondary)' }
  },
  series: [{
    name: '成功率',
    type: 'bar',
    data: tasks.value.map(t => t.successRate),
    itemStyle: { color: '#10b981' }
  }]
}))

// 方法
function getStatusType(status: string) {
  switch (status) {
    case 'active': return 'success'
    case 'paused': return 'warning'
    case 'stopped': return 'danger'
    default: return 'default'
  }
}

function getSuccessRateClass(rate: number) {
  if (rate >= 98) return 'text-success'
  if (rate >= 95) return 'text-warning'
  return 'text-danger'
}

function getResultType(result: string) {
  switch (result) {
    case 'completed': return 'success'
    case 'failed': return 'danger'
    case 'skipped': return 'warning'
    default: return 'default'
  }
}

function buildTrendData(history: ExecutionHistory[]) {
  const now = new Date()
  const buckets = new Map<string, number>()

  for (let i = 23; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 60 * 60 * 1000)
    const key = date.toISOString().slice(0, 13)
    buckets.set(key, 0)
  }

  for (const item of history) {
    if (!item.executionTime) continue
    const date = new Date(item.executionTime)
    const key = date.toISOString().slice(0, 13)
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) || 0) + 1)
    }
  }

  return Array.from(buckets.entries()).map(([key, value]) => ({
    date: `${key}:00:00`,
    value
  }))
}

function mapStatusText(status: string) {
  switch (status) {
    case 'active':
      return '运行中'
    case 'paused':
      return '已暂停'
    case 'stopped':
      return '已停止'
    default:
      return status || '-'
  }
}

function mapResultText(status: string) {
  switch (status) {
    case 'completed':
      return '成功'
    case 'failed':
      return '失败'
    case 'skipped':
      return '跳过'
    default:
      return status || '-'
  }
}

function parsePayload(payload: string) {
  const trimmed = payload.trim()
  if (!trimmed) return undefined
  try {
    return JSON.parse(trimmed)
  } catch {
    return null
  }
}

function normalizeTaskName(name: string, taskId: string) {
  if (!name) return taskId
  if (name.startsWith('/custom/') && taskId) {
    return `自定义任务 ${taskId.slice(0, 8)}`
  }
  return name
}

function getTaskSuccessRate(history: ExecutionHistory[]) {
  const total = history.filter(h => h.result === 'completed' || h.result === 'failed').length
  if (!total) return 0
  const completed = history.filter(h => h.result === 'completed').length
  return Math.round((completed / total) * 1000) / 10
}

async function refreshTasks() {
  try {
    const resp = await systemApi.get('/api/v1/tasks')
    const apiTasks = (resp.data?.data || resp.data || []) as Array<{
      task_id: string
      name: string
      status: string
      cron?: string
      function?: string
      enabled?: boolean
      source?: string
    }>

    const historyMap = new Map<string, ExecutionHistory[]>()
    const historyRequests = apiTasks.map(async (task) => {
      try {
        const historyResp = await systemApi.get(`/api/v1/tasks/${task.task_id}/history`, {
          params: { limit: 50, offset: 0 }
        })
        const items = (historyResp.data?.data?.history || historyResp.data?.history || []) as Array<{
          task_id?: string
          task_name?: string
          status?: string
          message?: string
          timestamp?: string
        }>
        const normalized = items.map((item, idx) => ({
          id: `${task.task_id}-${idx}`,
          executionTime: item.timestamp || '',
          taskName: item.task_name || task.name || task.task_id,
          result: item.status || '',
          resultText: mapResultText(item.status || ''),
          message: item.message || ''
        }))
        normalized.sort((a, b) => (b.executionTime || '').localeCompare(a.executionTime || ''))
        historyMap.set(task.task_id, normalized)
      } catch (error) {
        console.warn('获取任务历史失败:', task.task_id, error)
        historyMap.set(task.task_id, [])
      }
    })

    await Promise.all(historyRequests)

    tasks.value = apiTasks.map((task) => {
      const history = historyMap.get(task.task_id) || []
      const lastRun = history[0]?.executionTime || '-'
      const effectiveStatus = task.enabled === false ? 'paused' : task.status
      return {
        id: task.task_id,
        name: normalizeTaskName(task.name, task.task_id),
        source: task.source === 'custom' ? 'custom' : 'system',
        status: effectiveStatus,
        statusText: mapStatusText(effectiveStatus),
        cron: task.cron || '-',
        functionName: task.function || '-',
        lastRun,
        successRate: getTaskSuccessRate(history)
      }
    })

    executionHistory.value = Array.from(historyMap.values()).flat().sort((a, b) => {
      return (b.executionTime || '').localeCompare(a.executionTime || '')
    })

    const now = Date.now()
    const last24h = executionHistory.value.filter((item) => {
      const ts = item.executionTime ? new Date(item.executionTime).getTime() : 0
      return ts && now - ts <= 24 * 60 * 60 * 1000
    })
    const completed = last24h.filter(item => item.result === 'completed').length
    const failed = last24h.filter(item => item.result === 'failed').length
    const totalSuccessBase = completed + failed

    taskMetrics.value = {
      runningTasks: tasks.value.filter(task => task.status === 'active').length,
      totalTasks: tasks.value.length,
      recentExecutions: last24h.length,
      successRate: totalSuccessBase ? Math.round((completed / totalSuccessBase) * 1000) / 10 : 0,
      failedExecutions: failed
    }

    executionTrendData.value = buildTrendData(last24h)
    ElMessage.success('任务列表已刷新')
  } catch (error) {
    console.warn('刷新任务列表失败:', error)
    ElMessage.error('任务列表刷新失败')
  }
}

async function executeTask(task: TaskInfo) {
  try {
    await systemApi.post(`/api/v1/tasks/${task.id}/trigger`)
    ElMessage.success(`任务 ${task.name} 执行成功`)
    await refreshTasks()
  } catch (error) {
    console.warn('执行任务失败:', error)
    ElMessage.error(`任务 ${task.name} 执行失败`)
  }
}

async function toggleTask(task: TaskInfo) {
  try {
    if (task.source !== 'custom') {
      ElMessage.warning('系统任务不支持切换状态')
      return
    }
    await systemApi.post(`/api/v1/tasks/${task.id}/toggle`)
    
    await refreshTasks()
    ElMessage.success(`任务 ${task.name} 状态切换成功`)
  } catch (error) {
    console.warn('切换任务状态失败:', error)
    ElMessage.error(`任务 ${task.name} 状态切换失败`)
  }
}

function handleTaskAction(command: { action: string; task: TaskInfo }) {
  const { action, task } = command
  
  switch (action) {
    case 'edit':
      if (task.source !== 'custom') {
        ElMessage.warning('系统任务不支持编辑')
        return
      }
      editingTask.value = task
      taskForm.value = {
        name: task.name,
        cron: task.cron === '-' ? '' : task.cron,
        function: task.functionName === '-' ? '' : task.functionName,
        payload: ''
      }
      showCreateDialog.value = true
      break
    case 'logs':
      ElMessage.info(`查看任务日志: ${task.name}`)
      break
    case 'history':
      ElMessage.info(`查看执行历史: ${task.name}`)
      break
    case 'delete':
      confirmDeleteTask(task)
      break
  }
}

function viewExecutionDetails(execution: ExecutionHistory) {
  ElMessage.info(`查看执行详情: ${execution.taskName}`)
}

async function saveTask() {
  if (!taskFormRef.value) return
  
  try {
    await taskFormRef.value.validate()
    saving.value = true
    const payload = parsePayload(taskForm.value.payload)
    if (payload === null) {
      ElMessage.error('Payload 不是合法的 JSON')
      return
    }

    if (editingTask.value) {
      await systemApi.put(`/api/v1/tasks/${editingTask.value.id}`, {
        name: taskForm.value.name,
        cron: taskForm.value.cron,
        function: taskForm.value.function,
        payload: payload
      })
      ElMessage.success('任务更新成功')
    } else {
      await systemApi.post('/api/v1/tasks', {
        name: taskForm.value.name,
        cron: taskForm.value.cron,
        function: taskForm.value.function,
        payload: payload
      })
      ElMessage.success('任务创建成功')
    }
    
    showCreateDialog.value = false
    editingTask.value = null
    taskForm.value = { name: '', cron: '', function: '', payload: '' }
    await refreshTasks()
  } catch (error) {
    console.warn('保存任务失败:', error)
    ElMessage.error('任务保存失败')
  } finally {
    saving.value = false
  }
}

async function confirmDeleteTask(task: TaskInfo) {
  if (task.source !== 'custom') {
    ElMessage.warning('系统任务不支持删除')
    return
  }
  try {
    await ElMessageBox.confirm(`确认删除任务 "${task.name}" 吗？`, '删除任务', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await systemApi.delete(`/api/v1/tasks/${task.id}`)
    ElMessage.success('任务删除成功')
    await refreshTasks()
  } catch (error) {
    if (error !== 'cancel') {
      console.warn('删除任务失败:', error)
      ElMessage.error('任务删除失败')
    }
  }
}

onMounted(() => {
  refreshTasks()
})
</script>

<style scoped>
.system-tasks {
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

.tasks-overview {
  margin-bottom: var(--spacing-xl);
}

.overview-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
}

.tasks-list,
.task-monitoring,
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


.monitoring-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: var(--spacing-lg);
}

.type-distribution-chart,
.duration-distribution-chart,
.success-rate-chart {
  height: 350px;
}

.chart {
  width: 100%;
  height: 100%;
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
  .monitoring-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .system-tasks {
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
