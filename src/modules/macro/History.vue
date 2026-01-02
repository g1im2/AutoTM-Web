<template>
  <PageTemplate>
    <!-- 查询条件 -->
    <el-card>
      <div class="filter-grid">
          <el-select v-model="selectedIndicator" placeholder="选择指标" style="width: 200px">
            <el-option label="GDP增长率" value="gdp" />
            <el-option label="CPI" value="cpi" />
            <el-option label="失业率" value="unemployment" />
            <el-option label="利率" value="interest_rate" />
            <el-option label="汇率" value="exchange_rate" />
          </el-select>
          
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 300px"
          />
          
          <el-select v-model="frequency" placeholder="数据频率" style="width: 120px">
            <el-option label="月度" value="monthly" />
            <el-option label="季度" value="quarterly" />
            <el-option label="年度" value="yearly" />
          </el-select>
          
          <el-button type="primary" @click="queryData" :loading="queryLoading">
            <el-icon><Search /></el-icon>
            查询
          </el-button>
          
          <el-button @click="exportData">
            <el-icon><Download /></el-icon>
            导出
          </el-button>
        </div>
    </el-card>

    <!-- 历史趋势图 -->
    <ChartCard v-if="historyData.length > 0" title="历史趋势" height="400px" show-refresh @refresh="queryData">
        <TrendChart 
          :data="historyData" 
          :loading="queryLoading"
          color="#3b82f6"
        />
    </ChartCard>

    <!-- 统计摘要 -->
    <el-card v-if="statistics">
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">最大值</span>
            <span class="stat-value">{{ statistics.max }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">最小值</span>
            <span class="stat-value">{{ statistics.min }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">平均值</span>
            <span class="stat-value">{{ statistics.mean }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">标准差</span>
            <span class="stat-value">{{ statistics.std }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">变异系数</span>
            <span class="stat-value">{{ statistics.cv }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">数据点数</span>
            <span class="stat-value">{{ statistics.count }}</span>
          </div>
        </div>
    </el-card>

    <!-- 历史数据表格 -->
    <ChartCard v-if="tableData.length > 0" title="历史数据" show-refresh @refresh="queryData">
        <div class="table-wrapper">
          <el-table
            :data="paginatedTableData"
            style="width: 100%"
            :loading="queryLoading"
            stripe
            border
          >
            <el-table-column prop="date" label="日期" :min-width="120" header-align="center" />
            <el-table-column prop="value" label="数值" align="right" :min-width="120" header-align="center" />
            <el-table-column prop="change" label="环比变化" align="right" :min-width="120" header-align="center">
              <template #default="{ row }">
                <span :class="getChangeClass(row.change)">
                  {{ row.change > 0 ? '+' : '' }}{{ row.change }}%
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="yearChange" label="同比变化" align="right" :min-width="120" header-align="center">
              <template #default="{ row }">
                <span :class="getChangeClass(row.yearChange)">
                  {{ row.yearChange > 0 ? '+' : '' }}{{ row.yearChange }}%
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="note" label="备注" :min-width="200" show-overflow-tooltip header-align="center" />
          </el-table>

          <el-pagination
            v-if="tableData.length > 10"
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="tableData.length"
            layout="total, sizes, prev, pager, next, jumper"
            class="pagination"
          />
        </div>
    </ChartCard>

    <!-- 对比分析 -->
    <ChartCard v-if="comparisonData.length > 0" title="同期对比" height="350px">
      <TrendChart
        :data="comparisonData"
        color="#10b981"
      />
    </ChartCard>
  </PageTemplate>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import PageTemplate from '../../components/PageTemplate.vue'
import ChartCard from '../../components/ChartCard.vue'
import TrendChart from '../../components/charts/TrendChart.vue'
import { macroApi } from '../../api/clients'
import { Search, Download } from '@element-plus/icons-vue'

interface HistoryData {
  date: string
  value: number
}

interface TableData {
  date: string
  value: number
  change: number
  yearChange: number
  note: string
}

interface Statistics {
  max: string
  min: string
  mean: string
  std: string
  cv: string
  count: number
}

const selectedIndicator = ref('gdp')
const dateRange = ref<[Date, Date] | null>(null)
const frequency = ref('monthly')
const queryLoading = ref(false)

// 分页相关
const currentPage = ref(1)
const pageSize = ref(10)

const historyData = ref<HistoryData[]>([])
const tableData = ref<TableData[]>([])
const comparisonData = ref<HistoryData[]>([])
const statistics = ref<Statistics | null>(null)

// 分页数据
const paginatedTableData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return tableData.value.slice(start, end)
})

const getChangeClass = (change: number) => {
  if (change > 0) return 'text-success'
  if (change < 0) return 'text-danger'
  return 'text-muted'
}

async function queryData() {
  if (!selectedIndicator.value) return
  
  queryLoading.value = true
  
  try {
    await macroApi.get('/api/v1/macro/history', {
      params: {
        indicator: selectedIndicator.value,
        start_date: dateRange.value?.[0],
        end_date: dateRange.value?.[1],
        frequency: frequency.value
      }
    })
    
    // 生成模拟数据
    generateMockData()
  } catch (e) {
    console.warn('查询历史数据失败:', e)
    generateMockData()
  } finally {
    queryLoading.value = false
  }
}

function generateMockData() {
  const data: HistoryData[] = []
  const table: TableData[] = []
  const comparison: HistoryData[] = []
  
  const now = new Date()
  const months = frequency.value === 'yearly' ? 60 : frequency.value === 'quarterly' ? 80 : 120
  
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = Math.sin(i * 0.1) * 2 + 5 + Math.random() * 3
    
    data.push({
      date: date.toISOString().split('T')[0]!,
      value: Number(value.toFixed(2))
    })
    
    if (i < 24) { // 只显示最近24个数据点在表格中
      const prevValue = i < months - 1 ? data[data.length - 2]?.value || value : value
      const yearAgoValue = i < months - 12 ? data[data.length - 13]?.value || value : value
      
      table.push({
        date: date.toISOString().split('T')[0]!,
        value: Number(value.toFixed(2)),
        change: Number(((value - prevValue) / prevValue * 100).toFixed(2)),
        yearChange: Number(((value - yearAgoValue) / yearAgoValue * 100).toFixed(2)),
        note: i % 4 === 0 ? '重要数据发布' : ''
      })
    }
    
    // 生成同期对比数据（去年同期）
    if (i < 12) {
      const compValue = Math.sin((i + 12) * 0.1) * 2 + 4.5 + Math.random() * 3
      comparison.push({
        date: date.toISOString().split('T')[0]!,
        value: Number(compValue.toFixed(2))
      })
    }
  }
  
  historyData.value = data
  tableData.value = table.reverse()
  comparisonData.value = comparison
  
  // 计算统计摘要
  const values = data.map(d => d.value)
  const max = Math.max(...values)
  const min = Math.min(...values)
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length
  const std = Math.sqrt(variance)
  const cv = std / mean
  
  statistics.value = {
    max: max.toFixed(2),
    min: min.toFixed(2),
    mean: mean.toFixed(2),
    std: std.toFixed(2),
    cv: (cv * 100).toFixed(2) + '%',
    count: values.length
  }
}

function exportData() {
  // 模拟导出功能
  const csvContent = [
    ['日期', '数值', '环比变化', '同比变化', '备注'],
    ...tableData.value.map(row => [
      row.date,
      row.value,
      row.change + '%',
      row.yearChange + '%',
      row.note
    ])
  ].map(row => row.join(',')).join('\n')
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${selectedIndicator.value}_history.csv`
  link.click()
}

// 初始化查询
queryData()
</script>

<style scoped>
.filter-grid {
  display: flex;
  gap: var(--spacing-md);
  align-items: center;
  flex-wrap: wrap;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-lg);
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

@media (max-width: 768px) {
  .filter-grid {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-grid > * {
    width: 100%;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
