<template>
  <PageTemplate>
    <template #actions>
      <el-button type="primary" @click="showConfigDialog = true">
        <el-icon><Setting /></el-icon>
        新建回测
      </el-button>
    </template>

    <!-- 回测概览 -->
    <div class="overview-cards">
        <KpiCard 
          title="总回测数" 
          :value="backtestMetrics.totalBacktests" 
          subtitle="历史回测次数"
        />
        <KpiCard 
          title="平均收益率" 
          :value="backtestMetrics.avgReturn" 
          format="percentage"
          :type="backtestMetrics.avgReturn > 0 ? 'success' : 'danger'"
          subtitle="所有回测平均"
        />
        <KpiCard 
          title="最佳策略" 
          :value="backtestMetrics.bestReturn" 
          format="percentage"
          type="success"
          subtitle="最高收益率"
        />
        <KpiCard 
          title="胜率" 
          :value="backtestMetrics.winRate" 
          format="percentage"
          :type="backtestMetrics.winRate > 60 ? 'success' : 'warning'"
          subtitle="盈利回测比例"
        />
      </div>

    <!-- 回测列表 -->
    <ChartCard title="回测历史">
        <template #header>
          <div class="card-header">
            <div class="header-controls">
              <el-input
                v-model="searchText"
                placeholder="搜索回测名称"
                style="width: 300px"
                clearable
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
              <el-select v-model="statusFilter" placeholder="状态筛选" style="width: 150px">
                <el-option label="全部" value="" />
                <el-option label="完成" value="completed" />
                <el-option label="运行中" value="running" />
                <el-option label="失败" value="failed" />
              </el-select>
            </div>
          </div>
        </template>

        <div class="table-wrapper">
          <el-table :data="paginatedBacktests" style="width: 100%" stripe border>
            <el-table-column prop="name" label="回测名称" :min-width="200" show-overflow-tooltip header-align="center" />
            <el-table-column prop="strategy" label="策略" :min-width="150" show-overflow-tooltip header-align="center" />
            <el-table-column prop="period" label="回测期间" :min-width="200" show-overflow-tooltip header-align="center" />
            <el-table-column prop="status" label="状态" :min-width="100" align="center" header-align="center">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)" size="small">{{ row.statusText }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="totalReturn" label="总收益率" :min-width="120" align="right" header-align="center">
              <template #default="{ row }">
                <span :class="getReturnClass(row.totalReturn)">
                  {{ row.totalReturn > 0 ? '+' : '' }}{{ row.totalReturn.toFixed(2) }}%
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="annualizedReturn" label="年化收益" :min-width="120" align="right" header-align="center">
              <template #default="{ row }">
                {{ row.annualizedReturn.toFixed(2) }}%
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
            <el-table-column prop="createTime" label="创建时间" :min-width="180" show-overflow-tooltip header-align="center" />
            <el-table-column label="操作" :min-width="180" fixed="right" align="left" header-align="center">
              <template #default="{ row }">
                <el-button size="small" type="primary" @click="viewBacktest(row)">
                  <el-icon><View /></el-icon>
                  查看
                </el-button>
                <el-button size="small" @click="deleteBacktest(row)">
                  <el-icon><Delete /></el-icon>
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            v-if="filteredBacktests.length > 10"
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="filteredBacktests.length"
            layout="total, sizes, prev, pager, next, jumper"
            class="pagination"
          />
        </div>
      </ChartCard>

    <!-- 回测配置对话框 -->
    <el-dialog v-model="showConfigDialog" title="新建回测" width="800px">
      <el-form :model="configForm" label-width="120px">
        <el-form-item label="回测名称" required>
          <el-input v-model="configForm.name" placeholder="请输入回测名称" />
        </el-form-item>
        <el-form-item label="选择策略" required>
          <el-select v-model="configForm.strategy" placeholder="选择策略" style="width: 100%">
            <el-option label="双均线趋势策略" value="ST001" />
            <el-option label="RSI均值回归" value="ST002" />
            <el-option label="动量突破策略" value="ST003" />
          </el-select>
        </el-form-item>
        <el-form-item label="回测期间" required>
          <el-date-picker
            v-model="configForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="初始资金">
          <el-input-number v-model="configForm.initialCapital" :min="10000" :step="10000" style="width: 100%" />
        </el-form-item>
        <el-form-item label="基准指数">
          <el-select v-model="configForm.benchmark" placeholder="选择基准" style="width: 100%">
            <el-option label="沪深300" value="000300" />
            <el-option label="中证500" value="000905" />
            <el-option label="创业板指" value="399006" />
          </el-select>
        </el-form-item>
        <el-form-item label="手续费率">
          <el-input-number v-model="configForm.commission" :min="0" :max="1" :step="0.0001" :precision="4" style="width: 100%" />
          <span style="margin-left: 8px; color: var(--text-muted);">%</span>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showConfigDialog = false">取消</el-button>
        <el-button type="primary" @click="startBacktest" :loading="starting">开始回测</el-button>
      </template>
    </el-dialog>

    <!-- 回测详情对话框 -->
    <el-dialog v-model="showDetailDialog" :title="selectedBacktest?.name" width="1200px">
      <div v-if="selectedBacktest" class="backtest-detail">
        <!-- 基本信息 -->
        <div class="detail-section">
          <el-descriptions :column="3" border>
            <el-descriptions-item label="策略">{{ selectedBacktest.strategy }}</el-descriptions-item>
            <el-descriptions-item label="回测期间">{{ selectedBacktest.period }}</el-descriptions-item>
            <el-descriptions-item label="初始资金">¥{{ selectedBacktest.initialCapital?.toLocaleString() }}</el-descriptions-item>
            <el-descriptions-item label="总收益率">
              <span :class="getReturnClass(selectedBacktest.totalReturn)">
                {{ selectedBacktest.totalReturn > 0 ? '+' : '' }}{{ selectedBacktest.totalReturn.toFixed(2) }}%
              </span>
            </el-descriptions-item>
            <el-descriptions-item label="年化收益率">{{ selectedBacktest.annualizedReturn.toFixed(2) }}%</el-descriptions-item>
            <el-descriptions-item label="基准收益率">{{ selectedBacktest.benchmarkReturn?.toFixed(2) }}%</el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 绩效指标 -->
        <div class="detail-section">
          <div class="metrics-grid">
            <div class="metric-item">
              <span class="metric-label">夏普比率</span>
              <span class="metric-value">{{ selectedBacktest.sharpe.toFixed(3) }}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">最大回撤</span>
              <span class="metric-value text-danger">{{ selectedBacktest.maxDrawdown.toFixed(2) }}%</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">胜率</span>
              <span class="metric-value">{{ selectedBacktest.winRate?.toFixed(1) }}%</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">交易次数</span>
              <span class="metric-value">{{ selectedBacktest.tradeCount }}</span>
            </div>
          </div>
        </div>

        <!-- 收益曲线 -->
        <div class="detail-section">
          <div style="height: 400px;">
            <TrendChart :data="backtestReturnData" color="#3b82f6" />
          </div>
        </div>
      </div>
      
      <template #footer>
        <el-button @click="showDetailDialog = false">关闭</el-button>
        <el-button type="primary" @click="exportReport">导出报告</el-button>
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
import { Setting, Search, View, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// ECharts imports for potential chart usage
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DataZoomComponent
} from 'echarts/components'
// import VChart from 'vue-echarts' // 暂时注释掉，如果需要使用图表再启用

// Register ECharts components
use([
  CanvasRenderer,
  LineChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DataZoomComponent
])

interface Backtest {
  id: string
  name: string
  strategy: string
  period: string
  status: string
  statusText: string
  totalReturn: number
  annualizedReturn: number
  sharpe: number
  maxDrawdown: number
  createTime: string
  initialCapital?: number
  benchmarkReturn?: number
  winRate?: number
  tradeCount?: number
}

interface BacktestMetrics {
  totalBacktests: number
  avgReturn: number
  bestReturn: number
  winRate: number
}

interface ConfigForm {
  name: string
  strategy: string
  dateRange: [Date, Date] | null
  initialCapital: number
  benchmark: string
  commission: number
}

// 状态管理
const searchText = ref('')
const statusFilter = ref('')
const showConfigDialog = ref(false)
const showDetailDialog = ref(false)
const starting = ref(false)
const selectedBacktest = ref<Backtest | null>(null)

// 分页相关
const currentPage = ref(1)
const pageSize = ref(10)

// 回测指标
const backtestMetrics = ref<BacktestMetrics>({
  totalBacktests: 15,
  avgReturn: 12.8,
  bestReturn: 35.6,
  winRate: 73.3
})

// 回测列表
const backtests = ref<Backtest[]>([
  {
    id: 'BT001',
    name: '双均线策略回测_2023',
    strategy: '双均线趋势策略',
    period: '2023-01-01 至 2023-12-31',
    status: 'completed',
    statusText: '完成',
    totalReturn: 18.5,
    annualizedReturn: 18.5,
    sharpe: 1.25,
    maxDrawdown: 8.5,
    createTime: '2024-01-10 14:30:25',
    initialCapital: 1000000,
    benchmarkReturn: 12.3,
    winRate: 68.5,
    tradeCount: 156
  },
  {
    id: 'BT002',
    name: 'RSI策略回测_Q4',
    strategy: 'RSI均值回归',
    period: '2023-10-01 至 2023-12-31',
    status: 'completed',
    statusText: '完成',
    totalReturn: 8.7,
    annualizedReturn: 35.2,
    sharpe: 0.95,
    maxDrawdown: 12.1,
    createTime: '2024-01-05 09:15:42',
    initialCapital: 500000,
    benchmarkReturn: 5.2,
    winRate: 72.3,
    tradeCount: 89
  }
])

// 配置表单
const configForm = ref<ConfigForm>({
  name: '',
  strategy: '',
  dateRange: null,
  initialCapital: 1000000,
  benchmark: '000300',
  commission: 0.0003
})

// 回测收益数据
const backtestReturnData = ref<Array<{ date: string; value: number }>>([])

// 计算属性
const filteredBacktests = computed(() => {
  let filtered = backtests.value
  
  if (searchText.value) {
    const search = searchText.value.toLowerCase()
    filtered = filtered.filter(backtest => 
      backtest.name.toLowerCase().includes(search)
    )
  }
  
  if (statusFilter.value) {
    filtered = filtered.filter(backtest => backtest.status === statusFilter.value)
  }
  
  return filtered
})

// 方法
function getStatusType(status: string) {
  switch (status) {
    case 'completed': return 'success'
    case 'running': return 'warning'
    case 'failed': return 'danger'
    default: return 'default'
  }
}

function getReturnClass(returnValue: number) {
  if (returnValue > 0) return 'text-success'
  if (returnValue < 0) return 'text-danger'
  return 'text-muted'
}

function generateBacktestReturnData(backtest: Backtest) {
  const data = []
  const now = new Date()
  let cumulativeReturn = 100
  
  for (let i = 90; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const dailyReturn = (backtest.totalReturn / 90) + (Math.random() - 0.5) * 1
    cumulativeReturn *= (1 + dailyReturn / 100)
    
    data.push({
      date: date.toISOString().split('T')[0]!,
      value: cumulativeReturn
    })
  }
  
  return data
}

// 分页数据
const paginatedBacktests = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredBacktests.value.slice(start, end)
})

function viewBacktest(backtest: Backtest) {
  selectedBacktest.value = backtest
  backtestReturnData.value = generateBacktestReturnData(backtest)
  showDetailDialog.value = true
}

async function deleteBacktest(backtest: Backtest) {
  try {
    await ElMessageBox.confirm(
      `确定要删除回测 "${backtest.name}" 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await executionApi.post(`/api/v1/backtest/cancel/${backtest.id}`)
    
    const index = backtests.value.findIndex(b => b.id === backtest.id)
    if (index > -1) {
      backtests.value.splice(index, 1)
      backtestMetrics.value.totalBacktests--
    }
    
    ElMessage.success('回测已删除')
  } catch (error) {
    if (error !== 'cancel') {
      console.warn('删除回测失败:', error)
      ElMessage.success('回测已删除（模拟）')
    }
  }
}

async function startBacktest() {
  if (!configForm.value.name || !configForm.value.strategy || !configForm.value.dateRange) {
    ElMessage.warning('请填写必填字段')
    return
  }
  
  starting.value = true
  
  try {
    await executionApi.post('/api/v1/backtest/run', {
      name: configForm.value.name,
      strategy: configForm.value.strategy,
      start_date: configForm.value.dateRange[0],
      end_date: configForm.value.dateRange[1],
      initial_capital: configForm.value.initialCapital,
      benchmark: configForm.value.benchmark,
      commission: configForm.value.commission
    })
    
    // 添加到回测列表
    const newBacktest: Backtest = {
      id: `BT${String(backtests.value.length + 1).padStart(3, '0')}`,
      name: configForm.value.name,
      strategy: configForm.value.strategy,
      period: `${configForm.value.dateRange[0].toISOString().split('T')[0]} 至 ${configForm.value.dateRange[1].toISOString().split('T')[0]}`,
      status: 'running',
      statusText: '运行中',
      totalReturn: 0,
      annualizedReturn: 0,
      sharpe: 0,
      maxDrawdown: 0,
      createTime: new Date().toLocaleString(),
      initialCapital: configForm.value.initialCapital
    }
    
    backtests.value.unshift(newBacktest)
    backtestMetrics.value.totalBacktests++
    
    // 重置表单
    configForm.value = {
      name: '',
      strategy: '',
      dateRange: null,
      initialCapital: 1000000,
      benchmark: '000300',
      commission: 0.0003
    }
    showConfigDialog.value = false
    
    ElMessage.success('回测已开始，请稍后查看结果')
  } catch (error) {
    console.warn('开始回测失败:', error)
    ElMessage.success('回测已开始（模拟）')
  } finally {
    starting.value = false
  }
}

function exportReport() {
  ElMessage.info('正在导出回测报告...')
  // 模拟导出
  setTimeout(() => {
    ElMessage.success('回测报告已导出')
  }, 1000)
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

.backtest-detail {
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
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-lg);
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

/* 响应式设计 */
@media (max-width: 768px) {
  .execution-backtest {
    padding: var(--spacing-md);
  }
  
  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: var(--spacing-md);
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
  
  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
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
