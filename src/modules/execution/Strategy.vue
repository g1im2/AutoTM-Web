<template>
  <PageTemplate>
    <template #actions>
      <el-button type="primary" @click="showCreateDialog = true">
        <el-icon><Plus /></el-icon>
        新建策略
      </el-button>
      <el-button @click="importStrategy">
        <el-icon><Upload /></el-icon>
        导入策略
      </el-button>
    </template>

    <!-- 策略概览 -->
    <div class="overview-cards">
        <KpiCard 
          title="策略总数" 
          :value="strategyMetrics.totalStrategies" 
          subtitle="已创建策略"
        />
        <KpiCard
          title="运行中策略"
          :value="strategyMetrics.runningStrategies"
          type="success"
          subtitle="正在分析"
        />
        <KpiCard 
          title="平均收益率" 
          :value="strategyMetrics.avgReturn" 
          format="percentage"
          :type="strategyMetrics.avgReturn > 0 ? 'success' : 'danger'"
          subtitle="所有策略平均"
        />
        <KpiCard 
          title="最佳策略收益" 
          :value="strategyMetrics.bestReturn" 
          format="percentage"
          type="success"
          subtitle="表现最佳策略"
        />
      </div>

    <!-- 策略列表 -->
    <ChartCard title="策略列表">
        <template #header>
          <div class="card-header">
            <div class="header-controls">
              <el-input
                v-model="searchText"
                placeholder="搜索策略名称或标签"
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
                <el-option label="已停止" value="stopped" />
                <el-option label="测试中" value="testing" />
                <el-option label="错误" value="error" />
              </el-select>
            </div>
          </div>
        </template>

        <div class="table-wrapper">
          <el-table :data="paginatedStrategies" style="width: 100%" stripe border>
            <el-table-column prop="name" label="策略名称" :min-width="200" header-align="center">
              <template #default="{ row }">
                <div class="strategy-name">
                  <span class="name">{{ row.name }}</span>
                  <div class="tags">
                    <el-tag v-for="tag in row.tags" :key="tag" size="small" type="info">{{ tag }}</el-tag>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="type" label="类型" :min-width="120" header-align="center">
              <template #default="{ row }">
                <el-tag :type="getStrategyTypeColor(row.type)">{{ row.type }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" :min-width="100" align="center" header-align="center">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)" size="small">{{ row.statusText }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="return" label="收益率" :min-width="120" align="right" header-align="center">
              <template #default="{ row }">
                <span :class="getReturnClass(row.return)">
                  {{ row.return > 0 ? '+' : '' }}{{ row.return.toFixed(2) }}%
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="sharpe" label="夏普比率" :min-width="120" align="right" header-align="center">
              <template #default="{ row }">
                {{ row.sharpe.toFixed(3) }}
              </template>
            </el-table-column>
            <el-table-column prop="maxDrawdown" label="最大回撤" :min-width="120" align="right" header-align="center">
              <template #default="{ row }">
                <span class="text-danger">{{ row.maxDrawdown.toFixed(2) }}%</span>
              </template>
            </el-table-column>
            <el-table-column prop="lastUpdate" label="最后更新" :min-width="180" show-overflow-tooltip header-align="center" />
            <el-table-column label="操作" :min-width="200" fixed="right" align="left" header-align="center">
              <template #default="{ row }">
                <el-button size="small" type="primary" @click="viewStrategy(row)">
                  <el-icon><View /></el-icon>
                  查看
                </el-button>
                <el-button
                  size="small"
                  :type="row.status === 'running' ? 'danger' : 'success'"
                  @click="toggleStrategy(row)"
                >
                  <el-icon v-if="row.status === 'running'"><VideoPause /></el-icon>
                  <el-icon v-else><VideoPlay /></el-icon>
                  {{ row.status === 'running' ? '停止' : '启动' }}
                </el-button>
                <el-button size="small" @click="editStrategy(row)">
                  <el-icon><Edit /></el-icon>
                  编辑
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            v-if="filteredStrategies.length > 10"
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="filteredStrategies.length"
            layout="total, sizes, prev, pager, next, jumper"
            class="pagination"
          />
        </div>
      </ChartCard>

    <!-- 策略性能对比 -->
    <ChartCard title="策略性能对比" height="400px">
      <div class="comparison-chart">
        <v-chart class="chart" :option="performanceComparisonOption" autoresize />
      </div>
    </ChartCard>

    <!-- 策略详情对话框 -->
    <el-dialog v-model="showDetailDialog" :title="selectedStrategy?.name" width="1000px">
      <div v-if="selectedStrategy" class="strategy-detail">
        <!-- 策略基本信息 -->
        <div class="detail-section">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="策略类型">{{ selectedStrategy.type }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ selectedStrategy.createTime }}</el-descriptions-item>
            <el-descriptions-item label="运行状态">
              <el-tag :type="getStatusType(selectedStrategy.status)">{{ selectedStrategy.statusText }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="最后更新">{{ selectedStrategy.lastUpdate }}</el-descriptions-item>
            <el-descriptions-item label="描述" :span="2">{{ selectedStrategy.description }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 策略参数 -->
        <div class="detail-section">
          <el-table :data="selectedStrategy.parameters" style="width: 100%" size="small" border stripe>
            <el-table-column prop="name" label="参数名" :min-width="200" show-overflow-tooltip header-align="center" />
            <el-table-column prop="value" label="当前值" :min-width="150" header-align="center" />
            <el-table-column prop="description" label="说明" :min-width="250" show-overflow-tooltip header-align="center" />
          </el-table>
        </div>

        <!-- 绩效指标 -->
        <div class="detail-section">
          <div class="metrics-grid">
            <div class="metric-item">
              <span class="metric-label">总收益率</span>
              <span class="metric-value" :class="getReturnClass(selectedStrategy.return)">
                {{ selectedStrategy.return > 0 ? '+' : '' }}{{ selectedStrategy.return.toFixed(2) }}%
              </span>
            </div>
            <div class="metric-item">
              <span class="metric-label">年化收益率</span>
              <span class="metric-value">{{ selectedStrategy.annualizedReturn.toFixed(2) }}%</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">夏普比率</span>
              <span class="metric-value">{{ selectedStrategy.sharpe.toFixed(3) }}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">最大回撤</span>
              <span class="metric-value text-danger">{{ selectedStrategy.maxDrawdown.toFixed(2) }}%</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">胜率</span>
              <span class="metric-value">{{ selectedStrategy.winRate.toFixed(1) }}%</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">交易次数</span>
              <span class="metric-value">{{ selectedStrategy.tradeCount }}</span>
            </div>
          </div>
        </div>

        <!-- 收益曲线 -->
        <div class="detail-section">
          <div style="height: 300px;">
            <TrendChart :data="strategyReturnData" color="#3b82f6" />
          </div>
        </div>
      </div>
      
      <template #footer>
        <el-button @click="showDetailDialog = false">关闭</el-button>
        <el-button type="primary" @click="editStrategy(selectedStrategy)">编辑策略</el-button>
      </template>
    </el-dialog>

    <!-- 创建策略对话框 -->
    <el-dialog v-model="showCreateDialog" title="创建新策略" width="800px">
      <el-form :model="createForm" label-width="120px">
        <el-form-item label="策略名称" required>
          <el-input v-model="createForm.name" placeholder="请输入策略名称" />
        </el-form-item>
        <el-form-item label="策略类型" required>
          <el-select v-model="createForm.type" placeholder="选择策略类型" style="width: 100%">
            <el-option label="趋势跟踪" value="trend" />
            <el-option label="均值回归" value="mean_reversion" />
            <el-option label="动量策略" value="momentum" />
            <el-option label="套利策略" value="arbitrage" />
            <el-option label="机器学习" value="ml" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="createForm.description" type="textarea" :rows="3" placeholder="策略描述" />
        </el-form-item>
        <el-form-item label="标签">
          <el-input v-model="createForm.tags" placeholder="用逗号分隔多个标签" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="createStrategy">创建</el-button>
      </template>
    </el-dialog>
  </PageTemplate>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import PageTemplate from '../../components/PageTemplate.vue'
import { executionApi } from '../../api/clients'
import KpiCard from '../../components/KpiCard.vue'
import ChartCard from '../../components/ChartCard.vue'
import TrendChart from '../../components/charts/TrendChart.vue'
import {
  Plus, Upload, Search, View, Edit, VideoPause, VideoPlay
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
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
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

interface Strategy {
  id: string
  name: string
  type: string
  status: string
  statusText: string
  return: number
  annualizedReturn: number
  sharpe: number
  maxDrawdown: number
  winRate: number
  tradeCount: number
  lastUpdate: string
  createTime: string
  description: string
  tags: string[]
  parameters: Array<{ name: string; value: string; description: string }>
}

interface StrategyMetrics {
  totalStrategies: number
  runningStrategies: number
  avgReturn: number
  bestReturn: number
}

interface CreateForm {
  name: string
  type: string
  description: string
  tags: string
}

// 状态管理
const searchText = ref('')
const statusFilter = ref('')
const showDetailDialog = ref(false)
const showCreateDialog = ref(false)
const selectedStrategy = ref<Strategy | null>(null)

// 分页相关
const currentPage = ref(1)
const pageSize = ref(10)

// 策略指标
const strategyMetrics = ref<StrategyMetrics>({
  totalStrategies: 12,
  runningStrategies: 5,
  avgReturn: 8.5,
  bestReturn: 28.3
})

// 策略列表
const strategies = ref<Strategy[]>([
  {
    id: 'ST001',
    name: '双均线趋势策略',
    type: '趋势跟踪',
    status: 'running',
    statusText: '运行中',
    return: 15.8,
    annualizedReturn: 18.2,
    sharpe: 1.25,
    maxDrawdown: 8.5,
    winRate: 68.5,
    tradeCount: 156,
    lastUpdate: '2024-01-15 14:30:25',
    createTime: '2023-12-01 09:00:00',
    description: '基于5日和20日移动平均线的趋势跟踪策略',
    tags: ['趋势', '均线', '中频'],
    parameters: [
      { name: 'short_period', value: '5', description: '短期均线周期' },
      { name: 'long_period', value: '20', description: '长期均线周期' },
      { name: 'stop_loss', value: '0.05', description: '止损比例' }
    ]
  },
  {
    id: 'ST002',
    name: 'RSI均值回归',
    type: '均值回归',
    status: 'running',
    statusText: '运行中',
    return: 12.3,
    annualizedReturn: 14.8,
    sharpe: 0.95,
    maxDrawdown: 12.1,
    winRate: 72.3,
    tradeCount: 89,
    lastUpdate: '2024-01-15 14:25:18',
    createTime: '2023-11-15 10:30:00',
    description: '基于RSI指标的均值回归策略',
    tags: ['RSI', '均值回归', '高频'],
    parameters: [
      { name: 'rsi_period', value: '14', description: 'RSI计算周期' },
      { name: 'oversold', value: '30', description: '超卖阈值' },
      { name: 'overbought', value: '70', description: '超买阈值' }
    ]
  },
  {
    id: 'ST003',
    name: '动量突破策略',
    type: '动量策略',
    status: 'stopped',
    statusText: '已停止',
    return: 8.7,
    annualizedReturn: 10.2,
    sharpe: 0.68,
    maxDrawdown: 15.3,
    winRate: 58.9,
    tradeCount: 234,
    lastUpdate: '2024-01-10 16:45:32',
    createTime: '2023-10-20 14:15:00',
    description: '基于价格动量的突破策略',
    tags: ['动量', '突破', '中频'],
    parameters: [
      { name: 'lookback_period', value: '20', description: '回看周期' },
      { name: 'breakout_threshold', value: '0.02', description: '突破阈值' }
    ]
  }
])

// 创建表单
const createForm = ref<CreateForm>({
  name: '',
  type: '',
  description: '',
  tags: ''
})

// 策略收益数据
const strategyReturnData = ref<Array<{ date: string; value: number }>>([])

// 计算属性
const filteredStrategies = computed(() => {
  let filtered = strategies.value

  if (searchText.value) {
    const search = searchText.value.toLowerCase()
    filtered = filtered.filter(strategy =>
      strategy.name.toLowerCase().includes(search) ||
      strategy.tags.some(tag => tag.toLowerCase().includes(search))
    )
  }

  if (statusFilter.value) {
    filtered = filtered.filter(strategy => strategy.status === statusFilter.value)
  }

  return filtered
})

// 策略性能对比图表配置
const performanceComparisonOption = computed(() => {
  const runningStrategies = strategies.value.filter(s => s.status === 'running')

  return {
    title: {
      text: '运行中策略收益对比',
      textStyle: { color: 'var(--text-primary)', fontSize: 14 }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' }
    },
    legend: {
      data: runningStrategies.map(s => s.name),
      textStyle: { color: 'var(--text-secondary)' }
    },
    xAxis: {
      type: 'category',
      data: generateDateRange(30),
      axisLabel: { color: 'var(--text-secondary)' }
    },
    yAxis: {
      type: 'value',
      name: '累计收益率 (%)',
      axisLabel: { color: 'var(--text-secondary)' }
    },
    series: runningStrategies.map((strategy, index) => ({
      name: strategy.name,
      type: 'line',
      data: generateStrategyReturns(strategy.return),
      smooth: true,
      lineStyle: { width: 2 },
      itemStyle: { color: getStrategyColor(index) }
    }))
  }
})

// 分页数据
const paginatedStrategies = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredStrategies.value.slice(start, end)
})

// 方法
function getStrategyTypeColor(type: string) {
  const colors: Record<string, string> = {
    '趋势跟踪': 'primary',
    '均值回归': 'success',
    '动量策略': 'warning',
    '套利策略': 'info',
    '机器学习': 'danger'
  }
  return colors[type] || 'default'
}

function getStatusType(status: string) {
  switch (status) {
    case 'running': return 'success'
    case 'stopped': return 'info'
    case 'testing': return 'warning'
    case 'error': return 'danger'
    default: return 'default'
  }
}

function getReturnClass(returnValue: number) {
  if (returnValue > 0) return 'text-success'
  if (returnValue < 0) return 'text-danger'
  return 'text-muted'
}

function getStrategyColor(index: number) {
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
  return colors[index % colors.length]
}

function generateDateRange(days: number) {
  const dates = []
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    dates.push(date.toISOString().split('T')[0])
  }
  return dates
}

function generateStrategyReturns(finalReturn: number) {
  const returns = []
  let currentReturn = 0
  const dailyReturn = finalReturn / 30

  for (let i = 0; i < 30; i++) {
    currentReturn += dailyReturn + (Math.random() - 0.5) * 2
    returns.push(currentReturn)
  }

  return returns
}

function generateStrategyReturnData(strategy: Strategy) {
  const data = []
  const now = new Date()
  let cumulativeReturn = 100

  for (let i = 90; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const dailyReturn = (strategy.return / 90) + (Math.random() - 0.5) * 1
    cumulativeReturn *= (1 + dailyReturn / 100)

    data.push({
      date: date.toISOString().split('T')[0]!,
      value: cumulativeReturn
    })
  }

  return data
}

function viewStrategy(strategy: Strategy) {
  selectedStrategy.value = strategy
  strategyReturnData.value = generateStrategyReturnData(strategy)
  showDetailDialog.value = true
}

async function toggleStrategy(strategy: Strategy) {
  const action = strategy.status === 'running' ? '停止' : '启动'

  try {
    await ElMessageBox.confirm(
      `确定要${action}策略 "${strategy.name}" 吗？`,
      `确认${action}`,
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // TODO: 需与后端确认端点 - execution服务可能使用 /api/v1/analyze 或 /api/v1/backtest 分组
    await executionApi.post(`/api/v1/strategy/${strategy.id}/${strategy.status === 'running' ? 'stop' : 'start'}`)

    // 更新状态
    strategy.status = strategy.status === 'running' ? 'stopped' : 'running'
    strategy.statusText = strategy.status === 'running' ? '运行中' : '已停止'
    strategy.lastUpdate = new Date().toLocaleString()

    // 更新运行中策略数量
    strategyMetrics.value.runningStrategies = strategies.value.filter(s => s.status === 'running').length

    ElMessage.success(`策略已${action}`)
  } catch (error) {
    if (error !== 'cancel') {
      console.warn(`${action}策略失败:`, error)
      ElMessage.success(`策略已${action}（模拟）`)
    }
  }
}

function editStrategy(strategy: Strategy | null) {
  if (!strategy) return

  // 这里可以跳转到策略编辑页面或打开编辑对话框
  ElMessage.info('策略编辑功能开发中...')
}

async function createStrategy() {
  if (!createForm.value.name || !createForm.value.type) {
    ElMessage.warning('请填写必填字段')
    return
  }

  try {
    // TODO: 需与后端确认端点 - 可能是 /api/v1/analyze/strategy 或 /api/v1/backtest/strategy
    await executionApi.post('/api/v1/strategy/create', {
      name: createForm.value.name,
      type: createForm.value.type,
      description: createForm.value.description,
      tags: createForm.value.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
    })

    // 添加到策略列表
    const newStrategy: Strategy = {
      id: `ST${String(strategies.value.length + 1).padStart(3, '0')}`,
      name: createForm.value.name,
      type: createForm.value.type,
      status: 'stopped',
      statusText: '已停止',
      return: 0,
      annualizedReturn: 0,
      sharpe: 0,
      maxDrawdown: 0,
      winRate: 0,
      tradeCount: 0,
      lastUpdate: new Date().toLocaleString(),
      createTime: new Date().toLocaleString(),
      description: createForm.value.description,
      tags: createForm.value.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
      parameters: []
    }

    strategies.value.unshift(newStrategy)
    strategyMetrics.value.totalStrategies++

    // 重置表单
    createForm.value = { name: '', type: '', description: '', tags: '' }
    showCreateDialog.value = false

    ElMessage.success('策略创建成功')
  } catch (error) {
    console.warn('创建策略失败:', error)
    ElMessage.success('策略创建成功（模拟）')
  }
}

function importStrategy() {
  ElMessage.info('策略导入功能开发中...')
}

onMounted(() => {
  // 初始化数据
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

.strategy-name {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.strategy-name .name {
  font-weight: 600;
  color: var(--text-primary);
}

.tags {
  display: flex;
  gap: var(--spacing-xs);
  flex-wrap: wrap;
}

.comparison-chart {
  height: 400px;
}

.chart {
  width: 100%;
  height: 100%;
}

.strategy-detail {
  max-height: 600px;
  overflow-y: auto;
}

.detail-section {
  margin-bottom: var(--card-gap-lg);
}

.detail-section h4 {
  margin: 0 0 var(--spacing-md) 0;
  color: var(--text-primary);
  font-size: var(--text-lg);
  font-weight: 600;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--card-gap-md);
}

.metric-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  background-color: var(--surface-bg);
  border-radius: var(--radius-md);
}

.metric-label {
  font-weight: 600;
  color: var(--text-secondary);
}

.metric-value {
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--text-primary);
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

.el-table .text-muted {
  color: var(--text-muted);
}

/* 对话框样式 */
.el-dialog__body {
  padding: var(--spacing-lg);
}

/* 表单样式增强 */
.el-form-item__label {
  color: var(--text-primary);
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .execution-strategy {
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

  .metrics-grid {
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
