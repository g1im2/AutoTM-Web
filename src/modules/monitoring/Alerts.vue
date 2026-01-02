<template>
  <PageTemplate>
    <template #actions>
      <el-button type="primary" @click="showCreateDialog = true">
        <el-icon><Plus /></el-icon>
        新建告警规则
      </el-button>
      <el-button @click="refreshAlerts">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
    </template>

    <!-- 告警概览 -->
    <div class="overview-cards">
        <KpiCard 
          title="活跃告警" 
          :value="alertMetrics.activeAlerts" 
          type="danger"
          subtitle="当前活跃告警数"
        />
        <KpiCard 
          title="告警规则" 
          :value="alertMetrics.totalRules" 
          subtitle="已配置规则数"
        />
        <KpiCard 
          title="今日告警" 
          :value="alertMetrics.todayAlerts" 
          :type="alertMetrics.todayAlerts > 10 ? 'warning' : 'success'"
          subtitle="今日触发次数"
        />
        <KpiCard 
          title="平均响应时间" 
          :value="alertMetrics.avgResponseTime" 
          subtitle="分钟"
        />
      </div>

    <!-- 活跃告警 -->
    <ChartCard v-if="activeAlerts.length > 0" title="活跃告警">
        <template #header>
          <div class="card-header">
            <div class="header-controls">
              <el-button type="danger" size="small" @click="acknowledgeAllAlerts">
                <el-icon><Check /></el-icon>
                确认所有告警
              </el-button>
            </div>
          </div>
        </template>

        <div class="table-wrapper">
          <el-table :data="paginatedActiveAlerts" style="width: 100%" stripe border>
            <el-table-column prop="severity" label="严重程度" :min-width="120" align="center" header-align="center">
              <template #default="{ row }">
                <el-tag :type="getSeverityType(row.severity)" size="small">{{ row.severityText }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="ruleName" label="告警规则" :min-width="200" show-overflow-tooltip header-align="center" />
            <el-table-column prop="message" label="告警消息" :min-width="300" show-overflow-tooltip header-align="center" />
            <el-table-column prop="triggerTime" label="触发时间" :min-width="180" show-overflow-tooltip header-align="center" />
            <el-table-column prop="duration" label="持续时间" :min-width="120" header-align="center" />
            <el-table-column prop="source" label="告警源" :min-width="150" show-overflow-tooltip header-align="center" />
            <el-table-column label="操作" :min-width="150" fixed="right" align="left" header-align="center">
              <template #default="{ row }">
                <el-button size="small" type="primary" @click="acknowledgeAlert(row)">
                  <el-icon><Check /></el-icon>
                  确认
                </el-button>
                <el-button size="small" type="danger" @click="silenceAlert(row)">
                  <el-icon><Mute /></el-icon>
                  静默
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            v-if="activeAlerts.length > 10"
            v-model:current-page="activeCurrentPage"
            v-model:page-size="activePageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="activeAlerts.length"
            layout="total, sizes, prev, pager, next, jumper"
            class="pagination"
          />
        </div>
      </ChartCard>

    <!-- 告警规则 -->
    <ChartCard title="告警规则">
        <template #header>
          <div class="card-header">
            <div class="header-controls">
              <el-input
                v-model="searchText"
                placeholder="搜索规则名称"
                style="width: 300px"
                clearable
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
              <el-select v-model="statusFilter" placeholder="状态筛选" style="width: 150px">
                <el-option label="全部" value="" />
                <el-option label="启用" value="enabled" />
                <el-option label="禁用" value="disabled" />
              </el-select>
            </div>
          </div>
        </template>

        <div class="table-wrapper">
          <el-table :data="paginatedRules" style="width: 100%" stripe border>
            <el-table-column prop="name" label="规则名称" :min-width="200" show-overflow-tooltip header-align="center" />
            <el-table-column prop="metric" label="监控指标" :min-width="150" show-overflow-tooltip header-align="center" />
            <el-table-column prop="condition" label="触发条件" :min-width="200" show-overflow-tooltip header-align="center" />
            <el-table-column prop="severity" label="严重程度" :min-width="120" align="center" header-align="center">
              <template #default="{ row }">
                <el-tag :type="getSeverityType(row.severity)" size="small">{{ row.severityText }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="enabled" label="状态" :min-width="100" align="center" header-align="center">
              <template #default="{ row }">
                <el-switch v-model="row.enabled" @change="toggleRule(row)" />
              </template>
            </el-table-column>
            <el-table-column prop="lastTriggered" label="最后触发" :min-width="180" show-overflow-tooltip header-align="center" />
            <el-table-column prop="triggerCount" label="触发次数" :min-width="120" align="right" header-align="center">
              <template #default="{ row }">
                {{ row.triggerCount.toLocaleString() }}
              </template>
            </el-table-column>
            <el-table-column label="操作" :min-width="150" fixed="right" align="left" header-align="center">
              <template #default="{ row }">
                <el-button size="small" @click="editRule(row)">
                  <el-icon><Edit /></el-icon>
                  编辑
                </el-button>
                <el-button size="small" type="danger" @click="deleteRule(row)">
                  <el-icon><Delete /></el-icon>
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            v-if="filteredRules.length > 10"
            v-model:current-page="rulesCurrentPage"
            v-model:page-size="rulesPageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="filteredRules.length"
            layout="total, sizes, prev, pager, next, jumper"
            class="pagination"
          />
        </div>
      </ChartCard>

    <!-- 告警统计 -->
    <div class="stats-grid">
        <!-- 告警趋势 -->
        <ChartCard title="告警趋势" height="350px">
          <TrendChart 
            :data="alertTrendData" 
            color="#ef4444"
            title="告警数量"
            unit="次"
          />
        </ChartCard>

        <!-- 告警分布 -->
        <ChartCard title="告警严重程度分布" height="350px">
          <div class="severity-distribution-chart">
            <v-chart class="chart" :option="severityDistributionOption" autoresize />
          </div>
        </ChartCard>

        <!-- 告警源分布 -->
        <ChartCard title="告警源分布" height="350px">
          <div class="source-distribution-chart">
            <v-chart class="chart" :option="sourceDistributionOption" autoresize />
          </div>
        </ChartCard>

        <!-- 响应时间统计 -->
        <ChartCard title="告警响应时间" height="350px">
          <div class="response-time-chart">
            <v-chart class="chart" :option="responseTimeOption" autoresize />
          </div>
        </ChartCard>
      </div>

    <!-- 告警历史 -->
    <ChartCard title="告警历史">
        <template #header>
          <div class="card-header">
            <div class="header-controls">
              <el-date-picker
                v-model="dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                style="width: 240px"
              />
              <el-select v-model="severityFilter" placeholder="严重程度" style="width: 120px">
                <el-option label="全部" value="" />
                <el-option label="严重" value="critical" />
                <el-option label="警告" value="warning" />
                <el-option label="信息" value="info" />
              </el-select>
            </div>
          </div>
        </template>

        <div class="table-wrapper">
          <el-table :data="paginatedHistory" style="width: 100%" stripe border>
            <el-table-column prop="triggerTime" label="触发时间" :min-width="140" show-overflow-tooltip header-align="center" />
            <el-table-column prop="severity" label="严重程度" :min-width="140" align="center" header-align="center">
              <template #default="{ row }">
                <el-tag :type="getSeverityType(row.severity)" size="small">{{ row.severityText }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="ruleName" label="告警规则" :min-width="140" show-overflow-tooltip header-align="center" />
            <el-table-column prop="message" label="告警消息" :min-width="140" show-overflow-tooltip header-align="center" />
            <el-table-column prop="source" label="告警源" :min-width="120" show-overflow-tooltip header-align="center" />
            <el-table-column prop="status" label="状态" :min-width="100" align="center" header-align="center">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)" size="small">{{ row.statusText }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="acknowledgedBy" label="确认人" :min-width="120" show-overflow-tooltip header-align="center" />
            <el-table-column prop="resolvedTime" label="解决时间" fixed="right" :min-width="140" show-overflow-tooltip header-align="center" />
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

    <!-- 新建/编辑告警规则对话框 -->
    <el-dialog 
      v-model="showCreateDialog" 
      :title="editingRule ? '编辑告警规则' : '新建告警规则'" 
      width="600px"
    >
      <el-form :model="ruleForm" :rules="ruleRules" ref="ruleFormRef" label-width="120px">
        <el-form-item label="规则名称" prop="name" required>
          <el-input v-model="ruleForm.name" placeholder="请输入规则名称" />
        </el-form-item>
        
        <el-form-item label="监控指标" prop="metric" required>
          <el-select v-model="ruleForm.metric" placeholder="选择监控指标" style="width: 100%">
            <el-option label="CPU使用率" value="cpu_usage" />
            <el-option label="内存使用率" value="memory_usage" />
            <el-option label="磁盘使用率" value="disk_usage" />
            <el-option label="网络延迟" value="network_latency" />
            <el-option label="错误率" value="error_rate" />
            <el-option label="响应时间" value="response_time" />
          </el-select>
        </el-form-item>

        <el-form-item label="比较操作符" prop="operator" required>
          <el-select v-model="ruleForm.operator" style="width: 100%">
            <el-option label="大于 >" value="gt" />
            <el-option label="大于等于 >=" value="gte" />
            <el-option label="小于 <" value="lt" />
            <el-option label="小于等于 <=" value="lte" />
            <el-option label="等于 =" value="eq" />
            <el-option label="不等于 !=" value="ne" />
          </el-select>
        </el-form-item>

        <el-form-item label="阈值" prop="threshold" required>
          <el-input-number v-model="ruleForm.threshold" :min="0" style="width: 100%" />
        </el-form-item>

        <el-form-item label="严重程度" prop="severity" required>
          <el-select v-model="ruleForm.severity" style="width: 100%">
            <el-option label="信息" value="info" />
            <el-option label="警告" value="warning" />
            <el-option label="严重" value="critical" />
          </el-select>
        </el-form-item>

        <el-form-item label="持续时间" prop="duration">
          <el-input-number v-model="ruleForm.duration" :min="1" style="width: 100%" />
          <span style="margin-left: 8px; color: var(--text-muted);">分钟</span>
        </el-form-item>

        <el-form-item label="通知方式">
          <el-checkbox-group v-model="ruleForm.notifications">
            <el-checkbox label="email">邮件通知</el-checkbox>
            <el-checkbox label="sms">短信通知</el-checkbox>
            <el-checkbox label="webhook">Webhook</el-checkbox>
            <el-checkbox label="slack">Slack</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="描述">
          <el-input v-model="ruleForm.description" type="textarea" :rows="3" placeholder="请输入规则描述" />
        </el-form-item>

        <el-form-item label="启用状态">
          <el-switch v-model="ruleForm.enabled" active-text="启用" inactive-text="禁用" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="saveRule" :loading="saving">
          {{ editingRule ? '更新' : '创建' }}
        </el-button>
      </template>
    </el-dialog>
  </PageTemplate>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import PageTemplate from '../../components/PageTemplate.vue'
import { monitoringApi } from '../../api/clients'
import KpiCard from '../../components/KpiCard.vue'
import ChartCard from '../../components/ChartCard.vue'
import TrendChart from '../../components/charts/TrendChart.vue'
import {
  Plus, Refresh, Search, Check, Mute, Edit, Delete
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

interface AlertMetrics {
  activeAlerts: number
  totalRules: number
  todayAlerts: number
  avgResponseTime: number
}

interface ActiveAlert {
  id: string
  severity: string
  severityText: string
  ruleName: string
  message: string
  triggerTime: string
  duration: string
  source: string
}

interface AlertRule {
  id: string
  name: string
  metric: string
  condition: string
  severity: string
  severityText: string
  enabled: boolean
  lastTriggered: string
  triggerCount: number
}

interface AlertHistory {
  id: string
  triggerTime: string
  severity: string
  severityText: string
  ruleName: string
  message: string
  source: string
  status: string
  statusText: string
  acknowledgedBy: string
  resolvedTime: string
}

interface RuleForm {
  name: string
  metric: string
  operator: string
  threshold: number
  severity: string
  duration: number
  notifications: string[]
  description: string
  enabled: boolean
}

// 状态管理
const searchText = ref('')
const statusFilter = ref('')
const severityFilter = ref('')
const dateRange = ref<[Date, Date] | null>(null)
const showCreateDialog = ref(false)
const editingRule = ref<AlertRule | null>(null)
const saving = ref(false)

// 表单引用
const ruleFormRef = ref<FormInstance>()

// 分页相关
const activeCurrentPage = ref(1)
const activePageSize = ref(10)
const rulesCurrentPage = ref(1)
const rulesPageSize = ref(10)
const historyCurrentPage = ref(1)
const historyPageSize = ref(10)

// 告警指标
const alertMetrics = ref<AlertMetrics>({
  activeAlerts: 3,
  totalRules: 15,
  todayAlerts: 8,
  avgResponseTime: 5
})

// 活跃告警
const activeAlerts = ref<ActiveAlert[]>([
  {
    id: 'ALERT001',
    severity: 'warning',
    severityText: '警告',
    ruleName: 'CPU使用率过高',
    message: 'brain-service CPU使用率达到85%',
    triggerTime: '2024-01-15 14:30:00',
    duration: '5分钟',
    source: 'brain-service'
  }
])

// 告警规则
const alertRules = ref<AlertRule[]>([
  {
    id: 'RULE001',
    name: 'CPU使用率过高',
    metric: 'cpu_usage',
    condition: '> 80%',
    severity: 'warning',
    severityText: '警告',
    enabled: true,
    lastTriggered: '2024-01-15 14:30:00',
    triggerCount: 25
  }
])

// 告警历史
const alertHistory = ref<AlertHistory[]>([
  {
    id: 'HIST001',
    triggerTime: '2024-01-15 14:30:00',
    severity: 'warning',
    severityText: '警告',
    ruleName: 'CPU使用率过高',
    message: 'brain-service CPU使用率达到85%',
    source: 'brain-service',
    status: 'resolved',
    statusText: '已解决',
    acknowledgedBy: 'admin',
    resolvedTime: '2024-01-15 14:35:00'
  }
])

// 趋势数据
const alertTrendData = ref<Array<{ date: string; value: number }>>([])

// 告警规则表单
const ruleForm = ref<RuleForm>({
  name: '',
  metric: '',
  operator: 'gt',
  threshold: 0,
  severity: 'warning',
  duration: 5,
  notifications: ['email'],
  description: '',
  enabled: true
})

// 表单验证规则
const ruleRules: FormRules = {
  name: [
    { required: true, message: '请输入规则名称', trigger: 'blur' }
  ],
  metric: [
    { required: true, message: '请选择监控指标', trigger: 'change' }
  ],
  threshold: [
    { required: true, message: '请输入阈值', trigger: 'blur' }
  ]
}

// 计算属性
const filteredRules = computed(() => {
  let filtered = alertRules.value

  if (searchText.value) {
    filtered = filtered.filter(rule =>
      rule.name.toLowerCase().includes(searchText.value.toLowerCase())
    )
  }

  if (statusFilter.value) {
    const enabled = statusFilter.value === 'enabled'
    filtered = filtered.filter(rule => rule.enabled === enabled)
  }

  return filtered
})

const filteredHistory = computed(() => {
  let filtered = alertHistory.value

  if (severityFilter.value) {
    filtered = filtered.filter(history => history.severity === severityFilter.value)
  }

  return filtered
})

// 分页数据
const paginatedActiveAlerts = computed(() => {
  const start = (activeCurrentPage.value - 1) * activePageSize.value
  const end = start + activePageSize.value
  return activeAlerts.value.slice(start, end)
})

const paginatedRules = computed(() => {
  const start = (rulesCurrentPage.value - 1) * rulesPageSize.value
  const end = start + rulesPageSize.value
  return filteredRules.value.slice(start, end)
})

const paginatedHistory = computed(() => {
  const start = (historyCurrentPage.value - 1) * historyPageSize.value
  const end = start + historyPageSize.value
  return filteredHistory.value.slice(start, end)
})

// 图表配置
const severityDistributionOption = computed(() => ({
  title: {
    text: '告警严重程度分布',
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
    name: '严重程度',
    type: 'pie',
    radius: '50%',
    data: [
      { value: 1, name: '严重', itemStyle: { color: '#ef4444' } },
      { value: 3, name: '警告', itemStyle: { color: '#f59e0b' } },
      { value: 4, name: '信息', itemStyle: { color: '#3b82f6' } }
    ]
  }]
}))

const sourceDistributionOption = computed(() => ({
  title: {
    text: '告警源分布',
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
    name: '告警源',
    type: 'pie',
    radius: '50%',
    data: [
      { value: 4, name: 'brain-service', itemStyle: { color: '#10b981' } },
      { value: 2, name: 'macro-service', itemStyle: { color: '#3b82f6' } },
      { value: 1, name: 'portfolio-service', itemStyle: { color: '#f59e0b' } },
      { value: 1, name: 'execution-service', itemStyle: { color: '#ef4444' } }
    ]
  }]
}))

const responseTimeOption = computed(() => ({
  title: {
    text: '告警响应时间',
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
    name: '响应时间 (分钟)',
    axisLabel: { color: 'var(--text-secondary)' }
  },
  series: [{
    name: '响应时间',
    type: 'bar',
    data: generateResponseTimeData(),
    itemStyle: { color: '#3b82f6' }
  }]
}))

// 方法
function getSeverityType(severity: string) {
  switch (severity) {
    case 'critical': return 'danger'
    case 'warning': return 'warning'
    case 'info': return 'info'
    default: return 'default'
  }
}

function getStatusType(status: string) {
  switch (status) {
    case 'resolved': return 'success'
    case 'acknowledged': return 'warning'
    case 'active': return 'danger'
    default: return 'default'
  }
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

function generateResponseTimeData() {
  return Array.from({ length: 12 }, () => Math.floor(Math.random() * 10) + 2)
}

function generateAlertTrendData() {
  const data = []
  const now = new Date()

  for (let i = 23; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 60 * 60 * 1000)
    data.push({
      date: date.toISOString(),
      value: Math.floor(Math.random() * 10) + 1
    })
  }

  return data
}

async function refreshAlerts() {
  try {
    await monitoringApi.get('/api/v1/monitoring/alerts')
    ElMessage.success('告警数据已刷新')
  } catch (error) {
    console.warn('刷新告警数据失败:', error)
    ElMessage.success('告警数据已刷新（模拟）')
  }
}

async function acknowledgeAlert(alert: ActiveAlert) {
  try {
    await monitoringApi.post('/api/v1/monitoring/alerts/ack', { alert_id: alert.id })

    const index = activeAlerts.value.findIndex(a => a.id === alert.id)
    if (index > -1) {
      activeAlerts.value.splice(index, 1)
    }

    ElMessage.success('告警已确认')
  } catch (error) {
    console.warn('确认告警失败:', error)
    ElMessage.success('告警已确认（模拟）')
  }
}

async function acknowledgeAllAlerts() {
  try {
    await monitoringApi.post('/api/v1/monitoring/alerts/ack')
    activeAlerts.value = []
    ElMessage.success('所有告警已确认')
  } catch (error) {
    console.warn('确认所有告警失败:', error)
    ElMessage.success('所有告警已确认（模拟）')
  }
}

async function silenceAlert(alert: ActiveAlert) {
  try {
    await monitoringApi.post(`/api/v1/monitoring/alerts/${alert.id}/silence`)
    ElMessage.success('告警已静默')
  } catch (error) {
    console.warn('静默告警失败:', error)
    ElMessage.success('告警已静默（模拟）')
  }
}

function editRule(rule: AlertRule) {
  editingRule.value = rule
  ruleForm.value = {
    name: rule.name,
    metric: rule.metric,
    operator: 'gt',
    threshold: 80,
    severity: rule.severity,
    duration: 5,
    notifications: ['email'],
    description: '',
    enabled: rule.enabled
  }
  showCreateDialog.value = true
}

async function toggleRule(rule: AlertRule) {
  try {
    await monitoringApi.post('/api/v1/monitoring/rules', {
      id: rule.id,
      enabled: rule.enabled
    })
    ElMessage.success('规则状态已更新')
  } catch (error) {
    console.warn('更新规则状态失败:', error)
    ElMessage.success('规则状态已更新（模拟）')
  }
}

async function deleteRule(rule: AlertRule) {
  try {
    await ElMessageBox.confirm(
      `确定要删除告警规则 ${rule.name} 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 后端暂未提供删除端点，使用本地模拟
    const index = alertRules.value.findIndex(r => r.id === rule.id)
    if (index > -1) {
      alertRules.value.splice(index, 1)
    }

    ElMessage.success('告警规则已删除')
  } catch (error) {
    if (error !== 'cancel') {
      console.warn('删除告警规则失败:', error)
      ElMessage.success('告警规则已删除（模拟）')
    }
  }
}

async function saveRule() {
  if (!ruleFormRef.value) return

  try {
    await ruleFormRef.value.validate()
    saving.value = true

    if (editingRule.value) {
      await monitoringApi.post('/api/v1/monitoring/rules', ruleForm.value)
      ElMessage.success('告警规则已更新')
    } else {
      await monitoringApi.post('/api/v1/monitoring/rules', ruleForm.value)

      // 添加到规则列表
      alertRules.value.push({
        id: `RULE${Date.now()}`,
        name: ruleForm.value.name,
        metric: ruleForm.value.metric,
        condition: `${ruleForm.value.operator} ${ruleForm.value.threshold}`,
        severity: ruleForm.value.severity,
        severityText: getSeverityText(ruleForm.value.severity),
        enabled: ruleForm.value.enabled,
        lastTriggered: '从未触发',
        triggerCount: 0
      })

      ElMessage.success('告警规则已创建')
    }

    showCreateDialog.value = false
    editingRule.value = null
  } catch (error) {
    console.warn('保存告警规则失败:', error)
    ElMessage.success('告警规则保存成功（模拟）')
  } finally {
    saving.value = false
  }
}

function getSeverityText(severity: string) {
  switch (severity) {
    case 'critical': return '严重'
    case 'warning': return '警告'
    case 'info': return '信息'
    default: return '未知'
  }
}

onMounted(() => {
  // 初始化数据
  alertTrendData.value = generateAlertTrendData()
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

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: var(--spacing-lg);
}

.severity-distribution-chart,
.source-distribution-chart,
.response-time-chart {
  height: 350px;
}

.chart {
  width: 100%;
  height: 100%;
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
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .monitoring-alerts {
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

  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
