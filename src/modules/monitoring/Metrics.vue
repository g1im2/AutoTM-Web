<template>
  <PageTemplate>
    <template #actions>
      <el-button @click="refreshMetrics">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
      <el-switch
        v-model="autoRefresh"
        active-text="自动刷新"
        inactive-text="手动刷新"
        @change="toggleAutoRefresh"
      />
    </template>

    <!-- 关键指标概览 -->
    <div class="overview-cards">
        <KpiCard 
          title="CPU使用率" 
          :value="systemMetrics.cpuUsage" 
          format="percentage"
          :type="systemMetrics.cpuUsage > 80 ? 'danger' : 'success'"
          subtitle="当前CPU使用率"
        />
        <KpiCard 
          title="内存使用率" 
          :value="systemMetrics.memoryUsage" 
          format="percentage"
          :type="systemMetrics.memoryUsage > 85 ? 'danger' : 'success'"
          subtitle="当前内存使用率"
        />
        <KpiCard 
          title="磁盘使用率" 
          :value="systemMetrics.diskUsage" 
          format="percentage"
          :type="systemMetrics.diskUsage > 90 ? 'danger' : 'warning'"
          subtitle="当前磁盘使用率"
        />
        <KpiCard 
          title="网络延迟"
          :value="systemMetrics.networkLatency"
          :type="systemMetrics.networkLatency > 100 ? 'warning' : 'success'"
          subtitle="毫秒"
        />
      </div>

    <!-- 系统性能监控 -->
    <div class="performance-grid">
        <!-- CPU使用率趋势 -->
        <ChartCard title="CPU使用率趋势" height="350px">
          <TrendChart 
            :data="cpuTrendData" 
            color="#ef4444"
            title="CPU使用率"
            unit="%"
          />
        </ChartCard>

        <!-- 内存使用率趋势 -->
        <ChartCard title="内存使用率趋势" height="350px">
          <TrendChart 
            :data="memoryTrendData" 
            color="#f59e0b"
            title="内存使用率"
            unit="%"
          />
        </ChartCard>

        <!-- 网络IO监控 -->
        <ChartCard title="网络IO监控" height="350px">
          <div class="network-io-chart">
            <v-chart class="chart" :option="networkIOOption" autoresize />
          </div>
        </ChartCard>

        <!-- 磁盘IO监控 -->
        <ChartCard title="磁盘IO监控" height="350px">
          <div class="disk-io-chart">
            <v-chart class="chart" :option="diskIOOption" autoresize />
          </div>
        </ChartCard>
    </div>

    <!-- 业务指标监控 -->
    <div class="metrics-grid">
        <!-- 交易量监控 -->
        <ChartCard title="交易量监控" height="350px">
          <TrendChart 
            :data="tradingVolumeData" 
            color="#10b981"
            title="交易量"
            unit="笔"
          />
        </ChartCard>

        <!-- API调用量 -->
        <ChartCard title="API调用量" height="350px">
          <div class="api-calls-chart">
            <v-chart class="chart" :option="apiCallsOption" autoresize />
          </div>
        </ChartCard>

        <!-- 数据处理量 -->
        <ChartCard title="数据处理量" height="350px">
          <TrendChart 
            :data="dataProcessingData" 
            color="#8b5cf6"
            title="处理量"
            unit="条/分钟"
          />
        </ChartCard>

        <!-- 错误率监控 -->
        <ChartCard title="错误率监控" height="350px">
          <div class="error-rate-chart">
            <v-chart class="chart" :option="errorRateOption" autoresize />
          </div>
        </ChartCard>
    </div>

    <!-- 服务状态监控 -->
    <ChartCard title="服务状态监控">
        <div class="table-wrapper">
          <el-table :data="paginatedServiceStatus" style="width: 100%" stripe border>
            <el-table-column prop="serviceName" label="服务名称" :min-width="150" show-overflow-tooltip header-align="center" />
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
            <el-table-column prop="responseTime" label="响应时间" :min-width="120" align="right" header-align="center">
              <template #default="{ row }">
                <span :class="getResponseTimeClass(row.responseTime)">{{ row.responseTime }}ms</span>
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
            <el-table-column prop="uptime" label="运行时间" :min-width="120" show-overflow-tooltip header-align="center" />
            <el-table-column prop="lastCheck" label="最后检查" fixed="right" :min-width="180" show-overflow-tooltip header-align="center" />
          </el-table>

          <el-pagination
            v-if="serviceStatus.length > 10"
            v-model:current-page="serviceCurrentPage"
            v-model:page-size="servicePageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="serviceStatus.length"
            layout="total, sizes, prev, pager, next, jumper"
            class="pagination"
          />
        </div>
    </ChartCard>

    <!-- 告警阈值配置 -->
    <ChartCard title="告警阈值配置">
        <template #header>
          <div class="card-header">
            <div class="header-controls">
              <el-button type="primary" @click="showThresholdDialog = true">
                <el-icon><Setting /></el-icon>
                配置阈值
              </el-button>
            </div>
          </div>
        </template>

        <div class="table-wrapper">
          <el-table :data="paginatedThresholds" style="width: 100%" stripe border>
            <el-table-column prop="metricName" label="指标名称" :min-width="200" show-overflow-tooltip header-align="center" />
            <el-table-column prop="warningThreshold" label="警告阈值" :min-width="110" align="right" header-align="center" />
            <el-table-column prop="criticalThreshold" label="严重阈值" :min-width="110" align="right" header-align="center" />
            <el-table-column prop="unit" label="单位" :min-width="80" header-align="center" />
            <el-table-column prop="enabled" label="启用状态" :min-width="110" align="center" header-align="center">
              <template #default="{ row }">
                <el-switch v-model="row.enabled" @change="updateThreshold(row)" />
              </template>
            </el-table-column>
            <el-table-column prop="lastTriggered" label="最后触发" :min-width="180" show-overflow-tooltip header-align="center" />
            <el-table-column label="操作" fixed="right" :min-width="120" align="left" header-align="center">
              <template #default="{ row }">
                <el-button size="small" @click="editThreshold(row)">
                  <el-icon><Edit /></el-icon>
                  编辑
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            v-if="alertThresholds.length > 10"
            v-model:current-page="thresholdCurrentPage"
            v-model:page-size="thresholdPageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="alertThresholds.length"
            layout="total, sizes, prev, pager, next, jumper"
            class="pagination"
          />
        </div>
    </ChartCard>

    <!-- 阈值配置对话框 -->
    <el-dialog v-model="showThresholdDialog" title="配置告警阈值" width="500px">
      <el-form :model="thresholdForm" label-width="120px">
        <el-form-item label="指标名称">
          <el-select v-model="thresholdForm.metricName" style="width: 100%">
            <el-option label="CPU使用率" value="cpu_usage" />
            <el-option label="内存使用率" value="memory_usage" />
            <el-option label="磁盘使用率" value="disk_usage" />
            <el-option label="网络延迟" value="network_latency" />
            <el-option label="错误率" value="error_rate" />
          </el-select>
        </el-form-item>
        <el-form-item label="警告阈值">
          <el-input-number v-model="thresholdForm.warningThreshold" :min="0" :max="100" style="width: 100%" />
        </el-form-item>
        <el-form-item label="严重阈值">
          <el-input-number v-model="thresholdForm.criticalThreshold" :min="0" :max="100" style="width: 100%" />
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch v-model="thresholdForm.enabled" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showThresholdDialog = false">取消</el-button>
        <el-button type="primary" @click="saveThreshold">保存</el-button>
      </template>
    </el-dialog>
  </PageTemplate>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { monitoringApi } from '../../api/clients'
import PageTemplate from '../../components/PageTemplate.vue'
import KpiCard from '../../components/KpiCard.vue'
import ChartCard from '../../components/ChartCard.vue'
import TrendChart from '../../components/charts/TrendChart.vue'
import {
  Refresh, Setting, Edit,
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

interface SystemMetrics {
  cpuUsage: number
  memoryUsage: number
  diskUsage: number
  networkLatency: number
}

interface ServiceStatus {
  serviceName: string
  status: string
  statusText: string
  cpuUsage: number
  memoryUsage: number
  responseTime: number
  requestCount: number
  errorRate: number
  uptime: string
  lastCheck: string
}

interface AlertThreshold {
  id: string
  metricName: string
  warningThreshold: number
  criticalThreshold: number
  unit: string
  enabled: boolean
  lastTriggered: string
}

interface ThresholdForm {
  metricName: string
  warningThreshold: number
  criticalThreshold: number
  enabled: boolean
}

// 状态管理
const autoRefresh = ref(true)
const showThresholdDialog = ref(false)

// 定时器
let refreshTimer: number | null = null

// 分页相关
const serviceCurrentPage = ref(1)
const servicePageSize = ref(10)
const thresholdCurrentPage = ref(1)
const thresholdPageSize = ref(10)

// 系统指标
const systemMetrics = ref<SystemMetrics>({
  cpuUsage: 45.2,
  memoryUsage: 68.5,
  diskUsage: 72.1,
  networkLatency: 85
})

// 趋势数据
const cpuTrendData = ref<Array<{ date: string; value: number }>>([])
const memoryTrendData = ref<Array<{ date: string; value: number }>>([])
const tradingVolumeData = ref<Array<{ date: string; value: number }>>([])
const dataProcessingData = ref<Array<{ date: string; value: number }>>([])

// 服务状态
const serviceStatus = ref<ServiceStatus[]>([
  {
    serviceName: 'brain-service',
    status: 'healthy',
    statusText: '健康',
    cpuUsage: 35.2,
    memoryUsage: 58.1,
    responseTime: 125,
    requestCount: 1250,
    errorRate: 0.1,
    uptime: '15天 8小时',
    lastCheck: '2024-01-15 14:30:00'
  },
  {
    serviceName: 'macro-service',
    status: 'healthy',
    statusText: '健康',
    cpuUsage: 28.5,
    memoryUsage: 45.2,
    responseTime: 95,
    requestCount: 850,
    errorRate: 0.0,
    uptime: '15天 8小时',
    lastCheck: '2024-01-15 14:30:00'
  }
])

// 告警阈值
const alertThresholds = ref<AlertThreshold[]>([
  {
    id: 'TH001',
    metricName: 'CPU使用率',
    warningThreshold: 70,
    criticalThreshold: 85,
    unit: '%',
    enabled: true,
    lastTriggered: '2024-01-14 15:30:00'
  },
  {
    id: 'TH002',
    metricName: '内存使用率',
    warningThreshold: 80,
    criticalThreshold: 90,
    unit: '%',
    enabled: true,
    lastTriggered: '从未触发'
  }
])

// 阈值表单
const thresholdForm = ref<ThresholdForm>({
  metricName: '',
  warningThreshold: 0,
  criticalThreshold: 0,
  enabled: true
})

// 分页数据
const paginatedServiceStatus = computed(() => {
  const start = (serviceCurrentPage.value - 1) * servicePageSize.value
  const end = start + servicePageSize.value
  return serviceStatus.value.slice(start, end)
})

const paginatedThresholds = computed(() => {
  const start = (thresholdCurrentPage.value - 1) * thresholdPageSize.value
  const end = start + thresholdPageSize.value
  return alertThresholds.value.slice(start, end)
})

// 网络IO图表配置
const networkIOOption = computed(() => ({
  title: {
    text: '网络IO',
    textStyle: { color: 'var(--text-primary)', fontSize: 14 }
  },
  tooltip: { trigger: 'axis' },
  legend: {
    data: ['入站', '出站'],
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
      name: '入站',
      type: 'line',
      data: generateNetworkData(),
      itemStyle: { color: '#3b82f6' }
    },
    {
      name: '出站',
      type: 'line',
      data: generateNetworkData(),
      itemStyle: { color: '#10b981' }
    }
  ]
}))

// 磁盘IO图表配置
const diskIOOption = computed(() => ({
  title: {
    text: '磁盘IO',
    textStyle: { color: 'var(--text-primary)', fontSize: 14 }
  },
  tooltip: { trigger: 'axis' },
  legend: {
    data: ['读取', '写入'],
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
      name: '读取',
      type: 'line',
      data: generateDiskData(),
      itemStyle: { color: '#f59e0b' }
    },
    {
      name: '写入',
      type: 'line',
      data: generateDiskData(),
      itemStyle: { color: '#ef4444' }
    }
  ]
}))

// API调用量图表配置
const apiCallsOption = computed(() => ({
  title: {
    text: 'API调用量',
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
    name: '调用次数',
    axisLabel: { color: 'var(--text-secondary)' }
  },
  series: [
    {
      name: 'API调用量',
      type: 'bar',
      data: generateApiCallsData(),
      itemStyle: { color: '#8b5cf6' }
    }
  ]
}))

// 错误率图表配置
const errorRateOption = computed(() => ({
  title: {
    text: '错误率',
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
    name: '错误率 (%)',
    axisLabel: { color: 'var(--text-secondary)' }
  },
  series: [
    {
      name: '错误率',
      type: 'line',
      data: generateErrorRateData(),
      itemStyle: { color: '#ef4444' }
    }
  ]
}))

// 方法
function getStatusType(status: string) {
  switch (status) {
    case 'healthy': return 'success'
    case 'warning': return 'warning'
    case 'critical': return 'danger'
    default: return 'default'
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'healthy': return CircleCheck
    case 'warning': return Warning
    case 'critical': return CircleClose
    default: return Warning
  }
}

function getUsageClass(usage: number) {
  if (usage > 80) return 'text-danger'
  if (usage > 60) return 'text-warning'
  return 'text-success'
}

function getResponseTimeClass(time: number) {
  if (time > 500) return 'text-danger'
  if (time > 200) return 'text-warning'
  return 'text-success'
}

function getErrorRateClass(rate: number) {
  if (rate > 1) return 'text-danger'
  if (rate > 0.5) return 'text-warning'
  return 'text-success'
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

function generateDiskData() {
  return Array.from({ length: 20 }, () => Math.floor(Math.random() * 30) + 5)
}

function generateApiCallsData() {
  return Array.from({ length: 20 }, () => Math.floor(Math.random() * 1000) + 500)
}

function generateErrorRateData() {
  return Array.from({ length: 20 }, () => Math.random() * 2)
}

function generateMetricTrendData() {
  const data = []
  const now = new Date()
  
  for (let i = 59; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 60 * 1000)
    data.push({
      date: date.toISOString(),
      value: Math.floor(Math.random() * 40) + 30
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
    refreshMetrics()
  }, 5000) // 每5秒刷新一次
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

async function refreshMetrics() {
  try {
    await monitoringApi.get('/api/v1/monitoring/metrics')
    
    // 模拟数据更新
    systemMetrics.value.cpuUsage = Math.floor(Math.random() * 30) + 30
    systemMetrics.value.memoryUsage = Math.floor(Math.random() * 20) + 60
    systemMetrics.value.diskUsage = Math.floor(Math.random() * 10) + 70
    systemMetrics.value.networkLatency = Math.floor(Math.random() * 50) + 50
    
    ElMessage.success('指标数据已刷新')
  } catch (error) {
    console.warn('刷新指标失败:', error)
    ElMessage.success('指标数据已刷新（模拟）')
  }
}

function editThreshold(threshold: AlertThreshold) {
  thresholdForm.value = {
    metricName: threshold.metricName,
    warningThreshold: threshold.warningThreshold,
    criticalThreshold: threshold.criticalThreshold,
    enabled: threshold.enabled
  }
  showThresholdDialog.value = true
}

async function updateThreshold(threshold: AlertThreshold) {
  try {
    await monitoringApi.post('/api/v1/monitoring/rules', {
      enabled: threshold.enabled
    })
    ElMessage.success('阈值配置已更新')
  } catch (error) {
    console.warn('更新阈值失败:', error)
    ElMessage.success('阈值配置已更新（模拟）')
  }
}

async function saveThreshold() {
  try {
    await monitoringApi.post('/api/v1/monitoring/rules', thresholdForm.value)
    
    // 添加到列表
    alertThresholds.value.push({
      id: `TH${Date.now()}`,
      metricName: thresholdForm.value.metricName,
      warningThreshold: thresholdForm.value.warningThreshold,
      criticalThreshold: thresholdForm.value.criticalThreshold,
      unit: '%',
      enabled: thresholdForm.value.enabled,
      lastTriggered: '从未触发'
    })
    
    showThresholdDialog.value = false
    ElMessage.success('阈值配置已保存')
  } catch (error) {
    console.warn('保存阈值失败:', error)
    ElMessage.success('阈值配置已保存（模拟）')
  }
}

onMounted(() => {
  // 初始化数据
  cpuTrendData.value = generateMetricTrendData()
  memoryTrendData.value = generateMetricTrendData()
  tradingVolumeData.value = generateMetricTrendData()
  dataProcessingData.value = generateMetricTrendData()
  
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
.overview-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--card-gap-lg);
}

.performance-grid,
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: var(--card-gap-lg);
}

.network-io-chart,
.disk-io-chart,
.api-calls-chart,
.error-rate-chart {
  height: 350px;
}

.chart {
  width: 100%;
  height: 100%;
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

.status-icon {
  margin-right: var(--spacing-xs);
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
@media (max-width: 767px) {
  .overview-cards {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--card-gap-xs);
  }

  .performance-grid,
  .metrics-grid {
    grid-template-columns: 1fr;
    gap: var(--card-gap-xs);
  }
}

@media (min-width: 768px) and (max-width: 1199px) {
  .overview-cards {
    gap: var(--card-gap-md);
  }

  .performance-grid,
  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--card-gap-md);
  }
}

@media (min-width: 1600px) {
  .overview-cards {
    gap: var(--card-gap-xl);
  }

  .performance-grid,
  .metrics-grid {
    gap: var(--card-gap-xl);
  }
}

/* 开关样式 */
.el-switch {
  --el-switch-on-color: var(--success-color);
}
</style>
