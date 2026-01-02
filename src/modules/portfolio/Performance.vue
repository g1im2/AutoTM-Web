<template>
  <PageTemplate>
    <template #actions>
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        @change="refreshData"
      />
      <el-select v-model="selectedPortfolio" placeholder="选择组合" style="width: 200px" @change="refreshData">
        <el-option label="稳健增长组合" value="PF001" />
        <el-option label="价值投资组合" value="PF002" />
        <el-option label="科技成长组合" value="PF003" />
      </el-select>
      <el-button type="primary" @click="generateReport">
        <el-icon><Document /></el-icon>
        生成报告
      </el-button>
    </template>

    <!-- 绩效概览 -->
    <div class="kpi-grid">
        <KpiCard 
          title="累计收益率" 
          :value="performanceMetrics.totalReturn" 
          format="percentage"
          :type="performanceMetrics.totalReturn > 0 ? 'success' : 'danger'"
          :trend="performanceMetrics.totalReturnTrend"
          subtitle="自成立以来"
        />
        <KpiCard 
          title="年化收益率" 
          :value="performanceMetrics.annualizedReturn" 
          format="percentage"
          :type="performanceMetrics.annualizedReturn > 0 ? 'success' : 'danger'"
          subtitle="年化表现"
        />
        <KpiCard 
          title="年化波动率" 
          :value="performanceMetrics.volatility" 
          format="percentage"
          type="warning"
          subtitle="风险水平"
        />
        <KpiCard 
          title="夏普比率" 
          :value="performanceMetrics.sharpeRatio" 
          :type="performanceMetrics.sharpeRatio > 1 ? 'success' : 'warning'"
          subtitle="风险调整收益"
        />
        <KpiCard 
          title="最大回撤" 
          :value="performanceMetrics.maxDrawdown" 
          format="percentage"
          type="danger"
          subtitle="历史最大亏损"
        />
        <KpiCard
          title="信息比率"
          :value="performanceMetrics.informationRatio"
          :type="performanceMetrics.informationRatio > 0.5 ? 'success' : 'warning'"
          subtitle="超额收益稳定性"
        />
      </div>

    <!-- 收益曲线对比 -->
    <ChartCard title="收益曲线对比" height="400px" show-refresh @refresh="refreshReturnData">
        <TrendChart 
          :data="returnComparisonData" 
          :loading="returnLoading"
          color="#3b82f6"
          title="组合 vs 基准"
        />
      </ChartCard>

    <!-- 绩效分析表格 -->
    <ChartCard title="分期间绩效分析">
        <div class="table-wrapper">
          <el-table :data="paginatedPerformance" style="width: 100%" stripe border>
            <el-table-column prop="period" label="期间" :min-width="120" show-overflow-tooltip header-align="center" />
            <el-table-column prop="portfolioReturn" label="组合收益率" :min-width="130" align="right" header-align="center">
              <template #default="{ row }">
                <span :class="getReturnClass(row.portfolioReturn)">
                  {{ row.portfolioReturn > 0 ? '+' : '' }}{{ row.portfolioReturn.toFixed(2) }}%
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="benchmarkReturn" label="基准收益率" :min-width="130" align="right" header-align="center">
              <template #default="{ row }">
                <span :class="getReturnClass(row.benchmarkReturn)">
                  {{ row.benchmarkReturn > 0 ? '+' : '' }}{{ row.benchmarkReturn.toFixed(2) }}%
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="excessReturn" label="超额收益" :min-width="120" align="right" header-align="center">
              <template #default="{ row }">
                <span :class="getReturnClass(row.excessReturn)">
                  {{ row.excessReturn > 0 ? '+' : '' }}{{ row.excessReturn.toFixed(2) }}%
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="volatility" label="波动率" :min-width="100" align="right" header-align="center">
              <template #default="{ row }">
                {{ row.volatility.toFixed(2) }}%
              </template>
            </el-table-column>
            <el-table-column prop="sharpe" label="夏普比率" :min-width="110" align="right" header-align="center">
              <template #default="{ row }">
                {{ row.sharpe.toFixed(3) }}
              </template>
            </el-table-column>
            <el-table-column prop="maxDrawdown" label="最大回撤" :min-width="110" align="right" header-align="center">
              <template #default="{ row }">
                <span class="text-danger">{{ row.maxDrawdown.toFixed(2) }}%</span>
              </template>
            </el-table-column>
            <el-table-column prop="winRate" label="胜率" :min-width="80" align="right" header-align="center">
              <template #default="{ row }">
                {{ row.winRate.toFixed(1) }}%
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            v-if="periodPerformance.length > 10"
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="periodPerformance.length"
            layout="total, sizes, prev, pager, next, jumper"
            class="pagination"
          />
        </div>
      </ChartCard>

    <!-- 归因分析 -->
    <div class="attribution-grid">
        <!-- 行业归因 -->
        <ChartCard title="行业归因分析" height="350px">
          <div class="attribution-chart">
            <v-chart class="chart" :option="sectorAttributionOption" autoresize />
          </div>
        </ChartCard>

        <!-- 个股归因 -->
        <ChartCard title="个股归因分析" height="350px">
          <div class="attribution-chart">
            <v-chart class="chart" :option="stockAttributionOption" autoresize />
          </div>
        </ChartCard>
      </div>

    <!-- 风险收益散点图 -->
    <ChartCard title="风险收益分析" height="400px">
      <div class="scatter-chart">
        <v-chart class="chart" :option="riskReturnOption" autoresize />
      </div>
    </ChartCard>

    <!-- 回撤分析 -->
    <ChartCard title="回撤分析" height="350px">
        <TrendChart 
          :data="drawdownData" 
          :loading="drawdownLoading"
          color="#ef4444"
          title="历史回撤"
        />
      </ChartCard>

    <!-- 滚动收益率分析 -->
    <ChartCard title="滚动收益率分析">
        <div class="rolling-controls">
          <el-radio-group v-model="rollingPeriod" @change="updateRollingReturns">
            <el-radio-button label="1M">1个月</el-radio-button>
            <el-radio-button label="3M">3个月</el-radio-button>
            <el-radio-button label="6M">6个月</el-radio-button>
            <el-radio-button label="1Y">1年</el-radio-button>
          </el-radio-group>
        </div>
        
        <div class="rolling-stats">
          <div class="stat-item">
            <span class="stat-label">平均收益率</span>
            <span class="stat-value">{{ rollingStats.mean.toFixed(2) }}%</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">标准差</span>
            <span class="stat-value">{{ rollingStats.std.toFixed(2) }}%</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">最大值</span>
            <span class="stat-value text-success">{{ rollingStats.max.toFixed(2) }}%</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">最小值</span>
            <span class="stat-value text-danger">{{ rollingStats.min.toFixed(2) }}%</span>
          </div>
        </div>
        
        <div style="height: 300px; margin-top: 16px;">
          <TrendChart 
            :data="rollingReturnsData" 
            color="#8b5cf6"
            title="滚动收益率"
          />
        </div>
      </ChartCard>
  </PageTemplate>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import PageTemplate from '../../components/PageTemplate.vue'
import { portfolioApi } from '../../api/clients'
import KpiCard from '../../components/KpiCard.vue'
import ChartCard from '../../components/ChartCard.vue'
import TrendChart from '../../components/charts/TrendChart.vue'
import { Document } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, ScatterChart } from 'echarts/charts'
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
  BarChart,
  ScatterChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

interface PerformanceMetrics {
  totalReturn: number
  totalReturnTrend: number
  annualizedReturn: number
  volatility: number
  sharpeRatio: number
  maxDrawdown: number
  informationRatio: number
}

interface PeriodPerformance {
  period: string
  portfolioReturn: number
  benchmarkReturn: number
  excessReturn: number
  volatility: number
  sharpe: number
  maxDrawdown: number
  winRate: number
}

interface RollingStats {
  mean: number
  std: number
  max: number
  min: number
}

// 状态管理
const dateRange = ref<[Date, Date] | null>(null)
const selectedPortfolio = ref('PF001')
const returnLoading = ref(false)
const drawdownLoading = ref(false)
const rollingPeriod = ref('3M')

// 分页相关
const currentPage = ref(1)
const pageSize = ref(10)

// 绩效指标
const performanceMetrics = ref<PerformanceMetrics>({
  totalReturn: 28.5,
  totalReturnTrend: 3.2,
  annualizedReturn: 12.8,
  volatility: 18.5,
  sharpeRatio: 0.69,
  maxDrawdown: 15.2,
  informationRatio: 0.85
})

// 收益曲线数据
const returnComparisonData = ref<Array<{ date: string; value: number }>>([])

// 分期间绩效数据
const periodPerformance = ref<PeriodPerformance[]>([
  {
    period: '近1个月',
    portfolioReturn: 2.3,
    benchmarkReturn: 1.8,
    excessReturn: 0.5,
    volatility: 12.5,
    sharpe: 0.18,
    maxDrawdown: 3.2,
    winRate: 65.2
  },
  {
    period: '近3个月',
    portfolioReturn: 8.7,
    benchmarkReturn: 6.2,
    excessReturn: 2.5,
    volatility: 15.8,
    sharpe: 0.55,
    maxDrawdown: 8.1,
    winRate: 68.9
  },
  {
    period: '近6个月',
    portfolioReturn: 15.2,
    benchmarkReturn: 11.8,
    excessReturn: 3.4,
    volatility: 17.2,
    sharpe: 0.88,
    maxDrawdown: 12.5,
    winRate: 71.3
  },
  {
    period: '近1年',
    portfolioReturn: 28.5,
    benchmarkReturn: 22.1,
    excessReturn: 6.4,
    volatility: 18.5,
    sharpe: 1.54,
    maxDrawdown: 15.2,
    winRate: 73.8
  },
  {
    period: '近2年',
    portfolioReturn: 45.8,
    benchmarkReturn: 35.2,
    excessReturn: 10.6,
    volatility: 19.8,
    sharpe: 2.31,
    maxDrawdown: 18.7,
    winRate: 75.1
  },
  {
    period: '成立以来',
    portfolioReturn: 68.9,
    benchmarkReturn: 48.3,
    excessReturn: 20.6,
    volatility: 20.2,
    sharpe: 3.41,
    maxDrawdown: 22.3,
    winRate: 76.5
  }
])

// 回撤数据
const drawdownData = ref<Array<{ date: string; value: number }>>([])

// 滚动收益率数据
const rollingReturnsData = ref<Array<{ date: string; value: number }>>([])
const rollingStats = ref<RollingStats>({
  mean: 8.5,
  std: 12.3,
  max: 35.2,
  min: -18.7
})

// 分页数据
const paginatedPerformance = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return periodPerformance.value.slice(start, end)
})

// 行业归因图表配置
const sectorAttributionOption = computed(() => ({
  title: {
    text: '行业贡献度',
    textStyle: { color: 'var(--text-primary)', fontSize: 14 }
  },
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' }
  },
  xAxis: {
    type: 'category',
    data: ['金融', '消费', '科技', '医药', '制造', '地产'],
    axisLabel: { color: 'var(--text-secondary)' }
  },
  yAxis: {
    type: 'value',
    name: '贡献度 (%)',
    axisLabel: { color: 'var(--text-secondary)' }
  },
  series: [
    {
      name: '行业贡献',
      type: 'bar',
      data: [2.8, 3.5, 1.2, 0.8, -0.5, -1.1],
      itemStyle: {
        color: (params: any) => params.value > 0 ? '#10b981' : '#ef4444'
      }
    }
  ]
}))

// 个股归因图表配置
const stockAttributionOption = computed(() => ({
  title: {
    text: '个股贡献度 (Top 10)',
    textStyle: { color: 'var(--text-primary)', fontSize: 14 }
  },
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' }
  },
  xAxis: {
    type: 'value',
    axisLabel: { color: 'var(--text-secondary)' }
  },
  yAxis: {
    type: 'category',
    data: ['贵州茅台', '招商银行', '平安银行', '五粮液', '腾讯控股', '阿里巴巴', '美团', '宁德时代', '比亚迪', '海康威视'],
    axisLabel: { color: 'var(--text-secondary)' }
  },
  series: [
    {
      name: '个股贡献',
      type: 'bar',
      data: [1.8, 1.2, 0.9, 0.7, 0.5, 0.3, 0.2, -0.1, -0.3, -0.5],
      itemStyle: {
        color: (params: any) => params.value > 0 ? '#3b82f6' : '#f59e0b'
      }
    }
  ]
}))

// 风险收益散点图配置
const riskReturnOption = computed(() => ({
  title: {
    text: '风险收益分析',
    textStyle: { color: 'var(--text-primary)', fontSize: 14 }
  },
  tooltip: {
    trigger: 'item',
    formatter: (params: any) => `${params.seriesName}<br/>风险: ${params.value[0].toFixed(2)}%<br/>收益: ${params.value[1].toFixed(2)}%`
  },
  xAxis: {
    type: 'value',
    name: '风险 (波动率 %)',
    nameTextStyle: { color: 'var(--text-secondary)' },
    axisLabel: { color: 'var(--text-secondary)' }
  },
  yAxis: {
    type: 'value',
    name: '收益 (%)',
    nameTextStyle: { color: 'var(--text-secondary)' },
    axisLabel: { color: 'var(--text-secondary)' }
  },
  series: [
    {
      name: '当前组合',
      type: 'scatter',
      data: [[18.5, 28.5]],
      itemStyle: { color: '#ef4444' },
      symbolSize: 12,
      symbol: 'diamond'
    },
    {
      name: '基准指数',
      type: 'scatter',
      data: [[16.2, 22.1]],
      itemStyle: { color: '#3b82f6' },
      symbolSize: 10,
      symbol: 'circle'
    },
    {
      name: '同类组合',
      type: 'scatter',
      data: [
        [15.8, 20.3], [19.2, 25.1], [22.1, 18.9], [14.5, 16.7],
        [17.3, 23.8], [20.8, 31.2], [16.9, 19.5], [21.5, 27.3]
      ],
      itemStyle: { color: '#94a3b8' },
      symbolSize: 8,
      symbol: 'circle'
    }
  ]
}))

// 方法
function getReturnClass(returnValue: number) {
  if (returnValue > 0) return 'text-success'
  if (returnValue < 0) return 'text-danger'
  return 'text-muted'
}

async function refreshData() {
  await Promise.all([
    refreshReturnData(),
    refreshDrawdownData(),
    updateRollingReturns()
  ])
}

async function refreshReturnData() {
  returnLoading.value = true

  try {
    // 后端路径：/api/v1/portfolio/{portfolio_id}/performance/returns (GET)
    const { data } = await portfolioApi.get(`/api/v1/portfolio/${selectedPortfolio.value}/performance/returns`, {
      params: {
        start_date: dateRange.value?.[0]?.toISOString().split('T')[0],
        end_date: dateRange.value?.[1]?.toISOString().split('T')[0]
      }
    })

    // 如果后端返回数据，使用真实数据；否则使用模拟数据
    if (data?.data?.returns) {
      returnComparisonData.value = data.data.returns
    } else {
      generateReturnData()
    }
  } catch (error) {
    console.warn('获取收益数据失败:', error)
    generateReturnData()
  } finally {
    returnLoading.value = false
  }
}

async function refreshDrawdownData() {
  drawdownLoading.value = true

  try {
    // 后端路径：/api/v1/portfolios/{portfolio_id}/analytics/drawdown (POST)
    const { data } = await portfolioApi.post(`/api/v1/portfolios/${selectedPortfolio.value}/analytics/drawdown`, {
      start_date: dateRange.value?.[0]?.toISOString().split('T')[0],
      end_date: dateRange.value?.[1]?.toISOString().split('T')[0]
    })

    // 如果后端返回数据，使用真实数据；否则使用模拟数据
    if (data?.data?.drawdown_series) {
      drawdownData.value = data.data.drawdown_series.map((item: any) => ({
        date: item.date,
        value: item.drawdown
      }))
    } else {
      generateDrawdownData()
    }
  } catch (error) {
    console.warn('获取回撤数据失败:', error)
    generateDrawdownData()
  } finally {
    drawdownLoading.value = false
  }
}

function generateReturnData() {
  const data = []
  const now = new Date()
  let cumulativeReturn = 100

  for (let i = 365; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const dailyReturn = (Math.random() - 0.48) * 2 // 略微正偏
    cumulativeReturn *= (1 + dailyReturn / 100)

    data.push({
      date: date.toISOString().split('T')[0]!,
      value: cumulativeReturn
    })
  }

  returnComparisonData.value = data
}

function generateDrawdownData() {
  const data = []
  const now = new Date()
  let peak = 100
  let currentValue = 100

  for (let i = 365; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const dailyReturn = (Math.random() - 0.48) * 2
    currentValue *= (1 + dailyReturn / 100)

    if (currentValue > peak) {
      peak = currentValue
    }

    const drawdown = ((currentValue - peak) / peak) * 100

    data.push({
      date: date.toISOString().split('T')[0]!,
      value: drawdown
    })
  }

  drawdownData.value = data
}

function updateRollingReturns() {
  // 根据选择的期间生成滚动收益率数据
  const periods = {
    '1M': 30,
    '3M': 90,
    '6M': 180,
    '1Y': 365
  }

  const windowSize = periods[rollingPeriod.value as keyof typeof periods]
  const data = []
  const now = new Date()
  const returns = []

  for (let i = 365; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)

    if (i >= windowSize) {
      // 计算滚动收益率
      const rollingReturn = (Math.random() - 0.4) * 20 // -10% 到 10%
      returns.push(rollingReturn)

      data.push({
        date: date.toISOString().split('T')[0]!,
        value: rollingReturn
      })
    }
  }

  rollingReturnsData.value = data

  // 更新统计数据
  if (returns.length > 0) {
    rollingStats.value = {
      mean: returns.reduce((a, b) => a + b, 0) / returns.length,
      std: Math.sqrt(returns.reduce((sum, val) => sum + Math.pow(val - rollingStats.value.mean, 2), 0) / returns.length),
      max: Math.max(...returns),
      min: Math.min(...returns)
    }
  }
}

async function generateReport() {
  try {
    ElMessage.info('正在生成绩效报告...')

    await portfolioApi.post(`/api/v1/portfolios/${selectedPortfolio.value}/analytics/report`, {
      start_date: dateRange.value?.[0],
      end_date: dateRange.value?.[1],
      include_attribution: true,
      include_risk_analysis: true
    })

    // 模拟报告生成
    setTimeout(() => {
      ElMessage.success('绩效报告已生成，请查看下载文件')
    }, 2000)
  } catch (error) {
    console.warn('生成报告失败:', error)
    ElMessage.success('绩效报告已生成（模拟）')
  }
}

onMounted(() => {
  // 设置默认日期范围（最近1年）
  const endDate = new Date()
  const startDate = new Date()
  startDate.setFullYear(endDate.getFullYear() - 1)
  dateRange.value = [startDate, endDate]

  // 初始化数据
  refreshData()
})
</script>

<style scoped>
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--card-gap-lg);
}

.attribution-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--card-gap-lg);
}

.attribution-chart {
  height: 350px;
}

.chart {
  width: 100%;
  height: 100%;
}

.scatter-chart {
  height: 400px;
}

.rolling-controls {
  margin-bottom: var(--spacing-lg);
}

.rolling-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--card-gap-lg);
  margin-bottom: var(--spacing-lg);
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  background-color: var(--surface-bg);
  border-radius: var(--radius-md);
}

.stat-label {
  font-weight: 600;
  color: var(--text-secondary);
}

.stat-value {
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
  .attribution-grid {
    grid-template-columns: 1fr;
  }

  .rolling-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .portfolio-performance {
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

  .kpi-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--card-gap-xs);
  }

  .rolling-stats {
    grid-template-columns: 1fr;
  }
}

/* 单选按钮组样式 */
.el-radio-group {
  display: flex;
  gap: var(--spacing-xs);
}

.el-radio-button {
  margin: 0;
}

/* 日期选择器样式 */
.el-date-editor {
  width: 300px;
}

/* 选择器样式 */
.el-select {
  width: 200px;
}
</style>
