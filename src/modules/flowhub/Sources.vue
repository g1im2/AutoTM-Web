<template>
  <div class="flowhub-sources">
    <div class="page-header">
      <div class="header-actions">
        <el-button type="primary" @click="showCreateDialog = true">
          <el-icon><Plus /></el-icon>
          新增数据源
        </el-button>
        <el-button @click="refreshSources">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 数据源概览 -->
    <div class="sources-overview">
      <div class="overview-cards">
        <KpiCard 
          title="总数据源" 
          :value="sourceMetrics.totalSources" 
          subtitle="已配置数据源"
        />
        <KpiCard 
          title="在线数据源" 
          :value="sourceMetrics.onlineSources" 
          type="success"
          subtitle="连接正常"
        />
        <KpiCard 
          title="离线数据源" 
          :value="sourceMetrics.offlineSources" 
          :type="sourceMetrics.offlineSources > 0 ? 'danger' : 'success'"
          subtitle="连接异常"
        />
        <KpiCard 
          title="今日调用次数" 
          :value="sourceMetrics.todayCalls" 
          subtitle="API调用统计"
        />
      </div>
    </div>

    <!-- 数据源列表 -->
    <div class="sources-list">
      <ChartCard title="数据源列表">
        <template #header>
          <div class="card-header">
            <div class="header-controls">
              <el-input
                v-model="searchText"
                placeholder="搜索数据源名称"
                style="width: 300px"
                clearable
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
              <el-select v-model="typeFilter" placeholder="类型筛选" style="width: 150px">
                <el-option label="全部" value="" />
                <el-option label="API接口" value="api" />
                <el-option label="数据库" value="database" />
                <el-option label="文件系统" value="file" />
                <el-option label="消息队列" value="queue" />
                <el-option label="Redis" value="redis" />
                <el-option label="TimescaleDB" value="timescaledb" />
              </el-select>
              <el-select v-model="statusFilter" placeholder="状态筛选" style="width: 150px">
                <el-option label="全部" value="" />
                <el-option label="在线" value="online" />
                <el-option label="离线" value="offline" />
                <el-option label="测试中" value="testing" />
              </el-select>
            </div>
          </div>
        </template>

        <div class="table-wrapper">
          <el-table :data="paginatedSources" style="width: 100%" stripe border>
            <el-table-column prop="name" label="数据源名称" :min-width="200" show-overflow-tooltip header-align="center" />
            <el-table-column prop="type" label="类型" :min-width="120" header-align="center">
              <template #default="{ row }">
                <el-tag class="type-tag" :type="getSourceTypeColor(row.type)">{{ row.typeText }}</el-tag>
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
            <el-table-column prop="endpoint" label="连接地址" :min-width="300" show-overflow-tooltip header-align="center" />
            <el-table-column prop="lastCheck" label="最后检查" :min-width="180" show-overflow-tooltip header-align="center" />
            <el-table-column prop="responseTime" label="响应时间" :min-width="120" align="right" header-align="center">
              <template #default="{ row }">
                <span v-if="row.responseTime > 0" :class="getResponseTimeClass(row.responseTime)">
                  {{ row.responseTime }}ms
                </span>
                <span v-else class="text-muted">--</span>
              </template>
            </el-table-column>
            <el-table-column prop="todayCalls" label="今日调用" :min-width="120" align="right" header-align="center">
              <template #default="{ row }">
                {{ row.todayCalls.toLocaleString() }}
              </template>
            </el-table-column>
            <el-table-column prop="successRate" label="成功率" :min-width="100" align="right" header-align="center">
              <template #default="{ row }">
                <span :class="getSuccessRateClass(row.successRate)">
                  {{ row.successRate.toFixed(1) }}%
                </span>
              </template>
            </el-table-column>
            <el-table-column label="操作" :min-width="actionsColumnWidth" fixed="right" align="left" header-align="center">
              <template #default="{ row }">
                <div class="actions-cell">
                  <el-button size="small" type="primary" @click="testConnection(row)">
                    <el-icon><Connection /></el-icon>
                    测试
                  </el-button>
                  <el-button size="small" @click="editSource(row)">
                    <el-icon><Edit /></el-icon>
                    编辑
                  </el-button>
                  <el-button size="small" type="danger" @click="deleteSource(row)">
                    <el-icon><Delete /></el-icon>
                    删除
                  </el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            v-if="filteredSources.length > 10"
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="filteredSources.length"
            layout="total, sizes, prev, pager, next, jumper"
            class="pagination"
          />
        </div>
      </ChartCard>
    </div>

    <!-- 数据源统计 -->
    <div class="source-statistics">
      <div class="stats-grid" ref="statsGridRef">
        <!-- 数据源类型分布 -->
        <ChartCard title="数据源类型分布" height="350px">
          <div class="type-distribution-chart" ref="typeChartRef">
            <v-chart v-if="chartsReady && hasSources" class="chart" :option="typeDistributionOption" autoresize />
            <div v-else class="chart-placeholder">暂无数据源</div>
          </div>
        </ChartCard>

        <!-- 调用量趋势 -->
        <ChartCard title="调用量趋势" height="350px">
          <div class="trend-chart" ref="trendChartRef">
            <TrendChart 
              v-if="chartsReady && hasSources"
              :data="callTrendData" 
              color="#3b82f6"
              title="每日调用量"
            />
            <div v-else class="chart-placeholder">暂无调用数据</div>
          </div>
        </ChartCard>

        <!-- 响应时间分析 -->
        <ChartCard title="响应时间分析" height="350px">
          <div class="response-time-chart" ref="responseChartRef">
            <v-chart v-if="chartsReady && hasSources" class="chart" :option="responseTimeOption" autoresize />
            <div v-else class="chart-placeholder">暂无响应时间数据</div>
          </div>
        </ChartCard>

        <!-- 成功率统计 -->
        <ChartCard title="成功率统计" height="350px">
          <div class="success-rate-chart" ref="successChartRef">
            <v-chart v-if="chartsReady && hasSources" class="chart" :option="successRateOption" autoresize />
            <div v-else class="chart-placeholder">暂无成功率数据</div>
          </div>
        </ChartCard>
      </div>
    </div>

    <!-- 新增/编辑数据源对话框 -->
    <el-dialog 
      v-model="showCreateDialog" 
      :title="editingSource ? '编辑数据源' : '新增数据源'" 
      width="600px"
    >
      <el-form :model="sourceForm" :rules="sourceRules" ref="sourceFormRef" label-width="120px">
        <el-form-item label="数据源名称" prop="name" required>
          <el-input v-model="sourceForm.name" placeholder="请输入数据源名称" />
        </el-form-item>
        
        <el-form-item label="数据源类型" prop="type" required>
          <el-select v-model="sourceForm.type" placeholder="选择数据源类型" style="width: 100%" @change="onTypeChange">
            <el-option label="API接口" value="api" />
            <el-option label="数据库" value="database" />
            <el-option label="文件系统" value="file" />
            <el-option label="消息队列" value="queue" />
          </el-select>
        </el-form-item>

        <el-form-item label="描述" prop="description">
          <el-input v-model="sourceForm.description" type="textarea" :rows="2" placeholder="请输入描述" />
        </el-form-item>

        <!-- API配置 -->
        <div v-if="sourceForm.type === 'api'" class="config-section">
          <el-form-item label="API地址" prop="endpoint" required>
            <el-input v-model="sourceForm.endpoint" placeholder="https://api.example.com" />
          </el-form-item>
          
          <el-form-item label="认证方式" prop="authType">
            <el-select v-model="sourceForm.authType" style="width: 100%">
              <el-option label="无认证" value="none" />
              <el-option label="API Key" value="apikey" />
              <el-option label="Bearer Token" value="bearer" />
              <el-option label="Basic Auth" value="basic" />
            </el-select>
          </el-form-item>
          
          <el-form-item label="认证信息" prop="authCredentials" v-if="sourceForm.authType !== 'none'">
            <el-input v-model="sourceForm.authCredentials" type="password" placeholder="输入认证信息" show-password />
          </el-form-item>
        </div>

        <!-- 数据库配置 -->
        <div v-if="sourceForm.type === 'database'" class="config-section">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="数据库类型" prop="dbType" required>
                <el-select v-model="sourceForm.dbType" style="width: 100%">
                  <el-option label="PostgreSQL" value="postgresql" />
                  <el-option label="MySQL" value="mysql" />
                  <el-option label="TimescaleDB" value="timescaledb" />
                  <el-option label="Redis" value="redis" />
                  <el-option label="MongoDB" value="mongodb" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="主机地址" prop="host" required>
                <el-input v-model="sourceForm.host" placeholder="localhost" />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item label="端口" prop="port" required>
                <el-input-number v-model="sourceForm.port" :min="1" :max="65535" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="数据库名" prop="database" required>
                <el-input v-model="sourceForm.database" placeholder="database_name" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="用户名" prop="username" required>
                <el-input v-model="sourceForm.username" placeholder="username" />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-form-item label="密码" prop="password" required>
            <el-input v-model="sourceForm.password" type="password" placeholder="password" show-password />
          </el-form-item>
        </div>

        <!-- 文件系统配置 -->
        <div v-if="sourceForm.type === 'file'" class="config-section">
          <el-form-item label="文件路径" prop="path" required>
            <el-input v-model="sourceForm.path" placeholder="/path/to/data" />
          </el-form-item>
          
          <el-form-item label="访问方式" prop="accessType">
            <el-select v-model="sourceForm.accessType" style="width: 100%">
              <el-option label="本地文件系统" value="local" />
              <el-option label="FTP" value="ftp" />
              <el-option label="SFTP" value="sftp" />
              <el-option label="网络共享" value="smb" />
            </el-select>
          </el-form-item>
        </div>

        <!-- 消息队列配置 -->
        <div v-if="sourceForm.type === 'queue'" class="config-section">
          <el-form-item label="队列类型" prop="queueType" required>
            <el-select v-model="sourceForm.queueType" style="width: 100%">
              <el-option label="RabbitMQ" value="rabbitmq" />
              <el-option label="Apache Kafka" value="kafka" />
              <el-option label="Redis Pub/Sub" value="redis" />
              <el-option label="Amazon SQS" value="sqs" />
            </el-select>
          </el-form-item>
          
          <el-form-item label="连接地址" prop="endpoint" required>
            <el-input v-model="sourceForm.endpoint" placeholder="amqp://localhost:5672" />
          </el-form-item>
        </div>

        <el-form-item label="连接超时(秒)" prop="timeout">
          <el-input-number v-model="sourceForm.timeout" :min="1" :max="300" style="width: 100%" />
        </el-form-item>

        <el-form-item label="启用状态">
          <el-switch v-model="sourceForm.enabled" active-text="启用" inactive-text="禁用" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button @click="testSourceConnection" :loading="testing">测试连接</el-button>
        <el-button type="primary" @click="saveSource" :loading="saving">
          {{ editingSource ? '更新' : '创建' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { flowhubApi } from '../../api/clients'
import KpiCard from '../../components/KpiCard.vue'
import ChartCard from '../../components/ChartCard.vue'
import TrendChart from '../../components/charts/TrendChart.vue'
import {
  Plus, Refresh, Search, Edit, Delete, Connection,
  CircleCheck, Warning, CircleClose, Clock
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

interface SourceMetrics {
  totalSources: number
  onlineSources: number
  offlineSources: number
  todayCalls: number
}

interface DataSource {
  id: string
  name: string
  type: string
  typeText: string
  status: string
  statusText: string
  endpoint: string
  lastCheck: string
  responseTime: number
  todayCalls: number
  successRate: number
  description?: string
}

interface SourceForm {
  name: string
  type: string
  description: string
  endpoint: string
  authType: string
  authCredentials: string
  dbType: string
  host: string
  port: number
  database: string
  username: string
  password: string
  path: string
  accessType: string
  queueType: string
  timeout: number
  enabled: boolean
}

// 状态管理
const searchText = ref('')
const typeFilter = ref('')
const statusFilter = ref('')
const chartsReady = ref(false)
const statsGridRef = ref<HTMLElement | null>(null)
const typeChartRef = ref<HTMLElement | null>(null)
const trendChartRef = ref<HTMLElement | null>(null)
const responseChartRef = ref<HTMLElement | null>(null)
const successChartRef = ref<HTMLElement | null>(null)
const showCreateDialog = ref(false)
const editingSource = ref<DataSource | null>(null)
const sourceFormRef = ref<FormInstance>()
const saving = ref(false)

// 分页相关
const currentPage = ref(1)
const pageSize = ref(10)
const testing = ref(false)

// 数据源指标
const sourceMetrics = ref<SourceMetrics>({
  totalSources: 0,
  onlineSources: 0,
  offlineSources: 0,
  todayCalls: 0
})

// 数据源列表
const dataSources = ref<DataSource[]>([])
let chartsReadyTimer: number | undefined
const actionLabels = ['测试', '编辑', '删除']
const actionsColumnWidth = computed(() => {
  const perChar = 16
  const buttonChrome = 36
  const labelWidth = actionLabels.reduce((sum, label) => sum + label.length * perChar + buttonChrome, 0)
  const gaps = (actionLabels.length - 1) * 8
  const padding = 16
  return Math.max(250, labelWidth + gaps + padding)
})

// 调用量趋势数据
const callTrendData = ref<Array<{ date: string; value: number }>>([])

// 数据源表单
const sourceForm = ref<SourceForm>({
  name: '',
  type: '',
  description: '',
  endpoint: '',
  authType: 'none',
  authCredentials: '',
  dbType: '',
  host: '',
  port: 5432,
  database: '',
  username: '',
  password: '',
  path: '',
  accessType: 'local',
  queueType: '',
  timeout: 30,
  enabled: true
})

// 表单验证规则
const sourceRules: FormRules = {
  name: [
    { required: true, message: '请输入数据源名称', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请选择数据源类型', trigger: 'change' }
  ],
  endpoint: [
    { required: true, message: '请输入连接地址', trigger: 'blur' }
  ],
  dbType: [
    { required: true, message: '请选择数据库类型', trigger: 'change' }
  ],
  host: [
    { required: true, message: '请输入主机地址', trigger: 'blur' }
  ],
  port: [
    { required: true, message: '请输入端口号', trigger: 'blur' },
    { type: 'number', min: 1, max: 65535, message: '端口号必须在1-65535之间', trigger: 'blur' }
  ],
  database: [
    { required: true, message: '请输入数据库名', trigger: 'blur' }
  ],
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' }
  ],
  path: [
    { required: true, message: '请输入文件路径', trigger: 'blur' }
  ],
  queueType: [
    { required: true, message: '请选择队列类型', trigger: 'change' }
  ]
}

// 计算属性
const filteredSources = computed(() => {
  let filtered = dataSources.value

  if (searchText.value) {
    const search = searchText.value.toLowerCase()
    filtered = filtered.filter(source =>
      source.name.toLowerCase().includes(search)
    )
  }

  if (typeFilter.value) {
    filtered = filtered.filter(source => source.type === typeFilter.value)
  }

  if (statusFilter.value) {
    filtered = filtered.filter(source => source.status === statusFilter.value)
  }

  return filtered
})

// 分页数据
const paginatedSources = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredSources.value.slice(start, end)
})

const hasSources = computed(() => dataSources.value.length > 0)

// 数据源类型分布图表配置
const typeDistributionOption = computed(() => {
  const counts = new Map<string, number>()
  dataSources.value.forEach((source) => {
    const label = source.typeText || source.type
    counts.set(label, (counts.get(label) || 0) + 1)
  })

  const data = Array.from(counts.entries()).map(([name, value]) => ({
    name,
    value
  }))

  return {
    title: {
      text: '数据源类型分布',
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
    series: [
      {
        name: '数据源类型',
        type: 'pie',
        radius: ['40%', '62%'],
        data,
        label: {
          color: 'var(--text-secondary)',
          fontSize: 11,
          formatter: '{d}%'
        },
        labelLine: {
          length: 8,
          length2: 6
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  }
})

// 响应时间分析图表配置
const responseTimeOption = computed(() => ({
  title: {
    text: '响应时间分析',
    textStyle: { color: 'var(--text-primary)', fontSize: 14 }
  },
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' }
  },
  xAxis: {
    type: 'category',
    data: dataSources.value.filter(s => s.status === 'online').map(s => s.name),
    axisLabel: {
      color: 'var(--text-secondary)',
      rotate: 45
    }
  },
  yAxis: {
    type: 'value',
    name: '响应时间 (ms)',
    axisLabel: { color: 'var(--text-secondary)' }
  },
  series: [
    {
      name: '响应时间',
      type: 'bar',
      data: dataSources.value.filter(s => s.status === 'online').map(s => s.responseTime),
      itemStyle: {
        color: (params: any) => {
          const value = params.value
          if (value < 50) return '#10b981'
          if (value < 200) return '#f59e0b'
          return '#ef4444'
        }
      }
    }
  ]
}))

// 成功率统计图表配置
const successRateOption = computed(() => ({
  title: {
    text: '成功率统计',
    textStyle: { color: 'var(--text-primary)', fontSize: 14 }
  },
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' }
  },
  xAxis: {
    type: 'category',
    data: dataSources.value.map(s => s.name),
    axisLabel: {
      color: 'var(--text-secondary)',
      rotate: 45
    }
  },
  yAxis: {
    type: 'value',
    name: '成功率 (%)',
    min: 0,
    max: 100,
    axisLabel: { color: 'var(--text-secondary)' }
  },
  series: [
    {
      name: '成功率',
      type: 'bar',
      data: dataSources.value.map(s => s.successRate),
      itemStyle: {
        color: (params: any) => {
          const value = params.value
          if (value >= 95) return '#10b981'
          if (value >= 90) return '#f59e0b'
          return '#ef4444'
        }
      }
    }
  ]
}))

// 方法
function getSourceTypeColor(type: string) {
  switch (type) {
    case 'api': return 'primary'
    case 'database': return 'success'
    case 'file': return 'warning'
    case 'queue': return 'info'
    case 'redis': return 'warning'
    case 'timescaledb': return 'success'
    default: return 'info'
  }
}

function getStatusType(status: string) {
  switch (status) {
    case 'online': return 'success'
    case 'offline': return 'danger'
    case 'testing': return 'warning'
    default: return 'default'
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'online': return CircleCheck
    case 'offline': return CircleClose
    case 'testing': return Clock
    default: return Warning
  }
}

function getResponseTimeClass(time: number) {
  if (time < 50) return 'text-success'
  if (time < 200) return 'text-warning'
  return 'text-danger'
}

function getSuccessRateClass(rate: number) {
  if (rate >= 95) return 'text-success'
  if (rate >= 90) return 'text-warning'
  return 'text-danger'
}

function generateCallTrendData() {
  const data = []
  const now = new Date()
  const totalCalls = dataSources.value.reduce((sum, source) => sum + (source.todayCalls || 0), 0)

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    data.push({
      date: date.toISOString().split('T')[0]!,
      value: i === 0 ? totalCalls : 0
    })
  }

  return data
}

function onTypeChange() {
  // 重置相关字段
  sourceForm.value.endpoint = ''
  sourceForm.value.authType = 'none'
  sourceForm.value.authCredentials = ''
  sourceForm.value.dbType = ''
  sourceForm.value.host = ''
  sourceForm.value.port = 5432
  sourceForm.value.database = ''
  sourceForm.value.username = ''
  sourceForm.value.password = ''
  sourceForm.value.path = ''
  sourceForm.value.accessType = 'local'
  sourceForm.value.queueType = ''
}

async function refreshSources() {
  try {
    chartsReady.value = false
    const { data } = await flowhubApi.get('/api/v1/sources')

    if (data?.data?.sources && Array.isArray(data.data.sources)) {
      dataSources.value = data.data.sources.map((item: any) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        typeText: getTypeText(item.type),
        status: item.status || 'offline',
        statusText: item.status === 'online' ? '在线' : '离线',
        endpoint: item.endpoint || '-',
        lastCheck: item.last_check || item.updated_at || '-',
        responseTime: Number(item.response_time || 0),
        todayCalls: Number(item.today_calls || 0),
        successRate: Number(item.success_rate || 0),
        description: item.description || ''
      }))
    } else {
      dataSources.value = []
    }

    const online = dataSources.value.filter(source => source.status === 'online').length
    sourceMetrics.value = {
      totalSources: dataSources.value.length,
      onlineSources: online,
      offlineSources: dataSources.value.length - online,
      todayCalls: dataSources.value.reduce((sum, source) => sum + (source.todayCalls || 0), 0)
    }

    callTrendData.value = generateCallTrendData()
    scheduleChartsReady()

    ElMessage.success('数据源列表已刷新')
  } catch (error) {
    console.warn('刷新数据源失败:', error)
    ElMessage.error('刷新数据源列表失败')
  }
}

function scheduleChartsReady(attempt = 0) {
  if (chartsReadyTimer) {
    window.clearTimeout(chartsReadyTimer)
  }
  chartsReadyTimer = window.setTimeout(async () => {
    await nextTick()
    const containers = [
      statsGridRef.value,
      typeChartRef.value,
      trendChartRef.value,
      responseChartRef.value,
      successChartRef.value
    ].filter(Boolean) as HTMLElement[]

    const ready = containers.length > 0 && containers.every(el => el.clientWidth > 0 && el.clientHeight > 0)
    if (ready) {
      chartsReady.value = true
      return
    }
    if (attempt < 10) {
      scheduleChartsReady(attempt + 1)
    }
  }, 120)
}

async function testConnection(source: DataSource) {
  try {
    source.status = 'testing'
    source.statusText = '测试中'

    const { data } = await flowhubApi.post(`/api/v1/sources/${source.id}/test`)

    if (data?.data?.status === 'success') {
      source.status = 'online'
      source.statusText = '在线'
      source.lastCheck = new Date().toLocaleString()
      source.responseTime = data.data.latency || 0
      ElMessage.success('连接测试成功')
    } else {
      source.status = 'offline'
      source.statusText = '离线'
      ElMessage.error('连接测试失败')
    }
  } catch (error) {
    console.warn('连接测试失败:', error)
    source.status = 'offline'
    source.statusText = '离线'
    ElMessage.error('连接测试失败')
  }
}

function editSource(source: DataSource) {
  ElMessage.info('当前后端仅支持数据源列表查询，暂不支持编辑')
}

async function deleteSource(source: DataSource) {
  ElMessage.info('当前后端暂不支持删除数据源')
}

async function testSourceConnection() {
  if (!sourceFormRef.value) return

  try {
    // 验证必要字段
    const fieldsToValidate = ['name', 'type']

    if (sourceForm.value.type === 'api') {
      fieldsToValidate.push('endpoint')
    } else if (sourceForm.value.type === 'database') {
      fieldsToValidate.push('dbType', 'host', 'port', 'database', 'username', 'password')
    } else if (sourceForm.value.type === 'file') {
      fieldsToValidate.push('path')
    } else if (sourceForm.value.type === 'queue') {
      fieldsToValidate.push('queueType', 'endpoint')
    }

    await sourceFormRef.value.validateField(fieldsToValidate)

    testing.value = true

    ElMessage.info('当前后端暂不支持新建数据源的连接测试')
  } catch (error) {
    console.warn('连接测试失败:', error)
    ElMessage.error('连接测试失败')
  } finally {
    testing.value = false
  }
}

function getSourceConfig() {
  const config: any = {}

  if (sourceForm.value.type === 'api') {
    config.endpoint = sourceForm.value.endpoint
    config.auth_type = sourceForm.value.authType
    config.auth_credentials = sourceForm.value.authCredentials
  } else if (sourceForm.value.type === 'database') {
    config.db_type = sourceForm.value.dbType
    config.host = sourceForm.value.host
    config.port = sourceForm.value.port
    config.database = sourceForm.value.database
    config.username = sourceForm.value.username
    config.password = sourceForm.value.password
  } else if (sourceForm.value.type === 'file') {
    config.path = sourceForm.value.path
    config.access_type = sourceForm.value.accessType
  } else if (sourceForm.value.type === 'queue') {
    config.queue_type = sourceForm.value.queueType
    config.endpoint = sourceForm.value.endpoint
  }

  config.timeout = sourceForm.value.timeout

  return config
}

async function saveSource() {
  if (!sourceFormRef.value) return

  try {
    await sourceFormRef.value.validate()

    saving.value = true
    ElMessage.info('当前后端暂不支持数据源新增或更新')
    showCreateDialog.value = false

    // 重置表单
    sourceForm.value = {
      name: '',
      type: '',
      description: '',
      endpoint: '',
      authType: 'none',
      authCredentials: '',
      dbType: '',
      host: '',
      port: 5432,
      database: '',
      username: '',
      password: '',
      path: '',
      accessType: 'local',
      queueType: '',
      timeout: 30,
      enabled: true
    }

    editingSource.value = null
    showCreateDialog.value = false
  } catch (error) {
    console.warn('保存数据源失败:', error)
    ElMessage.error('保存数据源失败')
  } finally {
    saving.value = false
  }
}

function getTypeText(type: string) {
  const typeMap: Record<string, string> = {
    api: 'API接口',
    database: '数据库',
    file: '文件系统',
    queue: '消息队列',
    redis: 'Redis',
    timescaledb: 'TimescaleDB',
    econdb: 'EconDB'
  }
  return typeMap[type] || type
}

onMounted(() => {
  // 初始化数据
  callTrendData.value = generateCallTrendData()
  refreshSources()
})

onBeforeUnmount(() => {
  if (chartsReadyTimer) {
    window.clearTimeout(chartsReadyTimer)
  }
})
</script>

<style scoped>
.flowhub-sources {
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

.sources-overview {
  margin-bottom: var(--spacing-xl);
}

.overview-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--card-gap-lg);
}

.sources-list {
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

.source-statistics {
  margin-bottom: var(--spacing-xl);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: var(--card-gap-lg);
}

.type-distribution-chart,
.trend-chart,
.response-time-chart,
.success-rate-chart {
  height: 350px;
  min-height: 260px;
}

.chart {
  width: 100%;
  height: 100%;
}

.status-icon {
  margin-right: var(--spacing-xs);
}

.config-section {
  margin-top: var(--spacing-lg);
  padding: var(--spacing-lg);
  background-color: var(--surface-bg);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
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

/* 表单样式增强 */
.el-form-item__label {
  color: var(--text-primary);
  font-weight: 500;
}

.el-input,
.el-select,
.el-textarea {
  --el-input-bg-color: var(--input-bg);
  --el-input-border-color: var(--border-color);
  --el-input-text-color: var(--text-primary);
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .flowhub-sources {
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
    gap: var(--card-gap-xs);
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

/* 标签样式增强 */
.el-tag {
  font-weight: 500;
}

.actions-cell {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  justify-content: flex-start;
  padding: 0 8px;
  white-space: nowrap;
  width: 100%;
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

.type-tag {
  --el-tag-bg-color: rgba(148, 163, 184, 0.16);
  --el-tag-text-color: var(--text-primary);
  --el-tag-border-color: rgba(148, 163, 184, 0.4);
}

.type-tag.el-tag--success {
  --el-tag-bg-color: rgba(var(--el-color-success-rgb), 0.18);
  --el-tag-text-color: var(--el-color-success);
  --el-tag-border-color: rgba(var(--el-color-success-rgb), 0.45);
}

.type-tag.el-tag--warning {
  --el-tag-bg-color: rgba(var(--el-color-warning-rgb), 0.18);
  --el-tag-text-color: var(--el-color-warning);
  --el-tag-border-color: rgba(var(--el-color-warning-rgb), 0.45);
}

.type-tag.el-tag--info {
  --el-tag-bg-color: rgba(var(--el-color-info-rgb), 0.18);
  --el-tag-text-color: var(--el-color-info);
  --el-tag-border-color: rgba(var(--el-color-info-rgb), 0.45);
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

/* 按钮样式 */
.el-button + .el-button {
  margin-left: var(--spacing-xs);
}

/* 开关样式 */
.el-switch {
  --el-switch-on-color: var(--success-color);
}

/* 对话框样式 */
.el-dialog__body {
  padding: var(--spacing-lg);
}
</style>
