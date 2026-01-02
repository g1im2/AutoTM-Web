<template>
  <div class="monitoring-performance">
    <div class="page-header">
      <div class="header-actions">
        <el-button @click="refreshData">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
        <el-select v-model="timeRange" @change="onTimeRangeChange" style="width: 150px">
          <el-option label="最近1小时" value="1h" />
          <el-option label="最近6小时" value="6h" />
          <el-option label="最近24小时" value="24h" />
          <el-option label="最近7天" value="7d" />
        </el-select>
      </div>
    </div>

    <!-- 性能概览 -->
    <div class="performance-overview">
      <div class="overview-cards">
        <KpiCard 
          title="平均CPU使用率" 
          :value="performanceMetrics.avgCpuUsage" 
          format="percentage"
          :type="performanceMetrics.avgCpuUsage > 70 ? 'warning' : 'success'"
          subtitle="过去24小时"
        />
        <KpiCard 
          title="平均内存使用率" 
          :value="performanceMetrics.avgMemoryUsage" 
          format="percentage"
          :type="performanceMetrics.avgMemoryUsage > 80 ? 'warning' : 'success'"
          subtitle="过去24小时"
        />
        <KpiCard 
          title="平均响应时间" 
          :value="performanceMetrics.avgResponseTime" 
          :type="performanceMetrics.avgResponseTime > 200 ? 'warning' : 'success'"
          subtitle="毫秒"
        />
        <KpiCard 
          title="吞吐量" 
          :value="performanceMetrics.throughput" 
          subtitle="请求/秒"
        />
      </div>
    </div>

    <!-- 系统性能趋势 -->
    <div class="system-trends">
      <div class="trends-grid">
        <!-- CPU使用率趋势 -->
        <ChartCard title="CPU使用率趋势" height="350px">
          <TrendChart 
            :data="cpuTrendData" 
            color="#ef4444"
            title="CPU使用率"
            unit="%"
          />
        </ChartCard>

        <!-- 内存使用率趋势 -->
        <ChartCard title="内存使用率趋势" height="350px">
          <TrendChart 
            :data="memoryTrendData" 
            color="#f59e0b"
            title="内存使用率"
            unit="%"
          />
        </ChartCard>

        <!-- 响应时间趋势 -->
        <ChartCard title="响应时间趋势" height="350px">
          <TrendChart 
            :data="responseTimeTrendData" 
            color="#3b82f6"
            title="响应时间"
            unit="ms"
          />
        </ChartCard>

        <!-- 吞吐量趋势 -->
        <ChartCard title="吞吐量趋势" height="350px">
          <TrendChart 
            :data="throughputTrendData" 
            color="#10b981"
            title="吞吐量"
            unit="req/s"
          />
        </ChartCard>
      </div>
    </div>

    <!-- 性能分析 -->
    <div class="performance-analysis">
      <div class="analysis-grid">
        <!-- 资源使用分布 -->
        <ChartCard title="资源使用分布" height="400px">
          <div class="resource-usage-chart">
            <v-chart class="chart" :option="resourceUsageOption" autoresize />
          </div>
        </ChartCard>

        <!-- 性能瓶颈分析 -->
        <ChartCard title="性能瓶颈分析" height="400px">
          <div class="bottleneck-analysis">
            <div class="bottleneck-item" v-for="bottleneck in bottlenecks" :key="bottleneck.id">
              <div class="bottleneck-header">
                <div class="bottleneck-title">{{ bottleneck.component }}</div>
                <el-tag :type="getSeverityType(bottleneck.severity)">{{ bottleneck.severityText }}</el-tag>
              </div>
              <p class="bottleneck-description">{{ bottleneck.description }}</p>
              <div class="bottleneck-metrics">
                <span class="metric">影响程度: {{ bottleneck.impact }}%</span>
                <span class="metric">建议优先级: {{ bottleneck.priority }}</span>
              </div>
              <div class="bottleneck-suggestions">
                <div class="suggestions-label">优化建议:</div>
                <ul>
                  <li v-for="suggestion in bottleneck.suggestions" :key="suggestion">{{ suggestion }}</li>
                </ul>
              </div>
            </div>
          </div>
        </ChartCard>
      </div>
    </div>

    <!-- 服务性能对比 -->
    <div class="service-comparison">
      <ChartCard title="服务性能对比">
        <div class="table-wrapper">
          <el-table :data="paginatedServicePerformance" style="width: 100%" stripe border>
            <el-table-column prop="serviceName" label="服务名称" :min-width="200" show-overflow-tooltip header-align="center" />
            <el-table-column prop="avgCpuUsage" label="平均CPU" :min-width="120" align="right" header-align="center">
              <template #default="{ row }">
                <span :class="getUsageClass(row.avgCpuUsage)">{{ row.avgCpuUsage }}%</span>
              </template>
            </el-table-column>
            <el-table-column prop="avgMemoryUsage" label="平均内存" :min-width="120" align="right" header-align="center">
              <template #default="{ row }">
                <span :class="getUsageClass(row.avgMemoryUsage)">{{ row.avgMemoryUsage }}%</span>
              </template>
            </el-table-column>
            <el-table-column prop="avgResponseTime" label="平均响应时间" :min-width="140" align="right" header-align="center">
              <template #default="{ row }">
                <span :class="getResponseTimeClass(row.avgResponseTime)">{{ row.avgResponseTime }}ms</span>
              </template>
            </el-table-column>
            <el-table-column prop="throughput" label="吞吐量" :min-width="120" align="right" header-align="center">
              <template #default="{ row }">
                {{ row.throughput }} req/s
              </template>
            </el-table-column>
            <el-table-column prop="errorRate" label="错误率" :min-width="100" align="right" header-align="center">
              <template #default="{ row }">
                <span :class="getErrorRateClass(row.errorRate)">{{ row.errorRate }}%</span>
              </template>
            </el-table-column>
            <el-table-column prop="availability" label="可用性" :min-width="100" align="right" header-align="center">
              <template #default="{ row }">
                <span :class="getAvailabilityClass(row.availability)">{{ row.availability }}%</span>
              </template>
            </el-table-column>
            <el-table-column prop="performanceScore" label="性能评分" :min-width="120" align="right" header-align="center">
              <template #default="{ row }">
                <el-progress
                  :percentage="row.performanceScore"
                  :color="getScoreColor(row.performanceScore)"
                  :show-text="false"
                  style="width: 80px"
                />
                <span style="margin-left: 8px">{{ row.performanceScore }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" :min-width="120" fixed="right" align="left" header-align="center">
              <template #default="{ row }">
                <el-button size="small" type="primary" @click="viewServiceDetail(row)">
                  <el-icon><View /></el-icon>
                  详情
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            v-if="servicePerformance.length > 10"
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="servicePerformance.length"
            layout="total, sizes, prev, pager, next, jumper"
            class="pagination"
          />
        </div>
      </ChartCard>
    </div>

    <!-- 性能优化建议 -->
    <div class="optimization-suggestions">
      <ChartCard title="性能优化建议">
        <div class="suggestions-list">
          <div class="suggestion-item" v-for="suggestion in optimizationSuggestions" :key="suggestion.id">
            <div class="suggestion-header">
              <el-icon class="suggestion-icon" :class="getPriorityClass(suggestion.priority)">
                <component :is="getPriorityIcon(suggestion.priority)" />
              </el-icon>
              <div class="suggestion-title">{{ suggestion.title }}</div>
              <el-tag :type="getPriorityType(suggestion.priority)" size="small">{{ suggestion.priorityText }}</el-tag>
            </div>
            <p class="suggestion-description">{{ suggestion.description }}</p>
            <div class="suggestion-details">
              <span class="detail-item">预期收益: {{ suggestion.expectedBenefit }}</span>
              <span class="detail-item">实施难度: {{ suggestion.difficulty }}</span>
              <span class="detail-item">预计时间: {{ suggestion.estimatedTime }}</span>
            </div>
            <div class="suggestion-actions">
              <el-button size="small" type="primary">查看详情</el-button>
              <el-button size="small">标记为已完成</el-button>
            </div>
          </div>
        </div>
      </ChartCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { monitoringApi } from '../../api/clients'
import KpiCard from '../../components/KpiCard.vue'
import ChartCard from '../../components/ChartCard.vue'
import TrendChart from '../../components/charts/TrendChart.vue'
import { 
  Refresh, View, Warning, InfoFilled, CircleCheck
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { RadarChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  RadarComponent
} from 'echarts/components'
import VChart from 'vue-echarts'

// 注册 ECharts 组件
use([
  CanvasRenderer,
  RadarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  RadarComponent
])

interface PerformanceMetrics {
  avgCpuUsage: number
  avgMemoryUsage: number
  avgResponseTime: number
  throughput: number
}

interface ServicePerformance {
  serviceName: string
  avgCpuUsage: number
  avgMemoryUsage: number
  avgResponseTime: number
  throughput: number
  errorRate: number
  availability: number
  performanceScore: number
}

interface Bottleneck {
  id: string
  component: string
  severity: string
  severityText: string
  description: string
  impact: number
  priority: string
  suggestions: string[]
}

interface OptimizationSuggestion {
  id: string
  title: string
  description: string
  priority: string
  priorityText: string
  expectedBenefit: string
  difficulty: string
  estimatedTime: string
}

// 状态管理
const timeRange = ref('24h')

// 分页相关
const currentPage = ref(1)
const pageSize = ref(10)

// 性能指标
const performanceMetrics = ref<PerformanceMetrics>({
  avgCpuUsage: 45.2,
  avgMemoryUsage: 68.5,
  avgResponseTime: 125,
  throughput: 850
})

// 趋势数据
const cpuTrendData = ref<Array<{ date: string; value: number }>>([])
const memoryTrendData = ref<Array<{ date: string; value: number }>>([])
const responseTimeTrendData = ref<Array<{ date: string; value: number }>>([])
const throughputTrendData = ref<Array<{ date: string; value: number }>>([])

// 服务性能
const servicePerformance = ref<ServicePerformance[]>([
  {
    serviceName: 'brain-service',
    avgCpuUsage: 35.2,
    avgMemoryUsage: 58.1,
    avgResponseTime: 125,
    throughput: 450,
    errorRate: 0.1,
    availability: 99.9,
    performanceScore: 92
  },
  {
    serviceName: 'macro-service',
    avgCpuUsage: 28.5,
    avgMemoryUsage: 45.2,
    avgResponseTime: 95,
    throughput: 320,
    errorRate: 0.0,
    availability: 99.8,
    performanceScore: 95
  }
])

// 性能瓶颈
const bottlenecks = ref<Bottleneck[]>([
  {
    id: 'BN001',
    component: '数据库连接池',
    severity: 'warning',
    severityText: '警告',
    description: '数据库连接池使用率过高，可能导致连接等待',
    impact: 75,
    priority: '高',
    suggestions: [
      '增加数据库连接池大小',
      '优化慢查询',
      '实施连接池监控'
    ]
  },
  {
    id: 'BN002',
    component: 'Redis缓存',
    severity: 'info',
    severityText: '信息',
    description: '缓存命中率偏低，建议优化缓存策略',
    impact: 45,
    priority: '中',
    suggestions: [
      '调整缓存过期时间',
      '优化缓存键设计',
      '增加预热机制'
    ]
  }
])

// 优化建议
const optimizationSuggestions = ref<OptimizationSuggestion[]>([
  {
    id: 'OS001',
    title: '启用数据库查询缓存',
    description: '通过启用查询缓存可以显著减少数据库负载，提升响应速度',
    priority: 'high',
    priorityText: '高优先级',
    expectedBenefit: '响应时间减少30%',
    difficulty: '低',
    estimatedTime: '2小时'
  },
  {
    id: 'OS002',
    title: '实施API限流机制',
    description: '添加API限流可以防止系统过载，提升整体稳定性',
    priority: 'medium',
    priorityText: '中优先级',
    expectedBenefit: '系统稳定性提升25%',
    difficulty: '中',
    estimatedTime: '1天'
  }
])

// 分页数据
const paginatedServicePerformance = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return servicePerformance.value.slice(start, end)
})

// 资源使用雷达图配置
const resourceUsageOption = computed(() => ({
  title: {
    text: '资源使用雷达图',
    textStyle: { color: 'var(--text-primary)', fontSize: 14 }
  },
  tooltip: {},
  legend: {
    data: ['当前使用', '平均使用', '峰值使用'],
    textStyle: { color: 'var(--text-secondary)' }
  },
  radar: {
    indicator: [
      { name: 'CPU', max: 100 },
      { name: '内存', max: 100 },
      { name: '磁盘', max: 100 },
      { name: '网络', max: 100 },
      { name: '数据库', max: 100 },
      { name: '缓存', max: 100 }
    ]
  },
  series: [{
    name: '资源使用情况',
    type: 'radar',
    data: [
      {
        value: [45, 68, 72, 35, 55, 40],
        name: '当前使用',
        itemStyle: { color: '#3b82f6' }
      },
      {
        value: [40, 60, 65, 30, 50, 35],
        name: '平均使用',
        itemStyle: { color: '#10b981' }
      },
      {
        value: [85, 90, 88, 70, 80, 75],
        name: '峰值使用',
        itemStyle: { color: '#ef4444' }
      }
    ]
  }]
}))

// 方法
function getSeverityType(severity: string) {
  switch (severity) {
    case 'critical': return 'danger'
    case 'warning': return 'warning'
    case 'info': return 'info'
    default: return 'default'
  }
}

function getUsageClass(usage: number) {
  if (usage > 80) return 'text-danger'
  if (usage > 60) return 'text-warning'
  return 'text-success'
}

function getResponseTimeClass(time: number) {
  if (time > 500) return 'text-danger'
  if (time > 200) return 'text-warning'
  return 'text-success'
}

function getErrorRateClass(rate: number) {
  if (rate > 1) return 'text-danger'
  if (rate > 0.5) return 'text-warning'
  return 'text-success'
}

function getAvailabilityClass(availability: number) {
  if (availability < 99) return 'text-danger'
  if (availability < 99.5) return 'text-warning'
  return 'text-success'
}

function getScoreColor(score: number) {
  if (score >= 90) return '#10b981'
  if (score >= 70) return '#f59e0b'
  return '#ef4444'
}

function getPriorityClass(priority: string) {
  switch (priority) {
    case 'high': return 'text-danger'
    case 'medium': return 'text-warning'
    case 'low': return 'text-info'
    default: return 'text-muted'
  }
}

function getPriorityIcon(priority: string) {
  switch (priority) {
    case 'high': return Warning
    case 'medium': return InfoFilled
    case 'low': return CircleCheck
    default: return InfoFilled
  }
}

function getPriorityType(priority: string) {
  switch (priority) {
    case 'high': return 'danger'
    case 'medium': return 'warning'
    case 'low': return 'info'
    default: return 'default'
  }
}

function generateTrendData() {
  const data = []
  const now = new Date()
  const hours = timeRange.value === '1h' ? 1 : timeRange.value === '6h' ? 6 : timeRange.value === '24h' ? 24 : 168
  const interval = timeRange.value === '7d' ? 60 : 5 // 7天用小时，其他用5分钟
  
  for (let i = hours * (60 / interval); i >= 0; i--) {
    const date = new Date(now.getTime() - i * interval * 60 * 1000)
    data.push({
      date: date.toISOString(),
      value: Math.floor(Math.random() * 40) + 30
    })
  }
  
  return data
}

function onTimeRangeChange() {
  // 重新生成趋势数据
  cpuTrendData.value = generateTrendData()
  memoryTrendData.value = generateTrendData()
  responseTimeTrendData.value = generateTrendData()
  throughputTrendData.value = generateTrendData()
}

async function refreshData() {
  try {
    await monitoringApi.get('/api/v1/monitoring/performance')
    ElMessage.success('性能数据已刷新')
  } catch (error) {
    console.warn('刷新性能数据失败:', error)
    ElMessage.success('性能数据已刷新（模拟）')
  }
}

function viewServiceDetail(service: ServicePerformance) {
  ElMessage.info(`查看服务详情: ${service.serviceName}`)
}

onMounted(() => {
  // 初始化数据
  cpuTrendData.value = generateTrendData()
  memoryTrendData.value = generateTrendData()
  responseTimeTrendData.value = generateTrendData()
  throughputTrendData.value = generateTrendData()
})
</script>

<style scoped>
.monitoring-performance {
  padding: var(--spacing-xl);
  max-width: 1600px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--section-gap-lg);
}

.page-header h1 {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: var(--text-3xl);
  font-weight: 700;
  color: var(--text-primary);
}

.page-header p {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--text-lg);
}

.header-actions {
  display: flex;
  gap: var(--spacing-md);
  align-items: center;
}

.performance-overview {
  margin-bottom: var(--section-gap-lg);
}

.overview-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--card-gap-lg);
}

.system-trends,
.performance-analysis,
.service-comparison,
.optimization-suggestions {
  margin-bottom: var(--section-gap-md);
}

.trends-grid,
.analysis-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: var(--card-gap-lg);
}

.resource-usage-chart {
  height: 400px;
}

.chart {
  width: 100%;
  height: 100%;
}

.bottleneck-analysis {
  padding: var(--spacing-lg);
  max-height: 400px;
  overflow-y: auto;
}

.bottleneck-item {
  margin-bottom: var(--spacing-xl);
  padding: var(--spacing-lg);
  background-color: var(--surface-bg);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}

.bottleneck-item:last-child {
  margin-bottom: 0;
}

.bottleneck-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.bottleneck-header h4 {
  margin: 0;
  color: var(--text-primary);
}

.bottleneck-description {
  margin: 0 0 var(--spacing-md) 0;
  color: var(--text-secondary);
}

.bottleneck-metrics {
  display: flex;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-md);
}

.metric {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.bottleneck-suggestions h5 {
  margin: 0 0 var(--spacing-sm) 0;
  color: var(--text-primary);
}

.bottleneck-suggestions ul {
  margin: 0;
  padding-left: var(--spacing-lg);
}

.bottleneck-suggestions li {
  color: var(--text-secondary);
  margin-bottom: var(--spacing-xs);
}

.suggestions-list {
  padding: var(--spacing-lg);
}

.suggestion-item {
  margin-bottom: var(--spacing-xl);
  padding: var(--spacing-lg);
  background-color: var(--surface-bg);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}

.suggestion-item:last-child {
  margin-bottom: 0;
}

.suggestion-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.suggestion-icon {
  font-size: var(--text-xl);
}

.suggestion-header h4 {
  margin: 0;
  flex: 1;
  color: var(--text-primary);
}

.suggestion-description {
  margin: 0 0 var(--spacing-md) 0;
  color: var(--text-secondary);
}

.suggestion-details {
  display: flex;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-md);
}

.detail-item {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.suggestion-actions {
  display: flex;
  gap: var(--spacing-md);
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

/* 响应式设计 */
@media (max-width: 1200px) {
  .trends-grid,
  .analysis-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .monitoring-performance {
    padding: var(--spacing-md);
  }
  
  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: var(--spacing-md);
  }
  
  .header-actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .overview-cards {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--card-gap-xs);
  }
  
  .trends-grid,
  .analysis-grid {
    grid-template-columns: 1fr;
  }
  
  .bottleneck-metrics,
  .suggestion-details {
    flex-direction: column;
    gap: var(--spacing-sm);
  }
  
  .suggestion-actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
