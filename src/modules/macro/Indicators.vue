<template>
  <PageTemplate>
    <!-- 指标筛选器 -->
    <el-card>
      <div class="filter-row">
        <el-select v-model="selectedCategory" placeholder="选择指标类别" style="width: 200px">
          <el-option label="全部" value="" />
          <el-option label="经济增长" value="growth" />
          <el-option label="通胀指标" value="inflation" />
          <el-option label="就业指标" value="employment" />
          <el-option label="货币政策" value="monetary" />
          <el-option label="对外贸易" value="trade" />
        </el-select>

        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          style="width: 300px"
        />

        <el-button type="primary" @click="refreshData">
          <el-icon><Refresh /></el-icon>
          刷新数据
        </el-button>
      </div>
    </el-card>

    <!-- 指标表格 -->
    <ChartCard title="宏观经济指标" show-refresh @refresh="refreshData">
      <div class="table-wrapper">
        <el-table
          :data="paginatedIndicators"
          style="width: 100%"
          :loading="loading"
          size="small"
          stripe
          border
        >
          <el-table-column prop="name" label="指标名称" :min-width="220" show-overflow-tooltip header-align="center" />
          <el-table-column prop="category" label="类别" :min-width="140" align="center" header-align="center">
            <template #default="{ row }">
              <el-tag size="small" effect="dark" :type="getCategoryType(row.category)">{{ row.categoryName }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="value" label="当前值" :min-width="120" align="right" header-align="center">
            <template #default="{ row }">
              <span :class="getValueClass(row.change)">{{ row.value }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="change" label="变化" :min-width="120" align="right" header-align="center">
            <template #default="{ row }">
              <span :class="getChangeClass(row.change)">
                <el-icon v-if="row.change > 0"><ArrowUp /></el-icon>
                <el-icon v-else-if="row.change < 0"><ArrowDown /></el-icon>
                <el-icon v-else><Minus /></el-icon>
                {{ Math.abs(row.change) }}%
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="unit" label="单位" :min-width="100" align="center" header-align="center" />
          <el-table-column prop="updateTime" label="更新时间" :min-width="180" show-overflow-tooltip header-align="center" />
          <el-table-column prop="source" label="数据源" :min-width="140" show-overflow-tooltip header-align="center" />
          <el-table-column label="操作" fixed="right" :min-width="160" align="left" header-align="center">
            <template #default="{ row }">
              <el-button size="small" type="primary" plain @click="viewTrend(row)">
                <el-icon><TrendCharts /></el-icon>
                趋势
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-pagination
          v-if="filteredIndicators.length > 10"
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="filteredIndicators.length"
          layout="total, sizes, prev, pager, next, jumper"
          class="pagination"
        />
      </div>
    </ChartCard>

    <!-- 趋势图表 -->
    <ChartCard v-if="selectedIndicator" :title="`${selectedIndicator.name} - 历史趋势`" height="400px">
      <TrendChart
        :data="trendData"
        :loading="trendLoading"
        :color="getTrendColor(selectedIndicator.category)"
      />
    </ChartCard>
  </PageTemplate>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { macroApi } from '../../api/clients'
import PageTemplate from '../../components/PageTemplate.vue'
import ChartCard from '../../components/ChartCard.vue'
import TrendChart from '../../components/charts/TrendChart.vue'
import { Refresh, ArrowUp, ArrowDown, Minus, TrendCharts } from '@element-plus/icons-vue'

interface Indicator {
  name: string
  category: string
  categoryName: string
  value: string
  change: number
  unit: string
  updateTime: string
  source: string
}

const loading = ref(false)
const selectedCategory = ref('')
const dateRange = ref<[Date, Date] | null>(null)
const selectedIndicator = ref<Indicator | null>(null)
const trendData = ref<Array<{ date: string; value: number }>>([])
const trendLoading = ref(false)

// 分页相关
const currentPage = ref(1)
const pageSize = ref(10)

const indicators = ref<Indicator[]>([
  { name: 'GDP增长率', category: 'growth', categoryName: '经济增长', value: '6.8%', change: 0.2, unit: '%', updateTime: '2024-01-15 09:30', source: '国家统计局' },
  { name: 'CPI同比', category: 'inflation', categoryName: '通胀指标', value: '2.3%', change: -0.1, unit: '%', updateTime: '2024-01-15 09:30', source: '国家统计局' },
  { name: 'PPI同比', category: 'inflation', categoryName: '通胀指标', value: '1.8%', change: 0.3, unit: '%', updateTime: '2024-01-15 09:30', source: '国家统计局' },
  { name: '城镇失业率', category: 'employment', categoryName: '就业指标', value: '5.2%', change: -0.3, unit: '%', updateTime: '2024-01-15 09:30', source: '人社部' },
  { name: '新增就业', category: 'employment', categoryName: '就业指标', value: '1186万人', change: 2.1, unit: '万人', updateTime: '2024-01-15 09:30', source: '人社部' },
  { name: '基准利率', category: 'monetary', categoryName: '货币政策', value: '3.75%', change: 0, unit: '%', updateTime: '2024-01-15 09:30', source: '央行' },
  { name: 'M2增速', category: 'monetary', categoryName: '货币政策', value: '9.8%', change: 0.5, unit: '%', updateTime: '2024-01-15 09:30', source: '央行' },
  { name: '进出口总额', category: 'trade', categoryName: '对外贸易', value: '4.16万亿', change: 1.2, unit: '万亿元', updateTime: '2024-01-15 09:30', source: '海关总署' },
  { name: '贸易顺差', category: 'trade', categoryName: '对外贸易', value: '8776亿', change: -2.3, unit: '亿元', updateTime: '2024-01-15 09:30', source: '海关总署' }
])

const filteredIndicators = computed(() => {
  if (!selectedCategory.value) return indicators.value
  return indicators.value.filter(item => item.category === selectedCategory.value)
})

// 分页数据
const paginatedIndicators = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredIndicators.value.slice(start, end)
})

function getCategoryType(category: string) {
  const types: Record<string, string> = {
    growth: 'success',
    inflation: 'warning',
    employment: 'info',
    monetary: 'primary',
    trade: 'danger'
  }
  return types[category] || 'default'
}

function getValueClass(change: number) {
  if (change > 0) return 'text-success'
  if (change < 0) return 'text-danger'
  return 'text-muted'
}

function getChangeClass(change: number) {
  if (change > 0) return 'text-success'
  if (change < 0) return 'text-danger'
  return 'text-muted'
}

function getTrendColor(category: string) {
  const colors: Record<string, string> = {
    growth: '#10b981',
    inflation: '#f59e0b',
    employment: '#06b6d4',
    monetary: '#3b82f6',
    trade: '#ef4444'
  }
  return colors[category] || '#6b7280'
}

async function refreshData() {
  loading.value = true
  try {
    await macroApi.get('/api/v1/macro/indicators')
    // 数据已在 indicators 中模拟
  } catch (e) {
    console.warn('获取指标数据失败:', e)
  } finally {
    loading.value = false
  }
}

async function viewTrend(indicator: Indicator) {
  selectedIndicator.value = indicator
  trendLoading.value = true

  try {
    await macroApi.get(`/api/v1/macro/indicators/${indicator.category}/trend`)
    // 生成模拟趋势数据
    const data = []
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      data.push({
        date: date.toISOString().split('T')[0]!,
        value: Math.random() * 10 + 5
      })
    }
    trendData.value = data
  } catch (e) {
    console.warn('获取趋势数据失败:', e)
  } finally {
    trendLoading.value = false
  }
}

onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.filter-row {
  display: flex;
  gap: var(--spacing-md);
  align-items: center;
  flex-wrap: wrap;
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
  .filter-row {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-row > * {
    width: 100%;
  }
}
</style>

