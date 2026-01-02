<template>
  <div class="flowhub-create">
    <div class="page-header">
      <div>
        <h1>新建数据任务</h1>
        <p>仅支持 Flowhub 当前提供的日线/批量任务类型</p>
      </div>
      <el-button @click="$router.back()">
        返回
      </el-button>
    </div>

    <ChartCard title="任务参数">
      <el-form
        ref="taskFormRef"
        :model="taskForm"
        :rules="taskRules"
        label-width="120px"
      >
        <el-form-item label="任务名称" prop="name">
          <el-input v-model="taskForm.name" placeholder="可选，留空则自动生成" style="width: 360px" />
        </el-form-item>

        <el-form-item label="数据类型" prop="dataType">
          <el-select v-model="taskForm.dataType" placeholder="请选择数据类型" style="width: 360px">
            <el-option
              v-for="option in dataTypeOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item v-if="!isBatch" label="股票代码" prop="symbol">
          <el-input v-model="taskForm.symbol" placeholder="例如: 000001.SZ" style="width: 360px" />
        </el-form-item>

        <el-form-item v-if="isBatch" label="股票列表" prop="symbols">
          <el-input
            v-model="taskForm.symbols"
            type="textarea"
            :rows="4"
            placeholder="输入股票代码，使用逗号或换行分隔"
            style="width: 360px"
          />
        </el-form-item>

        <el-form-item label="增量更新">
          <el-switch v-model="taskForm.incremental" />
        </el-form-item>

        <el-form-item label="强制更新">
          <el-switch v-model="taskForm.forceUpdate" />
        </el-form-item>

        <el-form-item label="调度类型" prop="scheduleType">
          <el-select v-model="taskForm.scheduleType" placeholder="请选择调度类型" style="width: 360px">
            <el-option
              v-for="option in scheduleTypeOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item v-if="taskForm.scheduleType === 'interval'" label="执行间隔" prop="scheduleValue">
          <el-input-number v-model="taskForm.scheduleValue" :min="60" :step="60" style="width: 200px" />
          <span class="form-suffix">秒</span>
        </el-form-item>

        <el-form-item v-if="taskForm.scheduleType === 'cron'" label="Cron表达式" prop="scheduleValue">
          <el-input v-model="taskForm.scheduleValue" placeholder="例如: 0 2 * * *" style="width: 360px" />
        </el-form-item>

        <el-form-item label="启用任务">
          <el-switch v-model="taskForm.enabled" />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="saving" @click="saveTask">
            {{ isEditing ? '更新任务' : '创建任务' }}
          </el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>
    </ChartCard>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { flowhubApi } from '../../api/clients'
import ChartCard from '../../components/ChartCard.vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

const route = useRoute()
const router = useRouter()

const dataTypeOptions = [
  { value: 'daily_ohlc', label: '日线行情' },
  { value: 'daily_basic', label: '日线基础数据' },
  { value: 'batch_daily_ohlc', label: '批量日线行情' },
  { value: 'batch_daily_basic', label: '批量日线基础数据' }
]

const scheduleTypeOptions = [
  { value: 'manual', label: '即时执行' },
  { value: 'interval', label: '周期执行' },
  { value: 'cron', label: '定时执行' }
]

const taskFormRef = ref<FormInstance>()
const saving = ref(false)

const taskForm = ref({
  name: '',
  dataType: '',
  symbol: '',
  symbols: '',
  incremental: false,
  forceUpdate: false,
  scheduleType: 'manual',
  scheduleValue: 3600,
  enabled: true
})

const isBatch = computed(() => taskForm.value.dataType.includes('batch'))
const isEditing = computed(() => Boolean(route.query.id))

const taskRules: FormRules = {
  name: [{ max: 50, message: '任务名称长度需小于50个字符', trigger: 'blur' }],
  dataType: [{ required: true, message: '请选择数据类型', trigger: 'change' }],
  symbol: [
    {
      validator: (_rule, value, callback) => {
        if (!isBatch.value && !value) {
          callback(new Error('请输入股票代码'))
          return
        }
        callback()
      },
      trigger: 'blur'
    }
  ],
  symbols: [
    {
      validator: (_rule, value, callback) => {
        if (isBatch.value && !value) {
          callback(new Error('请输入股票列表'))
          return
        }
        callback()
      },
      trigger: 'blur'
    }
  ],
  scheduleType: [{ required: true, message: '请选择调度类型', trigger: 'change' }],
  scheduleValue: [
    {
      validator: (_rule, value, callback) => {
        if (taskForm.value.scheduleType === 'interval' && (!value || value <= 0)) {
          callback(new Error('请输入执行间隔（秒）'))
          return
        }
        if (taskForm.value.scheduleType === 'cron' && !value) {
          callback(new Error('请输入Cron表达式'))
          return
        }
        callback()
      },
      trigger: 'blur'
    }
  ]
}

function parseSymbols(value: string) {
  return value
    .split(/[\n,]+/)
    .map(symbol => symbol.trim())
    .filter(Boolean)
}

function resetForm() {
  taskForm.value = {
    name: '',
    dataType: '',
    symbol: '',
    symbols: '',
    incremental: false,
    forceUpdate: false,
    scheduleType: 'manual',
    scheduleValue: 3600,
    enabled: true
  }
}

async function loadTask() {
  const taskId = route.query.id as string
  if (!taskId) return

  try {
    const resp = await flowhubApi.get(`/api/v1/flowhub/tasks/${taskId}`)
    const task = resp.data?.data || resp.data
    if (!task) return

    const params = task.params || {}
    taskForm.value.name = task.name || ''
    taskForm.value.dataType = task.data_type || params.data_type || ''
    taskForm.value.symbol = params.symbol || ''
    taskForm.value.symbols = Array.isArray(params.symbols) ? params.symbols.join(',') : ''
    taskForm.value.incremental = Boolean(params.incremental)
    taskForm.value.forceUpdate = Boolean(params.force_update)
    taskForm.value.scheduleType = task.schedule_type || 'manual'
    taskForm.value.scheduleValue = taskForm.value.scheduleType === 'cron'
      ? (task.schedule_value || '')
      : (task.schedule_value ? Number(task.schedule_value) : 3600)
    taskForm.value.enabled = Boolean(task.enabled)
  } catch (error) {
    console.warn('加载任务失败:', error)
    ElMessage.error('加载任务失败')
  }
}

async function saveTask() {
  if (!taskFormRef.value) return

  try {
    await taskFormRef.value.validate()
    saving.value = true

    const payload: Record<string, any> = {
      name: taskForm.value.name?.trim() || undefined,
      data_type: taskForm.value.dataType,
      incremental: taskForm.value.incremental,
      force_update: taskForm.value.forceUpdate,
      schedule_type: taskForm.value.scheduleType,
      schedule_value: taskForm.value.scheduleType === 'manual'
        ? null
        : taskForm.value.scheduleValue,
      enabled: taskForm.value.enabled
    }

    if (isBatch.value) {
      payload.symbols = parseSymbols(taskForm.value.symbols)
    } else {
      payload.symbol = taskForm.value.symbol.trim()
    }

    const taskId = route.query.id as string | undefined
    if (taskId) {
      await flowhubApi.put(`/api/v1/flowhub/tasks/${taskId}`, payload)
      ElMessage.success('任务已更新')
    } else {
      await flowhubApi.post('/api/v1/flowhub/tasks', payload)
      ElMessage.success('任务已创建')
    }

    router.push('/flowhub/tasks')
  } catch (error) {
    if (error) {
      console.warn('保存任务失败:', error)
      ElMessage.error('任务保存失败')
    }
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadTask()
})
</script>

<style scoped>
.flowhub-create {
  padding: var(--spacing-xl);
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--section-gap-lg);
}

.page-header h1 {
  margin: 0 0 var(--spacing-xs) 0;
  font-size: var(--text-3xl);
  font-weight: 700;
  color: var(--text-primary);
}

.page-header p {
  margin: 0;
  color: var(--text-secondary);
}

.form-suffix {
  margin-left: var(--spacing-sm);
  color: var(--text-secondary);
}
</style>
