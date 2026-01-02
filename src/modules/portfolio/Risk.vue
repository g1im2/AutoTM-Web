<template>
  <PageTemplate>
    <!-- 风险指标 -->
    <div class="risk-metrics">
      <KpiCard title="VaR (95%)" :value="riskMetrics.var95" format="currency" type="danger" />
      <KpiCard title="CVaR (95%)" :value="riskMetrics.cvar95" format="currency" type="danger" />
      <KpiCard title="最大回撤" :value="riskMetrics.maxDrawdown" format="percentage" type="warning" />
      <KpiCard title="波动率" :value="riskMetrics.volatility" format="percentage" type="warning" />
      <KpiCard title="贝塔系数" :value="riskMetrics.beta" />
      <KpiCard title="跟踪误差" :value="riskMetrics.trackingError" format="percentage" />
    </div>

    <!-- VaR分析 -->
    <ChartCard title="VaR分析" height="400px">
      <TrendChart :data="varData" color="#ef4444" />
    </ChartCard>

    <!-- 压力测试 -->
    <ChartCard title="压力测试结果">
      <div class="table-wrapper">
        <el-table :data="paginatedStressTests" style="width: 100%" stripe border>
          <el-table-column prop="scenario" label="情景" :min-width="200" show-overflow-tooltip header-align="center" />
          <el-table-column prop="description" label="描述" :min-width="250" show-overflow-tooltip header-align="center" />
          <el-table-column prop="impact" label="影响" align="right" :min-width="120" header-align="center">
            <template #default="{ row }">
              <span :class="row.impact < 0 ? 'text-danger' : 'text-success'">
                {{ row.impact > 0 ? '+' : '' }}{{ row.impact }}%
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="probability" label="概率" align="right" :min-width="100" header-align="center" />
        </el-table>

        <el-pagination
          v-if="stressTests.length > 10"
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="stressTests.length"
          layout="total, sizes, prev, pager, next, jumper"
          class="pagination"
        />
      </div>
    </ChartCard>
  </PageTemplate>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import PageTemplate from '../../components/PageTemplate.vue'
import KpiCard from '../../components/KpiCard.vue'
import ChartCard from '../../components/ChartCard.vue'
import TrendChart from '../../components/charts/TrendChart.vue'

const riskMetrics = ref({
  var95: 150000,
  cvar95: 200000,
  maxDrawdown: 8.5,
  volatility: 15.2,
  beta: 1.05,
  trackingError: 2.3
})

const varData = ref<Array<{ date: string; value: number }>>([])
const stressTests = ref([
  { scenario: '市场崩盘', description: '股市下跌30%', impact: -25.5, probability: '5%' },
  { scenario: '利率上升', description: '基准利率上升200bp', impact: -12.3, probability: '15%' },
  { scenario: '经济衰退', description: 'GDP增长率下降2%', impact: -18.7, probability: '10%' },
  { scenario: '地缘政治', description: '重大地缘政治事件', impact: -15.2, probability: '8%' }
])

// 分页相关
const currentPage = ref(1)
const pageSize = ref(10)

const paginatedStressTests = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return stressTests.value.slice(start, end)
})

onMounted(() => {
  // 生成VaR数据
  const data = []
  const now = new Date()
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    data.push({
      date: date.toISOString().split('T')[0]!,
      value: Math.random() * 100000 + 50000
    })
  }
  varData.value = data
})
</script>

<style scoped>
.risk-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-lg);
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
