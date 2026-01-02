<template>
  <ChartCard title="核心分析结果 - 优质股票" height="500px" show-refresh @refresh="handleRefresh">
    <div class="top-stocks-container">
      <div v-if="loading" class="loading-state">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>加载中...</span>
      </div>
      <div v-else-if="stocks.length === 0" class="empty-state">
        <el-icon><DataAnalysis /></el-icon>
        <span>暂无筛选结果</span>
      </div>
      <div v-else class="table-wrapper">
        <el-table
          :data="paginatedStocks"
          style="width: 100%"
          stripe
          border
          @row-click="handleRowClick"
        >
          <el-table-column type="index" label="排名" :min-width="60" align="center" header-align="center" />
          <el-table-column prop="symbol" label="代码" :min-width="100" show-overflow-tooltip header-align="center" />
          <el-table-column prop="name" label="名称" :min-width="120" header-align="center">
            <template #default="{ row }">
              <div class="stock-name">
                <span class="name">{{ row.name }}</span>
                <el-tag v-if="row.sector" size="small" type="info">{{ row.sector }}</el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="score" label="综合评分" :min-width="120" align="center" header-align="center">
            <template #default="{ row }">
              <div v-if="row.score !== undefined && row.score !== null" class="score-cell">
                <el-progress
                  :percentage="row.score"
                  :color="getScoreColor(row.score)"
                  :stroke-width="8"
                  :show-text="false"
                />
                <span class="score-text">{{ row.score.toFixed(1) }}</span>
              </div>
              <span v-else>--</span>
            </template>
          </el-table-column>
          <el-table-column prop="price" label="价格" :min-width="100" align="right" header-align="center">
            <template #default="{ row }">
              ¥{{ row.price !== undefined && row.price !== null ? row.price.toFixed(2) : '--' }}
            </template>
          </el-table-column>
          <el-table-column prop="change" label="涨跌幅" :min-width="100" align="right" header-align="center">
            <template #default="{ row }">
              <span v-if="row.change !== undefined && row.change !== null" :class="getChangeClass(row.change)">
                {{ row.change >= 0 ? '+' : '' }}{{ row.change.toFixed(2) }}%
              </span>
              <span v-else>--</span>
            </template>
          </el-table-column>
          <el-table-column prop="signalStrength" label="信号强度" :min-width="120" align="center" header-align="center">
            <template #default="{ row }">
              <div v-if="row.signalStrength" class="signal-strength">
                <el-progress
                  :percentage="row.signalStrength * 100"
                  :color="getSignalColor(row.signalStrength)"
                  :stroke-width="6"
                />
              </div>
              <span v-else class="text-muted">--</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" :width="160" fixed="right" align="center" header-align="center">
            <template #default="{ row }">
              <el-button size="small" type="primary" @click.stop="viewAnalysis(row)">
                <el-icon><View /></el-icon>
                分析
              </el-button>
              <el-button size="small" @click.stop="addToPool(row)">
                <el-icon><Plus /></el-icon>
                加入池
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-pagination
          v-if="stocks.length > 10"
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="stocks.length"
          layout="total, sizes, prev, pager, next, jumper"
          class="pagination"
        />
      </div>
    </div>
  </ChartCard>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import ChartCard from '../../../components/ChartCard.vue'
import { useExecutionStore } from '../../../stores/execution'
import { Loading, DataAnalysis, View, Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { TopStock } from '../../../api/types'

const router = useRouter()
const executionStore = useExecutionStore()
const { topStocks, loading: storeLoading } = storeToRefs(executionStore)

const loading = computed(() => storeLoading.value.stocks)
const stocks = computed(() => topStocks.value.slice(0, 20))

// 分页相关
const currentPage = ref(1)
const pageSize = ref(10)

const paginatedStocks = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return stocks.value.slice(start, end)
})

function getScoreColor(score: number) {
  if (score >= 90) return '#10b981'
  if (score >= 80) return '#3b82f6'
  if (score >= 70) return '#f59e0b'
  return '#ef4444'
}

function getSignalColor(strength: number) {
  if (strength >= 0.8) return '#10b981'
  if (strength >= 0.6) return '#3b82f6'
  if (strength >= 0.4) return '#f59e0b'
  return '#ef4444'
}

function getChangeClass(change: number) {
  if (change > 0) return 'text-success'
  if (change < 0) return 'text-danger'
  return 'text-muted'
}

async function handleRefresh() {
  await executionStore.fetchTopStocks(20, true)
}

function handleRowClick(row: TopStock) {
  viewAnalysis(row)
}

function viewAnalysis(stock: TopStock) {
  // 跳转到实时分析页面
  router.push(`/execution/realtime?symbol=${stock.symbol}`)
}

function addToPool(stock: TopStock) {
  // TODO: 实现加入股票池功能
  ElMessage.success(`已将 ${stock.name} 加入候选池`)
  console.log('加入股票池:', stock)
}

onMounted(async () => {
  await executionStore.fetchTopStocks(20)
})
</script>

<style scoped>
.top-stocks-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.loading-state,
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  color: var(--text-secondary);
}

.loading-state .el-icon,
.empty-state .el-icon {
  font-size: 48px;
}

.stock-name {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.stock-name .name {
  font-weight: 600;
  color: var(--text-primary);
}

.score-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
}

.score-text {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
}

.signal-strength {
  width: 100%;
  padding: 0 var(--spacing-sm);
}

.is-loading {
  animation: rotating 2s linear infinite;
}

@keyframes rotating {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.table-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  height: 100%;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  padding-top: var(--spacing-sm);
}

/* 表格行悬停效果 */
:deep(.el-table__row) {
  cursor: pointer;
}

:deep(.el-table__row:hover) {
  background-color: var(--surface-bg);
}
</style>

