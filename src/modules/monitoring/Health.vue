<template>
  <PageTemplate>
    <ChartCard title="服务健康状态" show-refresh @refresh="refreshData" full-height>
      <div class="table-actions">
        <el-input
          v-model="searchText"
          placeholder="搜索服务名称"
          style="width: 300px"
          clearable
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>

      <div class="table-wrapper">
        <el-table :data="paginatedRows" style="width: 100%" stripe border :loading="loading">
          <el-table-column prop="name" label="服务名称" :min-width="150" show-overflow-tooltip header-align="center" />
          <el-table-column prop="status" label="状态" :min-width="100" align="center" header-align="center">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)">{{ row.status || '未知' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="responseTime" label="响应时间" :min-width="120" align="right" header-align="center" />
          <el-table-column prop="lastCheck" label="最后检查" :min-width="150" show-overflow-tooltip header-align="center" />
          <el-table-column prop="uptime" label="运行时间" :min-width="120" header-align="center" />
          <el-table-column label="操作" :min-width="150" fixed="right" align="left" header-align="center">
            <template #default="{ row }">
              <el-button size="small" @click="checkHealth(row)">
                <el-icon><Refresh /></el-icon>
                检查
              </el-button>
              <el-button size="small" type="primary" @click="viewDetails(row)">
                <el-icon><View /></el-icon>
                详情
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-pagination
          v-if="filteredRows.length > 10"
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="filteredRows.length"
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
import ChartCard from '../../components/ChartCard.vue'
import { brainApi } from '../../api/clients'
import { Search, Refresh, View } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const rows = ref<any[]>([])
const loading = ref(false)
const searchText = ref('')

// 分页相关
const currentPage = ref(1)
const pageSize = ref(10)

const filteredRows = computed(() => {
  if (!searchText.value) return rows.value
  return rows.value.filter(row =>
    row.name?.toLowerCase().includes(searchText.value.toLowerCase())
  )
})

const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredRows.value.slice(start, end)
})

function getStatusType(status: string) {
  switch (status) {
    case '正常': return 'success'
    case '警告': return 'warning'
    case '异常': return 'danger'
    default: return 'info'
  }
}

async function refreshData() {
  loading.value = true
  try {
    const { data } = await brainApi.get('/api/v1/monitoring/health')

    if (data?.data?.services && Array.isArray(data.data.services)) {
      rows.value = data.data.services.map((item: any) => ({
        name: item.name || item.service,
        status: item.status === 'healthy' ? '正常' : item.status === 'degraded' ? '警告' : '异常',
        responseTime: item.response_time || item.responseTime || '0ms',
        lastCheck: item.last_check || item.lastCheck || '未知',
        uptime: item.uptime || '0天'
      }))
    } else {
      // 如果后端返回空数据，显示空列表
      rows.value = []
    }
  } catch (e) {
    console.warn('获取服务健康数据失败:', e)
    rows.value = []
  } finally {
    loading.value = false
  }
}

function checkHealth(row: any) {
  ElMessage.info(`正在检查 ${row.name} 的健康状态...`)
  // 这里可以添加实际的健康检查逻辑
}

function viewDetails(row: any) {
  ElMessage.info(`查看 ${row.name} 的详细信息`)
  // 这里可以添加查看详情的逻辑
}

onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.table-actions {
  margin-bottom: var(--section-gap-sm);
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

