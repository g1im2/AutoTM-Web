<template>
  <PageTemplate>
    <!-- 优化参数设置 -->
    <el-card>
      <template #header>
        <div class="card-header">
          <h3>优化参数设置</h3>
        </div>
      </template>
        
        <el-form
          :model="optimizerForm"
          :rules="optimizerRules"
          ref="optimizerFormRef"
          label-width="120px"
          class="settings-form"
        >
          <el-row :gutter="24">
            <el-col :span="8">
              <el-form-item label="优化目标" prop="objective">
                <el-select v-model="optimizerForm.objective" style="width: 100%">
                  <el-option label="最大化夏普比率" value="max_sharpe" />
                  <el-option label="最小化风险" value="min_risk" />
                  <el-option label="最大化收益" value="max_return" />
                  <el-option label="风险平价" value="risk_parity" />
                  <el-option label="等权重" value="equal_weight" />
                </el-select>
              </el-form-item>
            </el-col>
            
            <el-col :span="8">
              <el-form-item label="目标收益率" prop="targetReturn">
                <el-input-number
                  v-model="optimizerForm.targetReturn"
                  :min="0"
                  :max="50"
                  :step="0.1"
                  :precision="2"
                  style="width: 100%"
                />
                <span style="margin-left: 8px; color: var(--text-muted);">%</span>
              </el-form-item>
            </el-col>
            
            <el-col :span="8">
              <el-form-item label="风险厌恶系数">
                <el-input-number 
                  v-model="optimizerForm.riskAversion" 
                  :min="0.1" 
                  :max="10" 
                  :step="0.1"
                  :precision="1"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-row :gutter="24">
            <el-col :span="8">
              <el-form-item label="最大权重限制">
                <el-input-number 
                  v-model="optimizerForm.maxWeight" 
                  :min="1" 
                  :max="100" 
                  :step="1"
                  style="width: 100%"
                />
                <span style="margin-left: 8px; color: var(--text-muted);">%</span>
              </el-form-item>
            </el-col>
            
            <el-col :span="8">
              <el-form-item label="最小权重限制">
                <el-input-number 
                  v-model="optimizerForm.minWeight" 
                  :min="0" 
                  :max="10" 
                  :step="0.1"
                  :precision="1"
                  style="width: 100%"
                />
                <span style="margin-left: 8px; color: var(--text-muted);">%</span>
              </el-form-item>
            </el-col>
            
            <el-col :span="8">
              <el-form-item label="重新平衡频率">
                <el-select v-model="optimizerForm.rebalanceFreq" style="width: 100%">
                  <el-option label="每日" value="daily" />
                  <el-option label="每周" value="weekly" />
                  <el-option label="每月" value="monthly" />
                  <el-option label="每季度" value="quarterly" />
                  <el-option label="每年" value="yearly" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-form-item>
            <el-button type="primary" @click="runOptimization" :loading="optimizing">
              <el-icon><DataAnalysis /></el-icon>
              运行优化
            </el-button>
            <el-button @click="resetForm">
              <el-icon><Refresh /></el-icon>
              重置参数
            </el-button>
          </el-form-item>
        </el-form>
    </el-card>

    <!-- 资产选择 -->
    <el-card>
        <template #header>
          <div class="card-header">
            <h3>资产选择</h3>
            <el-button size="small" @click="showAssetSelector = true">
              <el-icon><Plus /></el-icon>
              添加资产
            </el-button>
          </div>
        </template>

        <div class="table-wrapper">
          <el-table :data="paginatedAssets" style="width: 100%" stripe border>
            <el-table-column prop="symbol" label="代码" :min-width="100" show-overflow-tooltip header-align="center" />
            <el-table-column prop="name" label="名称" :min-width="150" show-overflow-tooltip header-align="center" />
            <el-table-column prop="sector" label="行业" :min-width="120" show-overflow-tooltip header-align="center" />
            <el-table-column prop="expectedReturn" label="预期收益率" :min-width="130" align="right" header-align="center">
              <template #default="{ row }">
                {{ row.expectedReturn.toFixed(2) }}%
              </template>
            </el-table-column>
            <el-table-column prop="volatility" label="波动率" :min-width="100" align="right" header-align="center">
              <template #default="{ row }">
                {{ row.volatility.toFixed(2) }}%
              </template>
            </el-table-column>
            <el-table-column prop="currentWeight" label="当前权重" :min-width="110" align="right" header-align="center">
              <template #default="{ row }">
                {{ row.currentWeight.toFixed(2) }}%
              </template>
            </el-table-column>
            <el-table-column prop="optimizedWeight" label="优化权重" :min-width="110" align="right" header-align="center">
              <template #default="{ row }">
                <span v-if="row.optimizedWeight !== null" :class="getWeightChangeClass(row.optimizedWeight - row.currentWeight)">
                  {{ row.optimizedWeight.toFixed(2) }}%
                </span>
                <span v-else class="text-muted">--</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" fixed="right" :min-width="100" align="center" header-align="center">
              <template #default="{ $index }">
                <el-button size="small" type="danger" @click="removeAsset(getActualIndex($index))">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            v-if="selectedAssets.length > 10"
            v-model:current-page="assetsCurrentPage"
            v-model:page-size="assetsPageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="selectedAssets.length"
            layout="total, sizes, prev, pager, next, jumper"
            class="pagination"
          />
        </div>
    </el-card>

    <!-- 优化结果 -->
    <template v-if="optimizationResults">
      <div class="results-grid">
        <!-- 优化指标 -->
        <el-card>
          <template #header>
            <h3>优化结果指标</h3>
          </template>
          <div class="metrics-grid">
            <div class="metric-item">
              <span class="metric-label">预期收益率</span>
              <span class="metric-value text-success">{{ optimizationResults.expectedReturn.toFixed(2) }}%</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">预期风险</span>
              <span class="metric-value text-warning">{{ optimizationResults.expectedRisk.toFixed(2) }}%</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">夏普比率</span>
              <span class="metric-value">{{ optimizationResults.sharpeRatio.toFixed(3) }}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">信息比率</span>
              <span class="metric-value">{{ optimizationResults.informationRatio.toFixed(3) }}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">最大回撤</span>
              <span class="metric-value text-danger">{{ optimizationResults.maxDrawdown.toFixed(2) }}%</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">VaR (95%)</span>
              <span class="metric-value text-danger">{{ optimizationResults.var95.toFixed(2) }}%</span>
            </div>
          </div>
        </el-card>

        <!-- 有效前沿图 -->
        <el-card>
          <template #header>
            <h3>有效前沿</h3>
          </template>
          <div class="efficient-frontier">
            <v-chart class="chart" :option="efficientFrontierOption" autoresize />
          </div>
        </el-card>
      </div>

      <!-- 权重分布图 -->
      <el-card>
        <template #header>
          <h3>权重分布对比</h3>
        </template>
        <div class="weight-charts">
          <div class="weight-chart">
            <h4>当前权重</h4>
            <v-chart class="chart" :option="currentWeightOption" autoresize />
          </div>
          <div class="weight-chart">
            <h4>优化权重</h4>
            <v-chart class="chart" :option="optimizedWeightOption" autoresize />
          </div>
        </div>
      </el-card>
    </template>

    <!-- 资产选择对话框 -->
    <el-dialog v-model="showAssetSelector" title="选择资产" width="800px">
      <el-input
        v-model="assetSearchText"
        placeholder="搜索股票代码或名称"
        style="margin-bottom: 16px"
        clearable
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      
      <el-table
        :data="filteredAvailableAssets"
        style="width: 100%"
        stripe
        border
        @selection-change="handleAssetSelection"
        max-height="400"
      >
        <el-table-column type="selection" :width="55" header-align="center" />
        <el-table-column prop="symbol" label="代码" :min-width="100" show-overflow-tooltip header-align="center" />
        <el-table-column prop="name" label="名称" :min-width="150" show-overflow-tooltip header-align="center" />
        <el-table-column prop="sector" label="行业" :min-width="120" show-overflow-tooltip header-align="center" />
        <el-table-column prop="marketCap" label="市值" :min-width="120" align="right" header-align="center" />
      </el-table>
      
      <template #footer>
        <el-button @click="showAssetSelector = false">取消</el-button>
        <el-button type="primary" @click="addSelectedAssets">确定</el-button>
      </template>
    </el-dialog>
  </PageTemplate>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import PageTemplate from '../../components/PageTemplate.vue'
import { portfolioApi } from '../../api/clients'
import {
  DataAnalysis, Refresh, Plus, Delete, Search
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { ScatterChart, PieChart } from 'echarts/charts'
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
  ScatterChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

interface Asset {
  symbol: string
  name: string
  sector: string
  expectedReturn: number
  volatility: number
  currentWeight: number
  optimizedWeight: number | null
  marketCap?: string
}

interface OptimizationResults {
  expectedReturn: number
  expectedRisk: number
  sharpeRatio: number
  informationRatio: number
  maxDrawdown: number
  var95: number
  efficientFrontier: Array<{ risk: number; return: number }>
}

// 表单数据
const optimizerForm = ref({
  objective: 'max_sharpe',
  targetReturn: 10.0,
  riskAversion: 3.0,
  maxWeight: 20.0,
  minWeight: 0.5,
  rebalanceFreq: 'monthly'
})

// 状态管理
const optimizing = ref(false)
const showAssetSelector = ref(false)
const assetSearchText = ref('')
const optimizationResults = ref<OptimizationResults | null>(null)
const optimizerFormRef = ref<FormInstance>()

// 表单验证规则
const optimizerRules: FormRules = {
  objective: [
    { required: true, message: '请选择优化目标', trigger: 'change' }
  ],
  targetReturn: [
    { required: true, message: '请输入目标收益率', trigger: 'blur' },
    { type: 'number', min: 0, max: 50, message: '目标收益率应在0-50%之间', trigger: 'blur' }
  ],
  riskAversion: [
    { required: true, message: '请输入风险厌恶系数', trigger: 'blur' },
    { type: 'number', min: 0.1, max: 10, message: '风险厌恶系数应在0.1-10之间', trigger: 'blur' }
  ],
  maxWeight: [
    { required: true, message: '请输入最大权重限制', trigger: 'blur' },
    { type: 'number', min: 1, max: 100, message: '最大权重应在1-100%之间', trigger: 'blur' }
  ],
  minWeight: [
    { required: true, message: '请输入最小权重限制', trigger: 'blur' },
    { type: 'number', min: 0, max: 10, message: '最小权重应在0-10%之间', trigger: 'blur' }
  ],
  rebalanceFreq: [
    { required: true, message: '请选择重新平衡频率', trigger: 'change' }
  ]
}

// 已选择的资产
const selectedAssets = ref<Asset[]>([
  {
    symbol: '000001',
    name: '平安银行',
    sector: '金融',
    expectedReturn: 8.5,
    volatility: 25.3,
    currentWeight: 15.0,
    optimizedWeight: null
  },
  {
    symbol: '000002',
    name: '万科A',
    sector: '房地产',
    expectedReturn: 6.2,
    volatility: 28.7,
    currentWeight: 12.0,
    optimizedWeight: null
  },
  {
    symbol: '600036',
    name: '招商银行',
    sector: '金融',
    expectedReturn: 9.1,
    volatility: 22.8,
    currentWeight: 18.0,
    optimizedWeight: null
  },
  {
    symbol: '600519',
    name: '贵州茅台',
    sector: '消费',
    expectedReturn: 12.3,
    volatility: 35.2,
    currentWeight: 25.0,
    optimizedWeight: null
  },
  {
    symbol: '000858',
    name: '五粮液',
    sector: '消费',
    expectedReturn: 10.8,
    volatility: 32.1,
    currentWeight: 20.0,
    optimizedWeight: null
  }
])

// 可选资产池
const availableAssets = ref<Asset[]>([
  { symbol: '600000', name: '浦发银行', sector: '金融', expectedReturn: 7.8, volatility: 24.1, currentWeight: 0, optimizedWeight: null, marketCap: '2156亿' },
  { symbol: '000858', name: '五粮液', sector: '消费', expectedReturn: 10.8, volatility: 32.1, currentWeight: 0, optimizedWeight: null, marketCap: '8932亿' },
  { symbol: '600887', name: '伊利股份', sector: '消费', expectedReturn: 8.9, volatility: 26.4, currentWeight: 0, optimizedWeight: null, marketCap: '2847亿' },
  { symbol: '002415', name: '海康威视', sector: '科技', expectedReturn: 11.2, volatility: 38.5, currentWeight: 0, optimizedWeight: null, marketCap: '3621亿' },
  { symbol: '300059', name: '东方财富', sector: '金融', expectedReturn: 15.6, volatility: 45.2, currentWeight: 0, optimizedWeight: null, marketCap: '2156亿' }
])

const selectedAssetsForAdd = ref<Asset[]>([])

// 分页相关
const assetsCurrentPage = ref(1)
const assetsPageSize = ref(10)

// 计算属性
const paginatedAssets = computed(() => {
  const start = (assetsCurrentPage.value - 1) * assetsPageSize.value
  const end = start + assetsPageSize.value
  return selectedAssets.value.slice(start, end)
})

const filteredAvailableAssets = computed(() => {
  if (!assetSearchText.value) return availableAssets.value

  const searchLower = assetSearchText.value.toLowerCase()
  return availableAssets.value.filter(asset =>
    asset.symbol.toLowerCase().includes(searchLower) ||
    asset.name.toLowerCase().includes(searchLower)
  )
})

// 获取实际索引（考虑分页）
function getActualIndex(pageIndex: number): number {
  return (assetsCurrentPage.value - 1) * assetsPageSize.value + pageIndex
}

// 有效前沿图表配置
const efficientFrontierOption = computed(() => {
  if (!optimizationResults.value) return {}

  return {
    title: {
      text: '有效前沿',
      textStyle: { color: 'var(--text-primary)', fontSize: 14 }
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => `风险: ${params.value[0].toFixed(2)}%<br/>收益: ${params.value[1].toFixed(2)}%`
    },
    xAxis: {
      type: 'value',
      name: '风险 (%)',
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
        name: '有效前沿',
        type: 'scatter',
        data: optimizationResults.value.efficientFrontier.map(point => [point.risk, point.return]),
        itemStyle: { color: '#3b82f6' },
        symbolSize: 6
      },
      {
        name: '当前组合',
        type: 'scatter',
        data: [[calculateCurrentRisk(), calculateCurrentReturn()]],
        itemStyle: { color: '#ef4444' },
        symbolSize: 10,
        symbol: 'diamond'
      },
      {
        name: '优化组合',
        type: 'scatter',
        data: [[optimizationResults.value.expectedRisk, optimizationResults.value.expectedReturn]],
        itemStyle: { color: '#10b981' },
        symbolSize: 10,
        symbol: 'triangle'
      }
    ]
  }
})

// 当前权重饼图配置
const currentWeightOption = computed(() => ({
  tooltip: {
    trigger: 'item',
    formatter: '{a} <br/>{b}: {c}% ({d}%)'
  },
  series: [
    {
      name: '当前权重',
      type: 'pie',
      radius: '70%',
      data: selectedAssets.value.map(asset => ({
        value: asset.currentWeight,
        name: asset.name
      })),
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }
  ]
}))

// 优化权重饼图配置
const optimizedWeightOption = computed(() => ({
  tooltip: {
    trigger: 'item',
    formatter: '{a} <br/>{b}: {c}% ({d}%)'
  },
  series: [
    {
      name: '优化权重',
      type: 'pie',
      radius: '70%',
      data: selectedAssets.value
        .filter(asset => asset.optimizedWeight !== null)
        .map(asset => ({
          value: asset.optimizedWeight,
          name: asset.name
        })),
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }
  ]
}))

// 方法
function getWeightChangeClass(change: number) {
  if (change > 0) return 'text-success'
  if (change < 0) return 'text-danger'
  return 'text-muted'
}

function calculateCurrentRisk(): number {
  // 简化的风险计算
  const weights = selectedAssets.value.map(a => a.currentWeight / 100)
  const volatilities = selectedAssets.value.map(a => a.volatility)

  let portfolioVariance = 0
  for (let i = 0; i < weights.length; i++) {
    portfolioVariance += Math.pow((weights[i] || 0) * (volatilities[i] || 0), 2)
  }

  return Math.sqrt(portfolioVariance)
}

function calculateCurrentReturn(): number {
  const weights = selectedAssets.value.map(a => a.currentWeight / 100)
  const returns = selectedAssets.value.map(a => a.expectedReturn)

  return weights.reduce((sum, weight, i) => sum + weight * (returns[i] || 0), 0)
}

async function runOptimization() {
  // 表单验证
  if (!optimizerFormRef.value) return

  try {
    await optimizerFormRef.value.validate()
  } catch (error) {
    ElMessage.error('请检查表单输入')
    return
  }

  if (selectedAssets.value.length < 2) {
    ElMessage.warning('至少需要选择2个资产进行优化')
    return
  }

  optimizing.value = true

  try {
    await portfolioApi.post('/api/v1/portfolio/optimize', {
      assets: selectedAssets.value.map(asset => ({
        symbol: asset.symbol,
        expectedReturn: asset.expectedReturn,
        volatility: asset.volatility,
        currentWeight: asset.currentWeight
      })),
      constraints: {
        objective: optimizerForm.value.objective,
        targetReturn: optimizerForm.value.targetReturn,
        riskAversion: optimizerForm.value.riskAversion,
        maxWeight: optimizerForm.value.maxWeight / 100,
        minWeight: optimizerForm.value.minWeight / 100
      }
    })

    // 模拟优化结果
    generateOptimizationResults()

    ElMessage.success('优化完成')
  } catch (error) {
    console.warn('优化失败:', error)
    // 生成模拟结果
    generateOptimizationResults()
    ElMessage.success('优化完成（使用模拟数据）')
  } finally {
    optimizing.value = false
  }
}

function generateOptimizationResults() {
  // 生成模拟的优化权重
  const totalWeight = 100
  let remainingWeight = totalWeight

  selectedAssets.value.forEach((asset, index) => {
    if (index === selectedAssets.value.length - 1) {
      asset.optimizedWeight = remainingWeight
    } else {
      const weight = Math.random() * (remainingWeight / (selectedAssets.value.length - index))
      asset.optimizedWeight = Math.max(optimizerForm.value.minWeight, Math.min(optimizerForm.value.maxWeight, weight))
      remainingWeight -= asset.optimizedWeight
    }
  })

  // 归一化权重
  const totalOptimizedWeight = selectedAssets.value.reduce((sum, asset) => sum + (asset.optimizedWeight || 0), 0)
  selectedAssets.value.forEach(asset => {
    if (asset.optimizedWeight !== null) {
      asset.optimizedWeight = (asset.optimizedWeight / totalOptimizedWeight) * 100
    }
  })

  // 生成有效前沿数据
  const efficientFrontier = []
  for (let i = 0; i < 50; i++) {
    const risk = 10 + (i / 49) * 30
    const return_ = 5 + (i / 49) * 15 + Math.random() * 2
    efficientFrontier.push({ risk, return: return_ })
  }

  // 计算优化结果指标
  const optimizedWeights = selectedAssets.value.map(a => (a.optimizedWeight || 0) / 100)
  const expectedReturn = optimizedWeights.reduce((sum, weight, i) => sum + weight * (selectedAssets.value[i]?.expectedReturn || 0), 0)
  const expectedRisk = Math.sqrt(optimizedWeights.reduce((sum, weight, i) => sum + Math.pow(weight * (selectedAssets.value[i]?.volatility || 0), 2), 0))

  optimizationResults.value = {
    expectedReturn,
    expectedRisk,
    sharpeRatio: expectedReturn / expectedRisk,
    informationRatio: 0.85,
    maxDrawdown: 12.5,
    var95: 8.3,
    efficientFrontier
  }
}

function resetForm() {
  optimizerForm.value = {
    objective: 'max_sharpe',
    targetReturn: 10.0,
    riskAversion: 3.0,
    maxWeight: 20.0,
    minWeight: 0.5,
    rebalanceFreq: 'monthly'
  }

  // 重置优化权重
  selectedAssets.value.forEach(asset => {
    asset.optimizedWeight = null
  })

  optimizationResults.value = null
}

function removeAsset(index: number) {
  selectedAssets.value.splice(index, 1)

  // 如果有优化结果，清除它们
  if (optimizationResults.value) {
    optimizationResults.value = null
    selectedAssets.value.forEach(asset => {
      asset.optimizedWeight = null
    })
  }
}

function handleAssetSelection(selection: Asset[]) {
  selectedAssetsForAdd.value = selection
}

function addSelectedAssets() {
  selectedAssetsForAdd.value.forEach(asset => {
    // 检查是否已经存在
    const exists = selectedAssets.value.some(existing => existing.symbol === asset.symbol)
    if (!exists) {
      selectedAssets.value.push({
        ...asset,
        currentWeight: 0,
        optimizedWeight: null
      })
    }
  })

  showAssetSelector.value = false
  selectedAssetsForAdd.value = []
  assetSearchText.value = ''
}

onMounted(() => {
  // 初始化时可以加载历史优化结果或默认配置
})
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
  color: var(--text-primary);
}

.results-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-lg);
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
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

.efficient-frontier {
  height: 400px;
}

.chart {
  width: 100%;
  height: 100%;
}

.weight-distribution {
  margin-bottom: var(--spacing-xl);
}

.weight-charts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-lg);
}

.weight-chart {
  text-align: center;
}

.weight-chart h4 {
  margin: 0 0 var(--spacing-md) 0;
  color: var(--text-primary);
}

.weight-chart .chart {
  height: 300px;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .results-grid {
    grid-template-columns: 1fr;
  }

  .weight-charts {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .portfolio-optimizer {
    padding: var(--spacing-md);
  }

  .metrics-grid {
    grid-template-columns: 1fr;
  }

  .settings-form .el-row {
    margin: 0;
  }

  .settings-form .el-col {
    margin-bottom: var(--spacing-md);
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

/* 对话框样式 */
.el-dialog__body {
  padding: var(--spacing-lg);
}

/* 表单样式增强 */
.el-form-item__label {
  color: var(--text-primary);
  font-weight: 500;
}

.el-input-number {
  width: 100%;
}

/* 按钮样式 */
.el-button + .el-button {
  margin-left: var(--spacing-sm);
}
</style>
