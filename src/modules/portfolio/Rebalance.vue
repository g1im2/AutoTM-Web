<template>
  <PageTemplate>
    <template #actions>
      <el-select v-model="selectedPortfolio" placeholder="选择组合" style="width: 200px" @change="loadPortfolioData">
        <el-option label="稳健增长组合" value="PF001" />
        <el-option label="价值投资组合" value="PF002" />
        <el-option label="科技成长组合" value="PF003" />
      </el-select>
      <el-button type="primary" @click="generateRebalanceAdvice" :loading="generating">
        <el-icon><Refresh /></el-icon>
        生成建议
      </el-button>
    </template>

    <!-- 再平衡概览 -->
    <div class="overview-cards">
        <KpiCard 
          title="偏离度" 
          :value="rebalanceMetrics.deviation" 
          format="percentage"
          :type="rebalanceMetrics.deviation > 5 ? 'warning' : 'success'"
          subtitle="与目标权重偏离"
        />
        <KpiCard 
          title="建议交易数量" 
          :value="rebalanceAdvice.length" 
          subtitle="需要调整的持仓"
          :type="rebalanceAdvice.length > 0 ? 'warning' : 'success'"
        />
        <KpiCard 
          title="预计交易成本" 
          :value="rebalanceMetrics.estimatedCost" 
          format="currency"
          type="warning"
          subtitle="手续费和冲击成本"
        />
        <KpiCard 
          title="预计改善" 
          :value="rebalanceMetrics.expectedImprovement" 
          format="percentage"
          type="success"
          subtitle="风险调整收益提升"
        />
      </div>

    <!-- 当前持仓 vs 目标权重 -->
    <ChartCard title="权重对比分析" height="400px">
      <div class="comparison-chart">
        <v-chart class="chart" :option="weightComparisonOption" autoresize />
      </div>
    </ChartCard>

    <!-- 再平衡建议 -->
    <ChartCard title="再平衡建议">
        <template #header>
          <div class="card-header">
            <h3>再平衡建议</h3>
            <div class="header-controls">
              <el-switch
                v-model="autoExecute"
                active-text="自动执行"
                inactive-text="手动确认"
              />
              <el-button 
                type="primary" 
                @click="executeAllTrades" 
                :disabled="!hasValidAdvice"
                :loading="executing"
              >
                <el-icon><Position /></el-icon>
                执行全部
              </el-button>
            </div>
          </div>
        </template>

        <div class="table-wrapper">
          <el-table :data="paginatedAdvice" style="width: 100%" stripe border>
            <el-table-column type="selection" :width="55" header-align="center" />
            <el-table-column prop="symbol" label="代码" :min-width="100" show-overflow-tooltip header-align="center" />
            <el-table-column prop="name" label="名称" :min-width="150" show-overflow-tooltip header-align="center" />
            <el-table-column prop="currentWeight" label="当前权重" :min-width="110" align="right" header-align="center">
              <template #default="{ row }">
                {{ row.currentWeight.toFixed(2) }}%
              </template>
            </el-table-column>
            <el-table-column prop="targetWeight" label="目标权重" :min-width="110" align="right" header-align="center">
              <template #default="{ row }">
                {{ row.targetWeight.toFixed(2) }}%
              </template>
            </el-table-column>
            <el-table-column prop="deviation" label="偏离度" :min-width="100" align="right" header-align="center">
              <template #default="{ row }">
                <span :class="getDeviationClass(row.deviation)">
                  {{ row.deviation > 0 ? '+' : '' }}{{ row.deviation.toFixed(2) }}%
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="action" label="操作类型" :min-width="100" align="center" header-align="center">
              <template #default="{ row }">
                <el-tag :type="getActionType(row.action)">{{ row.action }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="quantity" label="交易数量" :min-width="110" align="right" header-align="center">
              <template #default="{ row }">
                {{ row.quantity > 0 ? '+' : '' }}{{ row.quantity.toLocaleString() }}
              </template>
            </el-table-column>
            <el-table-column prop="estimatedValue" label="交易金额" :min-width="110" align="right" header-align="center">
              <template #default="{ row }">
                {{ formatCurrency(Math.abs(row.estimatedValue)) }}
              </template>
            </el-table-column>
            <el-table-column prop="priority" label="优先级" :min-width="100" align="center" header-align="center">
              <template #default="{ row }">
                <el-tag :type="getPriorityType(row.priority)" size="small">{{ row.priority }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" :min-width="100" align="center" header-align="center">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)" size="small">{{ row.statusText }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" fixed="right" :min-width="150" align="left" header-align="center">
              <template #default="{ row }">
                <el-button
                  size="small"
                  type="primary"
                  @click="executeTrade(row)"
                  :disabled="row.status === 'executed' || row.status === 'executing'"
                  :loading="row.status === 'executing'"
                >
                  {{ row.status === 'executed' ? '已执行' : '执行' }}
                </el-button>
                <el-button size="small" @click="editTrade(row)">
                  <el-icon><Edit /></el-icon>
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            v-if="rebalanceAdvice.length > 10"
            v-model:current-page="adviceCurrentPage"
            v-model:page-size="advicePageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="rebalanceAdvice.length"
            layout="total, sizes, prev, pager, next, jumper"
            class="pagination"
          />
        </div>
      </ChartCard>

    <!-- 执行历史 -->
    <ChartCard title="执行历史">
        <div class="history-filters">
          <el-date-picker
            v-model="historyDateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            @change="loadExecutionHistory"
          />
          <el-select v-model="historyStatus" placeholder="状态筛选" style="width: 150px" @change="loadExecutionHistory">
            <el-option label="全部" value="" />
            <el-option label="已执行" value="executed" />
            <el-option label="执行中" value="executing" />
            <el-option label="已取消" value="cancelled" />
            <el-option label="失败" value="failed" />
          </el-select>
        </div>

        <div class="table-wrapper">
          <el-table :data="paginatedHistory" style="width: 100%" stripe border>
            <el-table-column prop="executeTime" label="执行时间" :min-width="180" show-overflow-tooltip header-align="center" />
            <el-table-column prop="symbol" label="代码" :min-width="100" show-overflow-tooltip header-align="center" />
            <el-table-column prop="name" label="名称" :min-width="150" show-overflow-tooltip header-align="center" />
            <el-table-column prop="action" label="操作" :min-width="100" align="center" header-align="center">
              <template #default="{ row }">
                <el-tag :type="getActionType(row.action)" size="small">{{ row.action }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="quantity" label="数量" :min-width="120" align="right" header-align="center">
              <template #default="{ row }">
                {{ row.quantity.toLocaleString() }}
              </template>
            </el-table-column>
            <el-table-column prop="price" label="成交价格" :min-width="110" align="right" header-align="center">
              <template #default="{ row }">
                ¥{{ row.price.toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column prop="totalValue" label="成交金额" :min-width="110" align="right" header-align="center">
              <template #default="{ row }">
                {{ formatCurrency(row.totalValue) }}
              </template>
            </el-table-column>
            <el-table-column prop="commission" label="手续费" :min-width="100" align="right" header-align="center">
              <template #default="{ row }">
                ¥{{ row.commission.toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" :min-width="100" align="center" header-align="center">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)" size="small">{{ row.statusText }}</el-tag>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            v-if="executionHistory.length > 10"
            v-model:current-page="historyCurrentPage"
            v-model:page-size="historyPageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="executionHistory.length"
            layout="total, sizes, prev, pager, next, jumper"
            class="pagination"
          />
        </div>
      </ChartCard>

    <!-- 交易编辑对话框 -->
    <el-dialog v-model="showEditDialog" title="编辑交易" width="600px">
      <el-form :model="editForm" label-width="120px">
        <el-form-item label="股票">
          <el-input :value="`${editForm.symbol} - ${editForm.name}`" disabled />
        </el-form-item>
        <el-form-item label="交易数量">
          <el-input-number v-model="editForm.quantity" style="width: 100%" />
        </el-form-item>
        <el-form-item label="价格类型">
          <el-radio-group v-model="editForm.priceType">
            <el-radio label="market">市价</el-radio>
            <el-radio label="limit">限价</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="限价" v-if="editForm.priceType === 'limit'">
          <el-input-number v-model="editForm.limitPrice" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="有效期">
          <el-select v-model="editForm.timeInForce" style="width: 100%">
            <el-option label="当日有效" value="DAY" />
            <el-option label="立即成交或取消" value="IOC" />
            <el-option label="全部成交或取消" value="FOK" />
          </el-select>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showEditDialog = false">取消</el-button>
        <el-button type="primary" @click="saveTradeEdit">保存</el-button>
      </template>
    </el-dialog>
  </PageTemplate>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import PageTemplate from '../../components/PageTemplate.vue'
import { portfolioApi } from '../../api/clients'
import KpiCard from '../../components/KpiCard.vue'
import ChartCard from '../../components/ChartCard.vue'
import { Refresh, Position, Edit } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart } from 'echarts/charts'
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
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

interface RebalanceAdvice {
  symbol: string
  name: string
  currentWeight: number
  targetWeight: number
  deviation: number
  action: string
  quantity: number
  estimatedValue: number
  priority: string
  status: string
  statusText: string
}

interface ExecutionHistory {
  executeTime: string
  symbol: string
  name: string
  action: string
  quantity: number
  price: number
  totalValue: number
  commission: number
  status: string
  statusText: string
}

interface RebalanceMetrics {
  deviation: number
  estimatedCost: number
  expectedImprovement: number
}

interface EditForm {
  symbol: string
  name: string
  quantity: number
  priceType: string
  limitPrice: number
  timeInForce: string
}

// 状态管理
const selectedPortfolio = ref('PF001')
const generating = ref(false)
const executing = ref(false)
const autoExecute = ref(false)
const showEditDialog = ref(false)
const historyDateRange = ref<[Date, Date] | null>(null)
const historyStatus = ref('')

// 分页相关
const adviceCurrentPage = ref(1)
const advicePageSize = ref(10)
const historyCurrentPage = ref(1)
const historyPageSize = ref(10)

// 再平衡指标
const rebalanceMetrics = ref<RebalanceMetrics>({
  deviation: 8.5,
  estimatedCost: 12500,
  expectedImprovement: 2.3
})

// 再平衡建议
const rebalanceAdvice = ref<RebalanceAdvice[]>([
  {
    symbol: '000001',
    name: '平安银行',
    currentWeight: 18.5,
    targetWeight: 15.0,
    deviation: -3.5,
    action: '卖出',
    quantity: -5000,
    estimatedValue: -62500,
    priority: '高',
    status: 'pending',
    statusText: '待执行'
  },
  {
    symbol: '600519',
    name: '贵州茅台',
    currentWeight: 22.0,
    targetWeight: 25.0,
    deviation: 3.0,
    action: '买入',
    quantity: 100,
    estimatedValue: 180000,
    priority: '高',
    status: 'pending',
    statusText: '待执行'
  },
  {
    symbol: '000858',
    name: '五粮液',
    currentWeight: 12.5,
    targetWeight: 15.0,
    deviation: 2.5,
    action: '买入',
    quantity: 800,
    estimatedValue: 120000,
    priority: '中',
    status: 'pending',
    statusText: '待执行'
  },
  {
    symbol: '600036',
    name: '招商银行',
    currentWeight: 20.0,
    targetWeight: 18.0,
    deviation: -2.0,
    action: '卖出',
    quantity: -2000,
    estimatedValue: -70400,
    priority: '中',
    status: 'pending',
    statusText: '待执行'
  }
])

// 执行历史
const executionHistory = ref<ExecutionHistory[]>([
  {
    executeTime: '2024-01-15 14:30:25',
    symbol: '000002',
    name: '万科A',
    action: '卖出',
    quantity: 3000,
    price: 18.25,
    totalValue: 54750,
    commission: 27.38,
    status: 'executed',
    statusText: '已执行'
  },
  {
    executeTime: '2024-01-15 14:28:12',
    symbol: '600887',
    name: '伊利股份',
    action: '买入',
    quantity: 2000,
    price: 32.80,
    totalValue: 65600,
    commission: 32.80,
    status: 'executed',
    statusText: '已执行'
  }
])

// 编辑表单
const editForm = ref<EditForm>({
  symbol: '',
  name: '',
  quantity: 0,
  priceType: 'market',
  limitPrice: 0,
  timeInForce: 'DAY'
})

// 计算属性
const hasValidAdvice = computed(() => {
  return rebalanceAdvice.value.some(advice => advice.status === 'pending')
})

// 分页数据
const paginatedAdvice = computed(() => {
  const start = (adviceCurrentPage.value - 1) * advicePageSize.value
  const end = start + advicePageSize.value
  return rebalanceAdvice.value.slice(start, end)
})

const paginatedHistory = computed(() => {
  const start = (historyCurrentPage.value - 1) * historyPageSize.value
  const end = start + historyPageSize.value
  return executionHistory.value.slice(start, end)
})

// 权重对比图表配置
const weightComparisonOption = computed(() => {
  const symbols = rebalanceAdvice.value.map(item => item.symbol)
  const currentWeights = rebalanceAdvice.value.map(item => item.currentWeight)
  const targetWeights = rebalanceAdvice.value.map(item => item.targetWeight)

  return {
    title: {
      text: '当前权重 vs 目标权重',
      textStyle: { color: 'var(--text-primary)', fontSize: 14 }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    legend: {
      data: ['当前权重', '目标权重'],
      textStyle: { color: 'var(--text-secondary)' }
    },
    xAxis: {
      type: 'category',
      data: symbols,
      axisLabel: { color: 'var(--text-secondary)' }
    },
    yAxis: {
      type: 'value',
      name: '权重 (%)',
      axisLabel: { color: 'var(--text-secondary)' }
    },
    series: [
      {
        name: '当前权重',
        type: 'bar',
        data: currentWeights,
        itemStyle: { color: '#3b82f6' }
      },
      {
        name: '目标权重',
        type: 'bar',
        data: targetWeights,
        itemStyle: { color: '#10b981' }
      }
    ]
  }
})

// 方法
function getDeviationClass(deviation: number) {
  if (Math.abs(deviation) > 3) return 'text-danger'
  if (Math.abs(deviation) > 1) return 'text-warning'
  return 'text-success'
}

function getActionType(action: string) {
  switch (action) {
    case '买入': return 'success'
    case '卖出': return 'danger'
    default: return 'info'
  }
}

function getPriorityType(priority: string) {
  switch (priority) {
    case '高': return 'danger'
    case '中': return 'warning'
    case '低': return 'info'
    default: return 'default'
  }
}

function getStatusType(status: string) {
  switch (status) {
    case 'executed': return 'success'
    case 'executing': return 'warning'
    case 'pending': return 'info'
    case 'cancelled': return 'info'
    case 'failed': return 'danger'
    default: return 'default'
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 0
  }).format(value)
}

async function loadPortfolioData() {
  try {
    // 后端路径：/api/v1/portfolio/{portfolio_id}/rebalance/suggestions (GET)
    const { data } = await portfolioApi.get(`/api/v1/portfolio/${selectedPortfolio.value}/rebalance/suggestions`)

    // 如果后端返回数据，使用真实数据
    if (data?.data?.suggestions && Array.isArray(data.data.suggestions)) {
      rebalanceAdvice.value = data.data.suggestions.map((item: any) => ({
        symbol: item.symbol || '',
        name: item.name || '',
        currentWeight: item.current_weight || 0,
        targetWeight: item.target_weight || 0,
        deviation: item.deviation || 0,
        action: item.action || '',
        quantity: item.quantity || 0,
        estimatedValue: item.estimated_value || 0,
        priority: item.priority || '中',
        status: 'pending',
        statusText: '待执行'
      }))
    }
  } catch (error) {
    console.warn('加载组合数据失败:', error)
    // 保留模拟数据
  }
}

async function generateRebalanceAdvice() {
  generating.value = true

  try {
    await portfolioApi.get(`/api/v1/portfolio/${selectedPortfolio.value}/rebalance/suggestions`)

    // 模拟生成新的建议
    rebalanceAdvice.value.forEach(advice => {
      advice.status = 'pending'
      advice.statusText = '待执行'
      // 随机调整一些数值
      advice.deviation += (Math.random() - 0.5) * 2
      advice.quantity = Math.round(advice.quantity * (0.8 + Math.random() * 0.4))
      advice.estimatedValue = advice.quantity * (Math.random() * 50 + 100)
    })

    ElMessage.success('再平衡建议已生成')
  } catch (error) {
    console.warn('生成建议失败:', error)
    ElMessage.success('再平衡建议已生成（模拟）')
  } finally {
    generating.value = false
  }
}

async function executeTrade(advice: RebalanceAdvice) {
  try {
    await ElMessageBox.confirm(
      `确定要执行 ${advice.action} ${advice.name} ${Math.abs(advice.quantity)} 股吗？`,
      '确认执行',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    advice.status = 'executing'
    advice.statusText = '执行中'

    // 模拟执行
    await portfolioApi.post(`/api/v1/portfolio/${selectedPortfolio.value}/rebalance/submit`, {
      symbol: advice.symbol,
      action: advice.action,
      quantity: Math.abs(advice.quantity)
    })

    // 模拟执行完成
    setTimeout(() => {
      advice.status = 'executed'
      advice.statusText = '已执行'

      // 添加到执行历史
      executionHistory.value.unshift({
        executeTime: new Date().toLocaleString(),
        symbol: advice.symbol,
        name: advice.name,
        action: advice.action,
        quantity: Math.abs(advice.quantity),
        price: Math.random() * 50 + 100,
        totalValue: Math.abs(advice.estimatedValue),
        commission: Math.abs(advice.estimatedValue) * 0.0005,
        status: 'executed',
        statusText: '已执行'
      })

      ElMessage.success('交易执行成功')
    }, 2000)

  } catch (e) {
    if (e !== 'cancel') {
      advice.status = 'failed'
      advice.statusText = '执行失败'
      ElMessage.error('交易执行失败')
    } else {
      advice.status = 'pending'
      advice.statusText = '待执行'
    }
  }
}

async function executeAllTrades() {
  const pendingTrades = rebalanceAdvice.value.filter(advice => advice.status === 'pending')

  if (pendingTrades.length === 0) {
    ElMessage.warning('没有待执行的交易')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要执行全部 ${pendingTrades.length} 笔交易吗？`,
      '确认批量执行',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    executing.value = true

    // 批量执行
    for (const advice of pendingTrades) {
      advice.status = 'executing'
      advice.statusText = '执行中'
    }

    await portfolioApi.post(`/api/v1/portfolio/${selectedPortfolio.value}/rebalance/submit`)

    // 模拟批量执行完成
    setTimeout(() => {
      pendingTrades.forEach(advice => {
        advice.status = 'executed'
        advice.statusText = '已执行'

        // 添加到执行历史
        executionHistory.value.unshift({
          executeTime: new Date().toLocaleString(),
          symbol: advice.symbol,
          name: advice.name,
          action: advice.action,
          quantity: Math.abs(advice.quantity),
          price: Math.random() * 50 + 100,
          totalValue: Math.abs(advice.estimatedValue),
          commission: Math.abs(advice.estimatedValue) * 0.0005,
          status: 'executed',
          statusText: '已执行'
        })
      })

      executing.value = false
      ElMessage.success(`成功执行 ${pendingTrades.length} 笔交易`)
    }, 3000)

  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('批量执行失败')
    }
    executing.value = false
  }
}

function editTrade(advice: RebalanceAdvice) {
  editForm.value = {
    symbol: advice.symbol,
    name: advice.name,
    quantity: Math.abs(advice.quantity),
    priceType: 'market',
    limitPrice: 0,
    timeInForce: 'DAY'
  }
  showEditDialog.value = true
}

function saveTradeEdit() {
  // 更新建议中的数量
  const advice = rebalanceAdvice.value.find(a => a.symbol === editForm.value.symbol)
  if (advice) {
    const sign = advice.action === '买入' ? 1 : -1
    advice.quantity = editForm.value.quantity * sign
    advice.estimatedValue = editForm.value.quantity * (Math.random() * 50 + 100) * sign
  }

  showEditDialog.value = false
  ElMessage.success('交易参数已更新')
}

async function loadExecutionHistory() {
  try {
    // 后端路径：/api/v1/portfolio/{portfolio_id}/rebalance/history (GET)
    const { data } = await portfolioApi.get(`/api/v1/portfolio/${selectedPortfolio.value}/rebalance/history`, {
      params: {
        start_date: historyDateRange.value?.[0]?.toISOString().split('T')[0],
        end_date: historyDateRange.value?.[1]?.toISOString().split('T')[0],
        status: historyStatus.value || undefined
      }
    })

    // 如果后端返回数据，使用真实数据
    if (data?.data?.history && Array.isArray(data.data.history)) {
      executionHistory.value = data.data.history.map((item: any) => ({
        executeTime: item.execute_time || '',
        symbol: item.symbol || '',
        name: item.name || '',
        action: item.action || '',
        quantity: item.quantity || 0,
        price: item.price || 0,
        totalValue: item.total_value || 0,
        commission: item.commission || 0,
        status: item.status || '',
        statusText: item.status_text || ''
      }))
    }
  } catch (error) {
    console.warn('加载执行历史失败:', error)
    // 保留模拟数据
  }
}

onMounted(() => {
  // 设置默认历史查询范围（最近30天）
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(endDate.getDate() - 30)
  historyDateRange.value = [startDate, endDate]

  // 加载初始数据
  loadPortfolioData()
  loadExecutionHistory()
})
</script>

<style scoped>

.overview-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
}

.weight-comparison {
  margin-bottom: var(--spacing-xl);
}

.comparison-chart {
  height: 400px;
}

.chart {
  width: 100%;
  height: 100%;
}

.rebalance-advice {
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

.execution-history {
  margin-bottom: var(--spacing-xl);
}

.history-filters {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
  align-items: center;
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

/* 对话框样式 */
.el-dialog__body {
  padding: var(--spacing-lg);
}

/* 表单样式增强 */
.el-form-item__label {
  color: var(--text-primary);
  font-weight: 500;
}

/* 开关样式 */
.el-switch {
  --el-switch-on-color: var(--success-color);
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
@media (max-width: 768px) {
  .portfolio-rebalance {
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
    justify-content: space-between;
  }

  .history-filters {
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

/* 输入框样式 */
.el-input-number {
  width: 100%;
}

/* 单选按钮组样式 */
.el-radio-group {
  display: flex;
  gap: var(--spacing-sm);
}
</style>
