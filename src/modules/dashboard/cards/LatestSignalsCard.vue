<template>
  <ChartCard title="最新交易信号" height="500px" show-refresh @refresh="handleRefresh">
    <div class="signals-container">
      <div v-if="loading" class="loading-state">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>加载中...</span>
      </div>
      <div v-else-if="signals.length === 0" class="empty-state">
        <el-icon><Bell /></el-icon>
        <span>暂无信号</span>
      </div>
      <div v-else class="table-wrapper">
        <el-table
          :data="paginatedSignals"
          style="width: 100%"
          stripe
          border
          @row-click="handleRowClick"
        >
          <el-table-column type="index" label="#" :min-width="50" align="center" header-align="center" />
          <el-table-column prop="symbol" label="代码" :min-width="100" show-overflow-tooltip header-align="center" />
          <el-table-column prop="name" label="名称" :min-width="120" show-overflow-tooltip header-align="center">
            <template #default="{ row }">
              <div class="stock-name">
                <span class="name">{{ row.name }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="signalType" label="信号类型" :min-width="120" align="center" header-align="center">
            <template #default="{ row }">
              <el-tag :type="getSignalTypeTag(row.signalType)" size="small">
                {{ getSignalTypeText(row.signalType) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="confidence" label="置信度" :min-width="120" align="center" header-align="center">
            <template #default="{ row }">
              <div class="confidence-cell">
                <el-progress
                  v-if="row.confidence !== undefined && row.confidence !== null"
                  :percentage="row.confidence * 100"
                  :color="getConfidenceColor(row.confidence)"
                  :stroke-width="8"
                />
                <span v-else>--</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="price" label="价格" :min-width="100" align="right" header-align="center">
            <template #default="{ row }">
              ¥{{ row.price ? row.price.toFixed(2) : '--' }}
            </template>
          </el-table-column>
          <el-table-column prop="timestamp" label="时间" :min-width="160" show-overflow-tooltip header-align="center">
            <template #default="{ row }">
              {{ row.timestamp ? formatTime(row.timestamp) : '--' }}
            </template>
          </el-table-column>
          <el-table-column label="操作" :min-width="180" fixed="right" align="left" header-align="center">
            <template #default="{ row }">
              <el-button size="small" type="primary" @click.stop="viewSignalDetail(row)">
                <el-icon><View /></el-icon>
                详情
              </el-button>
              <el-button size="small" @click.stop="trackSignal(row)">
                <el-icon><Star /></el-icon>
                关注
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-pagination
          v-if="signals.length > 10"
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="signals.length"
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
import { Loading, Bell, View, Star } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { TradingSignal } from '../../../api/types'

const router = useRouter()
const executionStore = useExecutionStore()
const { latestSignals, loading: storeLoading } = storeToRefs(executionStore)

const loading = computed(() => storeLoading.value.signals)
const signals = computed(() => latestSignals.value.slice(0, 15))

// 分页相关
const currentPage = ref(1)
const pageSize = ref(10)

const paginatedSignals = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return signals.value.slice(start, end)
})

function getSignalTypeTag(type: string) {
  const typeMap: Record<string, any> = {
    'buy': 'success',
    'sell': 'danger',
    'hold': 'info',
    'strong_buy': 'success',
    'strong_sell': 'danger'
  }
  return typeMap[type] || 'info'
}

function getSignalTypeText(type: string) {
  const textMap: Record<string, string> = {
    'buy': '买入',
    'sell': '卖出',
    'hold': '持有',
    'strong_buy': '强买',
    'strong_sell': '强卖'
  }
  return textMap[type] || type
}

function getConfidenceColor(confidence: number) {
  if (confidence >= 0.9) return '#10b981'
  if (confidence >= 0.8) return '#3b82f6'
  if (confidence >= 0.7) return '#f59e0b'
  return '#ef4444'
}

function formatTime(timestamp: string) {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

async function handleRefresh() {
  await executionStore.fetchLatestSignals(15, true)
}

function handleRowClick(row: TradingSignal) {
  viewSignalDetail(row)
}

function viewSignalDetail(signal: TradingSignal) {
  // 跳转到信号详情页面
  router.push(`/execution/realtime?symbol=${signal.symbol}&signalId=${signal.id}`)
}

function trackSignal(signal: TradingSignal) {
  // TODO: 实现关注信号功能
  ElMessage.success(`已关注 ${signal.name} 的${getSignalTypeText(signal.signalType)}信号`)
  console.log('关注信号:', signal)
}

onMounted(async () => {
  await executionStore.fetchLatestSignals(15)
})
</script>

<style scoped>
.signals-container {
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

.is-loading {
  animation: rotating 2s linear infinite;
}

@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.stock-name {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.stock-name .name {
  font-weight: 500;
}

.confidence-cell {
  padding: 0 var(--spacing-sm);
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
</style>

