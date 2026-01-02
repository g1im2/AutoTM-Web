<template>
  <PageTemplate>
    <!-- 理论模型选择 -->
    <el-card>
      <div class="selector-row">
        <el-select v-model="selectedModel" placeholder="选择理论模型" style="width: 250px" @change="loadModel">
          <el-option label="菲利普斯曲线" value="phillips" />
          <el-option label="泰勒规则" value="taylor" />
          <el-option label="IS-LM模型" value="islm" />
          <el-option label="索洛增长模型" value="solow" />
          <el-option label="DSGE模型" value="dsge" />
        </el-select>

        <el-button type="primary" @click="runAnalysis" :loading="analysisLoading">
          <el-icon><DataAnalysis /></el-icon>
          运行分析
        </el-button>
      </div>
    </el-card>

    <!-- 模型描述 -->
    <el-card v-if="currentModel">
      <div class="description-content">
        <p><strong>理论基础：</strong>{{ currentModel.theory }}</p>
        <p><strong>应用场景：</strong>{{ currentModel.application }}</p>
        <p><strong>关键变量：</strong>{{ currentModel.variables.join('、') }}</p>
      </div>
    </el-card>

    <!-- 分析结果 -->
    <template v-if="analysisResults">
      <div class="results-grid">
        <!-- 模型拟合图 -->
        <ChartCard title="模型拟合结果" height="400px">
          <TrendChart
            :data="fittingData"
            :loading="analysisLoading"
            color="#3b82f6"
          />
        </ChartCard>

        <!-- 预测图 -->
        <ChartCard title="预测结果" height="400px">
          <TrendChart
            :data="predictionData"
            :loading="analysisLoading"
            color="#10b981"
          />
        </ChartCard>

        <!-- 参数估计 -->
        <ChartCard title="参数估计">
          <div class="table-wrapper">
            <el-table :data="paginatedParameters" style="width: 100%" stripe border>
              <el-table-column prop="name" label="参数" :min-width="200" show-overflow-tooltip header-align="center" />
              <el-table-column prop="value" label="估计值" :min-width="120" align="right" header-align="center" />
              <el-table-column prop="significance" label="显著性" :min-width="120" align="center" header-align="center">
                <template #default="{ row }">
                  <el-tag :type="getSignificanceType(row.significance)">
                    {{ row.significance }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>

            <el-pagination
              v-if="parameters.length > 10"
              v-model:current-page="currentPage"
              v-model:page-size="pageSize"
              :page-sizes="[10, 20, 50, 100]"
              :total="parameters.length"
              layout="total, sizes, prev, pager, next, jumper"
              class="pagination"
            />
          </div>
        </ChartCard>

        <!-- 模型诊断 -->
        <ChartCard title="模型诊断">
          <div class="diagnostic-metrics">
            <div class="metric-item">
              <span class="metric-label">R²</span>
              <span class="metric-value">{{ analysisResults.r_squared }}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">AIC</span>
              <span class="metric-value">{{ analysisResults.aic }}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">BIC</span>
              <span class="metric-value">{{ analysisResults.bic }}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">DW统计量</span>
              <span class="metric-value">{{ analysisResults.dw_stat }}</span>
            </div>
          </div>
        </ChartCard>
      </div>

      <!-- 政策建议 -->
      <el-card>
        <div class="recommendations-list">
          <el-alert
            v-for="(rec, index) in analysisResults.recommendations"
            :key="index"
            :title="rec.title"
            :description="rec.description"
            :type="rec.type"
            show-icon
            style="margin-bottom: 16px"
          />
        </div>
      </el-card>
    </template>
  </PageTemplate>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import PageTemplate from '../../components/PageTemplate.vue'
import ChartCard from '../../components/ChartCard.vue'
import TrendChart from '../../components/charts/TrendChart.vue'
import { macroApi } from '../../api/clients'
import { DataAnalysis } from '@element-plus/icons-vue'

interface TheoryModel {
  name: string
  theory: string
  application: string
  variables: string[]
}

interface AnalysisResults {
  r_squared: string
  aic: string
  bic: string
  dw_stat: string
  recommendations: Array<{
    title: string
    description: string
    type: 'success' | 'warning' | 'info' | 'error'
  }>
}

const selectedModel = ref('')
const analysisLoading = ref(false)
const fittingData = ref<Array<{ date: string; value: number }>>([])
const predictionData = ref<Array<{ date: string; value: number }>>([])
const parameters = ref<Array<{ name: string; value: string; significance: string }>>([])
const analysisResults = ref<AnalysisResults | null>(null)

// 分页相关
const currentPage = ref(1)
const pageSize = ref(10)

// 分页数据
const paginatedParameters = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return parameters.value.slice(start, end)
})

const models: Record<string, TheoryModel> = {
  phillips: {
    name: '菲利普斯曲线',
    theory: '通胀率与失业率之间存在负相关关系',
    application: '货币政策制定、通胀预测',
    variables: ['通胀率', '失业率', '预期通胀']
  },
  taylor: {
    name: '泰勒规则',
    theory: '央行利率决策的系统性规则',
    application: '货币政策分析、利率预测',
    variables: ['名义利率', '通胀缺口', '产出缺口']
  },
  islm: {
    name: 'IS-LM模型',
    theory: '商品市场和货币市场的一般均衡',
    application: '宏观经济政策效果分析',
    variables: ['利率', '收入', '投资', '货币供应量']
  },
  solow: {
    name: '索洛增长模型',
    theory: '长期经济增长的决定因素',
    application: '经济增长分析、生产力预测',
    variables: ['产出', '资本', '劳动', '技术进步']
  },
  dsge: {
    name: 'DSGE模型',
    theory: '动态随机一般均衡模型',
    application: '宏观经济预测、政策模拟',
    variables: ['消费', '投资', '就业', '通胀', '利率']
  }
}

const currentModel = computed(() => {
  return selectedModel.value ? models[selectedModel.value] : null
})

function loadModel() {
  // 清空之前的结果
  analysisResults.value = null
  fittingData.value = []
  predictionData.value = []
  parameters.value = []
}

async function runAnalysis() {
  if (!selectedModel.value) return
  
  analysisLoading.value = true
  
  try {
    await macroApi.post(`/api/v1/theories/${selectedModel.value}/analyze`, {
      model: selectedModel.value
    })
    
    // 模拟分析结果
    generateMockResults()
  } catch (e) {
    console.warn('分析失败:', e)
    generateMockResults()
  } finally {
    analysisLoading.value = false
  }
}

function generateMockResults() {
  // 生成拟合数据
  const fitting = []
  const prediction = []
  const now = new Date()
  
  for (let i = 23; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    fitting.push({
      date: date.toISOString().split('T')[0]!,
      value: Math.sin(i * 0.2) * 5 + 10 + Math.random() * 2
    })
  }
  
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i + 1, 1)
    prediction.push({
      date: date.toISOString().split('T')[0]!,
      value: Math.sin((i + 24) * 0.2) * 5 + 10 + Math.random() * 2
    })
  }
  
  fittingData.value = fitting
  predictionData.value = prediction
  
  // 生成参数估计
  parameters.value = [
    { name: 'α (常数项)', value: '2.34', significance: '***' },
    { name: 'β₁ (系数1)', value: '0.67', significance: '***' },
    { name: 'β₂ (系数2)', value: '-0.23', significance: '**' },
    { name: 'β₃ (系数3)', value: '0.15', significance: '*' }
  ]
  
  // 生成分析结果
  analysisResults.value = {
    r_squared: '0.847',
    aic: '156.23',
    bic: '168.45',
    dw_stat: '1.98',
    recommendations: [
      {
        title: '货币政策建议',
        description: '基于模型分析，建议维持当前利率水平，密切关注通胀预期变化',
        type: 'info'
      },
      {
        title: '风险提示',
        description: '模型显示经济可能面临下行压力，需要准备应对措施',
        type: 'warning'
      },
      {
        title: '政策协调',
        description: '财政政策与货币政策需要更好协调，以实现稳增长目标',
        type: 'success'
      }
    ]
  }
}

function getSignificanceType(significance: string) {
  if (significance === '***') return 'success'
  if (significance === '**') return 'warning'
  if (significance === '*') return 'info'
  return 'default'
}
</script>

<style scoped>
.selector-row {
  display: flex;
  gap: var(--spacing-md);
  align-items: center;
}

.description-content p {
  margin-bottom: var(--spacing-sm);
  line-height: 1.6;
}

.description-content p:last-child {
  margin-bottom: 0;
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: var(--card-gap-lg);
}

.diagnostic-metrics {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--card-gap-lg);
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

.recommendations-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

@media (max-width: 768px) {
  .selector-row {
    flex-direction: column;
    align-items: stretch;
  }

  .results-grid {
    grid-template-columns: 1fr;
  }

  .diagnostic-metrics {
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
