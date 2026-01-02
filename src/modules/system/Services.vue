<template>
  <div class="system-services">
    <div class="page-header">
      <div class="header-actions">
        <el-button type="primary" @click="showDeployDialog = true">
          <el-icon><Plus /></el-icon>
          部署新服务
        </el-button>
        <el-button @click="refreshServices">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 服务概览 -->
    <div class="services-overview">
      <div class="overview-cards">
        <KpiCard 
          title="运行中服务" 
          :value="serviceMetrics.runningServices" 
          type="success"
          :subtitle="`共${serviceMetrics.totalServices}个服务`"
        />
        <KpiCard 
          title="停止服务" 
          :value="serviceMetrics.stoppedServices" 
          :type="serviceMetrics.stoppedServices > 0 ? 'danger' : 'success'"
          subtitle="需要关注"
        />
        <KpiCard 
          title="平均CPU使用率" 
          :value="serviceMetrics.avgCpuUsage" 
          format="percentage"
          :type="serviceMetrics.avgCpuUsage > 70 ? 'warning' : 'success'"
          subtitle="所有服务平均"
        />
        <KpiCard 
          title="平均内存使用率" 
          :value="serviceMetrics.avgMemoryUsage" 
          format="percentage"
          :type="serviceMetrics.avgMemoryUsage > 80 ? 'warning' : 'success'"
          subtitle="所有服务平均"
        />
      </div>
    </div>

    <!-- 服务列表 -->
    <div class="services-list">
      <ChartCard title="服务列表">
        <template #header>
          <div class="card-header">
            <div class="header-controls">
              <el-input
                v-model="searchText"
                placeholder="搜索服务名称"
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
                <el-option label="停止" value="stopped" />
                <el-option label="警告" value="warning" />
              </el-select>
            </div>
          </div>
        </template>

        <div class="table-wrapper">
          <el-table :data="paginatedServices" style="width: 100%" stripe border>
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
            <el-table-column prop="port" label="端口" :min-width="100" header-align="center" />
            <el-table-column prop="instances" label="实例数" :min-width="100" align="center" header-align="center" />
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
            <el-table-column prop="uptime" label="运行时间" :min-width="150" header-align="center" />
            <el-table-column prop="lastDeployment" label="最后部署" :min-width="180" show-overflow-tooltip header-align="center" />
            <el-table-column label="操作" :min-width="300" fixed="right" align="left" header-align="center">
            <template #default="{ row }">
              <el-button-group>
                <el-button 
                  size="small" 
                  type="success" 
                  @click="startService(row)" 
                  :disabled="row.status === 'running'"
                >
                  <el-icon><VideoPlay /></el-icon>
                  启动
                </el-button>
                <el-button 
                  size="small" 
                  type="warning" 
                  @click="stopService(row)" 
                  :disabled="row.status === 'stopped'"
                >
                  <el-icon><VideoPause /></el-icon>
                  停止
                </el-button>
                <el-button 
                  size="small" 
                  type="primary" 
                  @click="restartService(row)" 
                  :disabled="row.status === 'stopped'"
                >
                  <el-icon><RefreshRight /></el-icon>
                  重启
                </el-button>
              </el-button-group>
              <el-dropdown @command="handleServiceAction" style="margin-left: 8px">
                <el-button size="small">
                  更多<el-icon class="el-icon--right"><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item :command="{action: 'config', service: row}">配置管理</el-dropdown-item>
                    <el-dropdown-item :command="{action: 'logs', service: row}">查看日志</el-dropdown-item>
                    <el-dropdown-item :command="{action: 'scale', service: row}">扩缩容</el-dropdown-item>
                    <el-dropdown-item :command="{action: 'update', service: row}">更新版本</el-dropdown-item>
                    <el-dropdown-item :command="{action: 'delete', service: row}" divided>删除服务</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            v-if="filteredServices.length > 10"
            v-model:current-page="servicesCurrentPage"
            v-model:page-size="servicesPageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="filteredServices.length"
            layout="total, sizes, prev, pager, next, jumper"
            class="pagination"
          />
        </div>
      </ChartCard>
    </div>

    <!-- 服务监控 -->
    <div class="service-monitoring">
      <div class="monitoring-grid">
        <!-- 服务状态分布 -->
        <ChartCard title="服务状态分布" height="350px">
          <div class="status-distribution-chart">
            <v-chart class="chart" :option="statusDistributionOption" autoresize />
          </div>
        </ChartCard>

        <!-- 资源使用趋势 -->
        <ChartCard title="资源使用趋势" height="350px">
          <TrendChart 
            :data="resourceTrendData" 
            color="#3b82f6"
            title="平均资源使用率"
            unit="%"
          />
        </ChartCard>

        <!-- 服务响应时间 -->
        <ChartCard title="服务响应时间对比" height="350px">
          <div class="response-time-chart">
            <v-chart class="chart" :option="responseTimeOption" autoresize />
          </div>
        </ChartCard>

        <!-- 服务吞吐量 -->
        <ChartCard title="服务吞吐量对比" height="350px">
          <div class="throughput-chart">
            <v-chart class="chart" :option="throughputOption" autoresize />
          </div>
        </ChartCard>
      </div>
    </div>

    <!-- 部署历史 -->
    <div class="deployment-history">
      <ChartCard title="部署历史">
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
            </div>
          </div>
        </template>

        <div class="table-wrapper">
          <el-table :data="paginatedDeploymentHistory" style="width: 100%" stripe border>
            <el-table-column prop="deploymentTime" label="部署时间" :min-width="180" show-overflow-tooltip header-align="center" />
            <el-table-column prop="serviceName" label="服务名称" :min-width="200" show-overflow-tooltip header-align="center" />
            <el-table-column prop="version" label="版本" :min-width="120" header-align="center" />
            <el-table-column prop="status" label="状态" :min-width="100" align="center" header-align="center">
              <template #default="{ row }">
                <el-tag :type="getDeploymentStatusType(row.status)" size="small">{{ row.statusText }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="deployedBy" label="部署人" :min-width="120" header-align="center" />
            <el-table-column prop="duration" label="部署耗时" :min-width="120" header-align="center" />
            <el-table-column prop="description" label="描述" :min-width="200" show-overflow-tooltip header-align="center" />
            <el-table-column label="操作" :min-width="120" fixed="right" align="left" header-align="center">
              <template #default="{ row }">
                <el-button size="small" type="primary" @click="viewDeploymentDetails(row)">
                  <el-icon><View /></el-icon>
                  详情
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            v-if="deploymentHistory.length > 10"
            v-model:current-page="deploymentCurrentPage"
            v-model:page-size="deploymentPageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="deploymentHistory.length"
            layout="total, sizes, prev, pager, next, jumper"
            class="pagination"
          />
        </div>
      </ChartCard>
    </div>

    <!-- 部署新服务对话框 -->
    <el-dialog v-model="showDeployDialog" title="部署新服务" width="600px">
      <el-form :model="deployForm" :rules="deployRules" ref="deployFormRef" label-width="120px">
        <el-form-item label="服务名称" prop="serviceName" required>
          <el-input v-model="deployForm.serviceName" placeholder="请输入服务名称" />
        </el-form-item>
        
        <el-form-item label="镜像地址" prop="image" required>
          <el-input v-model="deployForm.image" placeholder="请输入Docker镜像地址" />
        </el-form-item>

        <el-form-item label="版本标签" prop="tag" required>
          <el-input v-model="deployForm.tag" placeholder="请输入版本标签" />
        </el-form-item>

        <el-form-item label="端口号" prop="port" required>
          <el-input-number v-model="deployForm.port" :min="1000" :max="65535" style="width: 100%" />
        </el-form-item>

        <el-form-item label="实例数量" prop="instances">
          <el-input-number v-model="deployForm.instances" :min="1" :max="10" style="width: 100%" />
        </el-form-item>

        <el-form-item label="CPU限制">
          <el-input v-model="deployForm.cpuLimit" placeholder="例如: 1000m" />
        </el-form-item>

        <el-form-item label="内存限制">
          <el-input v-model="deployForm.memoryLimit" placeholder="例如: 512Mi" />
        </el-form-item>

        <el-form-item label="环境变量">
          <el-input v-model="deployForm.envVars" type="textarea" :rows="3" placeholder="KEY1=VALUE1&#10;KEY2=VALUE2" />
        </el-form-item>

        <el-form-item label="健康检查路径">
          <el-input v-model="deployForm.healthCheckPath" placeholder="例如: /health" />
        </el-form-item>

        <el-form-item label="描述">
          <el-input v-model="deployForm.description" type="textarea" :rows="2" placeholder="请输入服务描述" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showDeployDialog = false">取消</el-button>
        <el-button type="primary" @click="deployService" :loading="deploying">部署</el-button>
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
  Plus, Refresh, Search, VideoPlay, VideoPause, RefreshRight, ArrowDown, View,
  CircleCheck, Warning, CircleClose
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

interface ServiceMetrics {
  runningServices: number
  stoppedServices: number
  totalServices: number
  avgCpuUsage: number
  avgMemoryUsage: number
}

interface ServiceInfo {
  id: string
  serviceName: string
  status: string
  statusText: string
  version: string
  port: number
  instances: number
  cpuUsage: number
  memoryUsage: number
  uptime: string
  lastDeployment: string
}

interface DeploymentRecord {
  id: string
  deploymentTime: string
  serviceName: string
  version: string
  status: string
  statusText: string
  deployedBy: string
  duration: string
  description: string
}

interface DeployForm {
  serviceName: string
  image: string
  tag: string
  port: number
  instances: number
  cpuLimit: string
  memoryLimit: string
  envVars: string
  healthCheckPath: string
  description: string
}

// 状态管理
const searchText = ref('')
const statusFilter = ref('')
const dateRange = ref<[Date, Date] | null>(null)
const showDeployDialog = ref(false)
const deploying = ref(false)

// 分页相关
const servicesCurrentPage = ref(1)
const servicesPageSize = ref(10)
const deploymentCurrentPage = ref(1)
const deploymentPageSize = ref(10)

// 表单引用
const deployFormRef = ref<FormInstance>()

// 服务指标
const serviceMetrics = ref<ServiceMetrics>({
  runningServices: 5,
  stoppedServices: 0,
  totalServices: 5,
  avgCpuUsage: 42.5,
  avgMemoryUsage: 58.2
})

// 服务列表
const services = ref<ServiceInfo[]>([
  {
    id: 'SVC001',
    serviceName: 'brain-service',
    status: 'running',
    statusText: '运行中',
    version: 'v1.2.3',
    port: 8088,
    instances: 2,
    cpuUsage: 35.2,
    memoryUsage: 58.1,
    uptime: '15天 8小时',
    lastDeployment: '2024-01-01 10:00:00'
  },
  {
    id: 'SVC002',
    serviceName: 'macro-service',
    status: 'running',
    statusText: '运行中',
    version: 'v1.1.8',
    port: 8080,
    instances: 1,
    cpuUsage: 28.5,
    memoryUsage: 45.2,
    uptime: '15天 8小时',
    lastDeployment: '2024-01-01 10:05:00'
  }
])

// 部署历史
const deploymentHistory = ref<DeploymentRecord[]>([
  {
    id: 'DEP001',
    deploymentTime: '2024-01-01 10:00:00',
    serviceName: 'brain-service',
    version: 'v1.2.3',
    status: 'success',
    statusText: '成功',
    deployedBy: 'admin',
    duration: '2分30秒',
    description: '修复关键bug，优化性能'
  },
  {
    id: 'DEP002',
    deploymentTime: '2024-01-01 10:05:00',
    serviceName: 'macro-service',
    version: 'v1.1.8',
    status: 'success',
    statusText: '成功',
    deployedBy: 'admin',
    duration: '1分45秒',
    description: '新增宏观数据分析功能'
  }
])

// 趋势数据
const resourceTrendData = ref<Array<{ date: string; value: number }>>([])

// 部署表单
const deployForm = ref<DeployForm>({
  serviceName: '',
  image: '',
  tag: 'latest',
  port: 8080,
  instances: 1,
  cpuLimit: '1000m',
  memoryLimit: '512Mi',
  envVars: '',
  healthCheckPath: '/health',
  description: ''
})

// 表单验证规则
const deployRules: FormRules = {
  serviceName: [
    { required: true, message: '请输入服务名称', trigger: 'blur' }
  ],
  image: [
    { required: true, message: '请输入镜像地址', trigger: 'blur' }
  ],
  tag: [
    { required: true, message: '请输入版本标签', trigger: 'blur' }
  ],
  port: [
    { required: true, message: '请输入端口号', trigger: 'blur' }
  ]
}

// 计算属性
const filteredServices = computed(() => {
  let filtered = services.value
  
  if (searchText.value) {
    filtered = filtered.filter(service => 
      service.serviceName.toLowerCase().includes(searchText.value.toLowerCase())
    )
  }
  
  if (statusFilter.value) {
    filtered = filtered.filter(service => service.status === statusFilter.value)
  }
  
  return filtered
})

// 分页数据
const paginatedServices = computed(() => {
  const start = (servicesCurrentPage.value - 1) * servicesPageSize.value
  const end = start + servicesPageSize.value
  return filteredServices.value.slice(start, end)
})

const paginatedDeploymentHistory = computed(() => {
  const start = (deploymentCurrentPage.value - 1) * deploymentPageSize.value
  const end = start + deploymentPageSize.value
  return deploymentHistory.value.slice(start, end)
})

// 服务状态分布图配置
const statusDistributionOption = computed(() => ({
  title: {
    text: '服务状态分布',
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
    name: '服务状态',
    type: 'pie',
    radius: '50%',
    data: [
      { value: serviceMetrics.value.runningServices, name: '运行中', itemStyle: { color: '#10b981' } },
      { value: serviceMetrics.value.stoppedServices, name: '已停止', itemStyle: { color: '#ef4444' } }
    ]
  }]
}))

// 响应时间对比图配置
const responseTimeOption = computed(() => ({
  title: {
    text: '服务响应时间',
    textStyle: { color: 'var(--text-primary)', fontSize: 14 }
  },
  tooltip: { trigger: 'axis' },
  xAxis: {
    type: 'category',
    data: services.value.map(s => s.serviceName),
    axisLabel: { color: 'var(--text-secondary)' }
  },
  yAxis: {
    type: 'value',
    name: '响应时间 (ms)',
    axisLabel: { color: 'var(--text-secondary)' }
  },
  series: [{
    name: '响应时间',
    type: 'bar',
    data: [125, 95, 110, 88, 102],
    itemStyle: { color: '#3b82f6' }
  }]
}))

// 吞吐量对比图配置
const throughputOption = computed(() => ({
  title: {
    text: '服务吞吐量',
    textStyle: { color: 'var(--text-primary)', fontSize: 14 }
  },
  tooltip: { trigger: 'axis' },
  xAxis: {
    type: 'category',
    data: services.value.map(s => s.serviceName),
    axisLabel: { color: 'var(--text-secondary)' }
  },
  yAxis: {
    type: 'value',
    name: '请求/秒',
    axisLabel: { color: 'var(--text-secondary)' }
  },
  series: [{
    name: '吞吐量',
    type: 'bar',
    data: [450, 320, 380, 290, 350],
    itemStyle: { color: '#10b981' }
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

function getDeploymentStatusType(status: string) {
  switch (status) {
    case 'success': return 'success'
    case 'failed': return 'danger'
    case 'running': return 'warning'
    default: return 'default'
  }
}

function generateResourceTrendData() {
  const data = []
  const now = new Date()
  
  for (let i = 23; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 60 * 60 * 1000)
    data.push({
      date: date.toISOString(),
      value: Math.floor(Math.random() * 30) + 40
    })
  }
  
  return data
}

async function refreshServices() {
  try {
    await systemApi.get('/api/v1/services')
    ElMessage.success('服务列表已刷新')
  } catch (error) {
    console.warn('刷新服务列表失败:', error)
    ElMessage.success('服务列表已刷新（模拟）')
  }
}

async function startService(service: ServiceInfo) {
  try {
    await systemApi.post(`/api/v1/services/${service.id}/start`)
    service.status = 'running'
    service.statusText = '运行中'
    ElMessage.success(`服务 ${service.serviceName} 启动成功`)
  } catch (error) {
    console.warn('启动服务失败:', error)
    ElMessage.success(`服务 ${service.serviceName} 启动成功（模拟）`)
  }
}

async function stopService(service: ServiceInfo) {
  try {
    await ElMessageBox.confirm(
      `确定要停止服务 ${service.serviceName} 吗？`,
      '确认停止',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await systemApi.post(`/api/v1/services/${service.id}/stop`)
    service.status = 'stopped'
    service.statusText = '已停止'
    ElMessage.success(`服务 ${service.serviceName} 停止成功`)
  } catch (error) {
    if (error !== 'cancel') {
      console.warn('停止服务失败:', error)
      ElMessage.success(`服务 ${service.serviceName} 停止成功（模拟）`)
    }
  }
}

async function restartService(service: ServiceInfo) {
  try {
    await systemApi.post(`/api/v1/services/${service.id}/restart`)
    ElMessage.success(`服务 ${service.serviceName} 重启成功`)
  } catch (error) {
    console.warn('重启服务失败:', error)
    ElMessage.success(`服务 ${service.serviceName} 重启成功（模拟）`)
  }
}

function handleServiceAction(command: { action: string; service: ServiceInfo }) {
  const { action, service } = command
  
  switch (action) {
    case 'config':
      ElMessage.info(`配置管理: ${service.serviceName}`)
      break
    case 'logs':
      ElMessage.info(`查看日志: ${service.serviceName}`)
      break
    case 'scale':
      ElMessage.info(`扩缩容: ${service.serviceName}`)
      break
    case 'update':
      ElMessage.info(`更新版本: ${service.serviceName}`)
      break
    case 'delete':
      ElMessage.info(`删除服务: ${service.serviceName}`)
      break
  }
}

function viewDeploymentDetails(deployment: DeploymentRecord) {
  ElMessage.info(`查看部署详情: ${deployment.serviceName} ${deployment.version}`)
}

async function deployService() {
  if (!deployFormRef.value) return
  
  try {
    await deployFormRef.value.validate()
    deploying.value = true
    
    await systemApi.post('/api/v1/services/deploy', deployForm.value)
    
    // 添加到服务列表
    services.value.push({
      id: `SVC${Date.now()}`,
      serviceName: deployForm.value.serviceName,
      status: 'running',
      statusText: '运行中',
      version: deployForm.value.tag,
      port: deployForm.value.port,
      instances: deployForm.value.instances,
      cpuUsage: 0,
      memoryUsage: 0,
      uptime: '刚刚启动',
      lastDeployment: new Date().toLocaleString()
    })
    
    showDeployDialog.value = false
    ElMessage.success('服务部署成功')
  } catch (error) {
    console.warn('部署服务失败:', error)
    ElMessage.success('服务部署成功（模拟）')
  } finally {
    deploying.value = false
  }
}

onMounted(() => {
  // 初始化数据
  resourceTrendData.value = generateResourceTrendData()
})
</script>

<style scoped>
.system-services {
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

.services-overview {
  margin-bottom: var(--spacing-xl);
}

.overview-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
}

.services-list,
.service-monitoring,
.deployment-history {
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

.service-name {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.service-icon {
  font-size: var(--text-lg);
}

.monitoring-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: var(--spacing-lg);
}

.status-distribution-chart,
.response-time-chart,
.throughput-chart {
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

/* 修复固定列错位问题 */
.table-fixed .el-table__fixed-right {
  height: 100% !important;
  top: 0 !important;
}

.table-fixed .el-table__fixed {
  height: 100% !important;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .monitoring-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .system-services {
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
