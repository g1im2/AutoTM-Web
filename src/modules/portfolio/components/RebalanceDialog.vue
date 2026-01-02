<template>
  <el-dialog
    v-model="dialogVisible"
    title="调仓建议"
    width="900px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div v-if="loading" class="loading-state">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>加载建议中...</span>
    </div>

    <div v-else-if="suggestions.length === 0" class="empty-state">
      <el-icon><InfoFilled /></el-icon>
      <span>暂无调仓建议</span>
    </div>

    <div v-else class="rebalance-content">
      <!-- 建议概览 -->
      <el-alert
        v-if="currentSuggestion"
        :title="currentSuggestion.reason"
        type="info"
        :closable="false"
        show-icon
      >
        <template #default>
          <div class="suggestion-meta">
            <span>预期收益: <strong class="positive">+{{ currentSuggestion.expectedReturn?.toFixed(2) ?? '--' }}%</strong></span>
            <span>风险变化: <strong>{{ currentSuggestion.expectedRisk?.toFixed(2) ?? '--' }}%</strong></span>
            <span>置信度: <strong>{{ (currentSuggestion.confidence * 100).toFixed(0) }}%</strong></span>
          </div>
        </template>
      </el-alert>

      <!-- 调仓操作列表 -->
      <div class="operations-section">
        <h4>调仓操作</h4>
        <div class="table-wrapper">
          <el-table :data="paginatedPositions" style="width: 100%" stripe border>
            <el-table-column prop="symbol" label="代码" :min-width="100" show-overflow-tooltip header-align="center" />
            <el-table-column prop="name" label="名称" :min-width="120" show-overflow-tooltip header-align="center" />
            <el-table-column prop="action" label="操作" :min-width="80" align="center" header-align="center">
              <template #default="{ row }">
                <el-tag :type="getActionType(row.action)" size="small">
                  {{ getActionText(row.action) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="currentWeight" label="当前权重" :min-width="100" align="right" header-align="center">
              <template #default="{ row }">
                {{ row.currentWeight.toFixed(2) }}%
              </template>
            </el-table-column>
            <el-table-column prop="targetWeight" label="目标权重" :min-width="150" align="right" header-align="center">
              <template #default="{ row }">
                <el-input-number
                  v-model="row.targetWeight"
                  :min="0"
                  :max="100"
                  :precision="2"
                  :step="0.5"
                  size="small"
                  @change="handleWeightChange"
                />
              </template>
            </el-table-column>
            <el-table-column label="权重变化" :min-width="100" align="right" header-align="center">
              <template #default="{ row }">
                <span :class="getChangeClass(row.targetWeight - row.currentWeight)">
                  {{ row.targetWeight - row.currentWeight >= 0 ? '+' : '' }}
                  {{ (row.targetWeight - row.currentWeight).toFixed(2) }}%
                </span>
              </template>
            </el-table-column>
            <el-table-column label="操作" :min-width="100" fixed="right" align="left" header-align="center">
              <template #default="{ row, $index }">
                <el-button
                  size="small"
                  type="danger"
                  text
                  @click="removePosition(getActualIndex($index))"
                >
                  移除
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            v-if="editablePositions.length > 10"
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="editablePositions.length"
            layout="total, sizes, prev, pager, next, jumper"
            class="pagination"
          />
        </div>

        <div class="total-weight">
          <span>总权重: </span>
          <span :class="totalWeight === 100 ? 'valid' : 'invalid'">
            {{ totalWeight.toFixed(2) }}%
          </span>
          <span v-if="totalWeight !== 100" class="warning-text">
            (需要等于100%)
          </span>
        </div>
      </div>

      <!-- 预览调仓后状态 -->
      <div class="preview-section">
        <h4>调仓后预览</h4>
        <div class="preview-grid">
          <div class="preview-item">
            <span class="label">预期总收益</span>
            <span class="value positive">+{{ currentSuggestion.expectedReturn?.toFixed(2) ?? '--' }}%</span>
          </div>
          <div class="preview-item">
            <span class="label">预期波动率</span>
            <span class="value">{{ currentSuggestion.expectedRisk?.toFixed(2) ?? '--' }}%</span>
          </div>
          <div class="preview-item">
            <span class="label">预期夏普比率</span>
            <span class="value">{{ calculateExpectedSharpe() }}</span>
          </div>
          <div class="preview-item">
            <span class="label">调仓成本</span>
            <span class="value">¥{{ formatNumber(calculateRebalanceCost()) }}</span>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button @click="handleReset">重置</el-button>
        <el-button
          type="primary"
          :disabled="!canSubmit"
          :loading="submitting"
          @click="handleSubmit"
        >
          提交调仓计划
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { usePortfolioStore } from '../../../stores/portfolio'
import { Loading, InfoFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { RebalanceSuggestion } from '../../../api/types'

interface Props {
  modelValue: boolean
  portfolioId: string
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'success'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const portfolioStore = usePortfolioStore()
const { rebalanceSuggestions, loading: storeLoading } = storeToRefs(portfolioStore)

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const loading = computed(() => storeLoading.value.suggestions)
const suggestions = computed(() => rebalanceSuggestions.value)
const currentSuggestion = computed(() => suggestions.value[0])

// 分页相关
const currentPage = ref(1)
const pageSize = ref(10)

const editablePositions = ref<Array<{
  symbol: string
  name: string
  action: string
  currentWeight: number
  targetWeight: number
}>>([])

const submitting = ref(false)

// 分页数据
const paginatedPositions = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return editablePositions.value.slice(start, end)
})

// 获取实际索引（考虑分页）
const getActualIndex = (pageIndex: number) => {
  return (currentPage.value - 1) * pageSize.value + pageIndex
}

const totalWeight = computed(() => {
  return editablePositions.value.reduce((sum, pos) => sum + pos.targetWeight, 0)
})

const canSubmit = computed(() => {
  return totalWeight.value === 100 && editablePositions.value.length > 0 && !submitting.value
})

function getActionType(action: string) {
  const map: Record<string, any> = {
    'BUY': 'success',
    'SELL': 'danger',
    'HOLD': 'info'
  }
  return map[action] || 'info'
}

function getActionText(action: string) {
  const map: Record<string, string> = {
    'BUY': '买入',
    'SELL': '卖出',
    'HOLD': '持有'
  }
  return map[action] || action
}

function getChangeClass(change: number) {
  if (change > 0) return 'positive'
  if (change < 0) return 'negative'
  return ''
}

function formatNumber(num: number) {
  return num.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

function calculateExpectedSharpe() {
  if (!currentSuggestion.value) return '--'
  const expectedReturn = currentSuggestion.value.expectedReturn ?? 0
  const expectedRisk = currentSuggestion.value.expectedRisk ?? 1
  return (expectedReturn / expectedRisk).toFixed(2)
}

function calculateRebalanceCost() {
  // 简化计算：假设每次调仓成本为总变动金额的0.3%
  const totalChange = editablePositions.value.reduce((sum, pos) => {
    return sum + Math.abs(pos.targetWeight - pos.currentWeight)
  }, 0)
  return totalChange * 1000 * 0.003 // 假设组合总值100万
}

function handleWeightChange() {
  // 权重变化时自动更新操作类型
  editablePositions.value.forEach(pos => {
    const diff = pos.targetWeight - pos.currentWeight
    if (diff > 0.5) {
      pos.action = 'BUY'
    } else if (diff < -0.5) {
      pos.action = 'SELL'
    } else {
      pos.action = 'HOLD'
    }
  })
}

function removePosition(index: number) {
  editablePositions.value.splice(index, 1)
}

function handleReset() {
  if (currentSuggestion.value) {
    editablePositions.value = currentSuggestion.value.targetPositions.map(pos => ({
      symbol: pos.symbol,
      name: pos.name,
      action: pos.action,
      currentWeight: pos.currentWeight,
      targetWeight: pos.targetWeight
    }))
  }
}

async function handleSubmit() {
  if (!canSubmit.value) {
    ElMessage.warning('请确保总权重为100%')
    return
  }

  submitting.value = true
  try {
    // TODO: 调用后端API提交调仓计划
    // await api.submitRebalancePlan(props.portfolioId, editablePositions.value)
    
    // 模拟提交
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    ElMessage.success('调仓计划已提交')
    emit('success')
    handleClose()
  } catch (error) {
    console.error('提交调仓计划失败:', error)
    ElMessage.error('提交失败，请重试')
  } finally {
    submitting.value = false
  }
}

function handleClose() {
  dialogVisible.value = false
}

watch(() => props.modelValue, async (val) => {
  if (val) {
    await portfolioStore.fetchRebalanceSuggestions(props.portfolioId)
    handleReset()
  }
})
</script>

<style scoped>
.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-xxl);
  color: var(--text-secondary);
}

.is-loading {
  font-size: 48px;
  animation: rotating 2s linear infinite;
}

@keyframes rotating {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.rebalance-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.suggestion-meta {
  display: flex;
  gap: var(--spacing-lg);
  margin-top: var(--spacing-sm);
}

.operations-section h4,
.preview-section h4 {
  margin: 0 0 var(--spacing-md) 0;
  font-size: 16px;
  font-weight: 600;
}

.total-weight {
  margin-top: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--bg-secondary);
  border-radius: var(--border-radius-sm);
  text-align: right;
  font-size: 16px;
  font-weight: 600;
}

.total-weight .valid {
  color: var(--color-success);
}

.total-weight .invalid {
  color: var(--color-danger);
}

.warning-text {
  color: var(--color-warning);
  font-size: 14px;
  margin-left: var(--spacing-sm);
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-lg);
}

.preview-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  padding: var(--spacing-md);
  background: var(--bg-secondary);
  border-radius: var(--border-radius-sm);
  text-align: center;
}

.preview-item .label {
  font-size: 14px;
  color: var(--text-secondary);
}

.preview-item .value {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.positive {
  color: var(--color-success);
}

.negative {
  color: var(--color-danger);
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

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
}
</style>

