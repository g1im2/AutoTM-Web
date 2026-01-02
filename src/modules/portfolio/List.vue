<template>
  <PageTemplate>
    <template #actions>
      <el-button type="primary" @click="createPortfolio">
        <el-icon><Plus /></el-icon>
        新建组合
      </el-button>
    </template>

    <!-- 组合概览卡片 -->
    <div class="overview-cards">
      <KpiCard 
        title="总组合数量" 
        :value="portfolios.length" 
        subtitle="活跃组合"
        type="success"
        :icon="PieChart"
      />
      <KpiCard 
        title="总资产规模" 
        :value="totalAssets" 
        subtitle="所有组合总值"
        format="currency"
        :icon="Money"
      />
      <KpiCard 
        title="平均收益率" 
        :value="averageReturn" 
        subtitle="年化收益率"
        format="percentage"
        :type="averageReturn > 0 ? 'success' : 'danger'"
        :trend="2.3"
        :icon="TrendCharts"
      />
      <KpiCard 
        title="风险水平" 
        :value="averageRisk" 
        subtitle="平均波动率"
        format="percentage"
        type="warning"
        :icon="Warning"
      />
    </div>

    <!-- 组合列表 -->
    <ChartCard title="投资组合" show-refresh @refresh="refreshData">
      <div class="table-actions">
        <el-input
          v-model="searchText"
          placeholder="搜索组合名称"
          style="width: 300px"
          clearable
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        
        <el-select v-model="statusFilter" placeholder="状态筛选" style="width: 150px">
          <el-option label="全部" value="" />
          <el-option label="活跃" value="active" />
          <el-option label="暂停" value="paused" />
          <el-option label="已关闭" value="closed" />
        </el-select>
      </div>

      <div class="table-wrapper">
        <el-table
          :data="paginatedPortfolios"
          style="width: 100%"
          :loading="loading"
          stripe
          border
          @row-click="viewPortfolio"
        >
          <el-table-column prop="name" label="组合名称" :min-width="200" show-overflow-tooltip header-align="center">
            <template #default="{ row }">
              <div class="portfolio-name">
                <strong>{{ row.name }}</strong>
                <div class="portfolio-code">{{ row.code }}</div>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="status" label="状态" :min-width="100" align="center" header-align="center">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)">{{ row.statusText }}</el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="totalValue" label="总资产" :min-width="120" align="right" header-align="center">
            <template #default="{ row }">
              {{ formatCurrency(row.totalValue) }}
            </template>
          </el-table-column>

          <el-table-column prop="return" label="收益率" :min-width="100" align="right" header-align="center">
            <template #default="{ row }">
              <span :class="getReturnClass(row.return)">
                {{ row.return > 0 ? '+' : '' }}{{ row.return.toFixed(2) }}%
              </span>
            </template>
          </el-table-column>

          <el-table-column prop="risk" label="风险" :min-width="80" align="right" header-align="center">
            <template #default="{ row }">
              {{ row.risk.toFixed(2) }}%
            </template>
          </el-table-column>

          <el-table-column prop="sharpe" label="夏普比率" :min-width="110" align="right" header-align="center">
            <template #default="{ row }">
              {{ row.sharpe.toFixed(3) }}
            </template>
          </el-table-column>

          <el-table-column prop="manager" label="管理人" :min-width="100" show-overflow-tooltip header-align="center" />

          <el-table-column prop="createTime" label="创建时间" :min-width="180" show-overflow-tooltip header-align="center" />

          <el-table-column label="操作" fixed="right" :min-width="200" align="left" header-align="center">
            <template #default="{ row }">
              <el-button size="small" @click.stop="viewPortfolio(row)">
                <el-icon><View /></el-icon>
                查看
              </el-button>
              <el-button size="small" type="primary" @click.stop="editPortfolio(row)">
                <el-icon><Edit /></el-icon>
                编辑
              </el-button>
              <el-button size="small" type="danger" @click.stop="deletePortfolio(row)">
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-pagination
          v-if="filteredPortfolios.length > 10"
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="filteredPortfolios.length"
          layout="total, sizes, prev, pager, next, jumper"
          class="pagination"
        />
      </div>
    </ChartCard>
  </PageTemplate>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import PageTemplate from '../../components/PageTemplate.vue'
import KpiCard from '../../components/KpiCard.vue'
import ChartCard from '../../components/ChartCard.vue'
import { portfolioApi } from '../../api/clients'
import { 
  Plus, PieChart, Money, TrendCharts, Warning, Search, 
  View, Edit, Delete 
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

interface Portfolio {
  id: string
  name: string
  code: string
  status: string
  statusText: string
  totalValue: number
  return: number
  risk: number
  sharpe: number
  manager: string
  createTime: string
}

const router = useRouter()
const loading = ref(false)
const searchText = ref('')
const statusFilter = ref('')

// 分页相关
const currentPage = ref(1)
const pageSize = ref(10)

// 从后端 API 获取真实数据
const portfolios = ref<Portfolio[]>([])

// 加载组合列表数据（修复：使用 portfolioApi 替代 fetch）
const loadPortfolios = async () => {
  loading.value = true
  try {
    const { data } = await portfolioApi.get('/api/v1/portfolios')
    // 兼容不同的响应结构：data.data.list 或 data.data 或 data.portfolios
    const list = data?.data?.list ?? data?.data ?? data?.portfolios ?? []
    portfolios.value = Array.isArray(list) ? list : []
  } catch (error) {
    console.error('加载组合列表失败:', error)
    ElMessage.error('加载组合列表失败，请稍后重试')
    // 降级：使用空数组
    portfolios.value = []
  } finally {
    loading.value = false
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadPortfolios()
})

const filteredPortfolios = computed(() => {
  let result = portfolios.value
  
  if (searchText.value) {
    result = result.filter(p => 
      p.name.toLowerCase().includes(searchText.value.toLowerCase()) ||
      p.code.toLowerCase().includes(searchText.value.toLowerCase())
    )
  }
  
  if (statusFilter.value) {
    result = result.filter(p => p.status === statusFilter.value)
  }
  
  return result
})

const paginatedPortfolios = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredPortfolios.value.slice(start, end)
})

const totalAssets = computed(() => {
  return portfolios.value.reduce((sum, p) => sum + p.totalValue, 0)
})

const averageReturn = computed(() => {
  if (portfolios.value.length === 0) return 0
  return portfolios.value.reduce((sum, p) => sum + p.return, 0) / portfolios.value.length
})

const averageRisk = computed(() => {
  if (portfolios.value.length === 0) return 0
  return portfolios.value.reduce((sum, p) => sum + p.risk, 0) / portfolios.value.length
})

function getStatusType(status: string) {
  switch (status) {
    case 'active': return 'success'
    case 'paused': return 'warning'
    case 'closed': return 'danger'
    default: return 'info'
  }
}

function getReturnClass(returnValue: number) {
  if (returnValue > 0) return 'text-success'
  if (returnValue < 0) return 'text-danger'
  return 'text-muted'
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 0
  }).format(value)
}

function createPortfolio() {
  router.push('/portfolio/create')
}

function viewPortfolio(portfolio: Portfolio) {
  router.push(`/portfolio/${portfolio.id}`)
}

function editPortfolio(portfolio: Portfolio) {
  router.push(`/portfolio/edit?id=${portfolio.id}`)
}

async function deletePortfolio(portfolio: Portfolio) {
  try {
    await ElMessageBox.confirm(
      `确定要删除组合 "${portfolio.name}" 吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // 调用删除API
    await portfolioApi.delete(`/api/v1/portfolios/${portfolio.id}`)
    
    // 从列表中移除
    const index = portfolios.value.findIndex(p => p.id === portfolio.id)
    if (index > -1) {
      portfolios.value.splice(index, 1)
    }
    
    ElMessage.success('删除成功')
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

async function refreshData() {
  // 复用 loadPortfolios 逻辑
  await loadPortfolios()
}
</script>

<style scoped>
.overview-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--card-gap-lg);
}

.table-actions {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
  align-items: center;
  flex-wrap: wrap;
}

.portfolio-name {
  line-height: 1.4;
}

.portfolio-code {
  font-size: var(--text-xs);
  color: var(--text-muted);
  margin-top: 2px;
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

/* 响应式优化 */
@media (max-width: 767px) {
  .overview-cards {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--card-gap-xs);
  }

  .table-actions {
    flex-direction: column;
    align-items: stretch;
    gap: var(--spacing-xs);
    margin-bottom: var(--spacing-xs);
  }
}

@media (min-width: 768px) and (max-width: 1199px) {
  .overview-cards {
    grid-template-columns: repeat(3, 1fr);
    gap: var(--card-gap-md);
  }

  .table-actions {
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
  }
}

@media (min-width: 1200px) and (max-width: 1599px) {
  .overview-cards {
    grid-template-columns: repeat(4, 1fr);
    gap: var(--card-gap-lg);
  }
}

@media (min-width: 1600px) {
  .overview-cards {
    gap: var(--card-gap-xl);
  }
}
</style>
