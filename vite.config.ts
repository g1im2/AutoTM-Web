import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      // Macro 服务（宏观 + 市场）
      '/api/v1/macro': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/v1/market': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },

      // Portfolio 服务
      '/api/v1/portfolio': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
      '/api/v1/portfolios': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },

      // Execution 服务（策略分析、信号、实时、回测、策略、量子池）
      '/api/v1/analyze': {
        target: 'http://localhost:8087',
        changeOrigin: true,
      },
      '/api/v1/backtest': {
        target: 'http://localhost:8087',
        changeOrigin: true,
      },
      '/api/v1/realtime': {
        target: 'http://localhost:8087',
        changeOrigin: true,
      },
      '/api/v1/strategy': {
        target: 'http://localhost:8087',
        changeOrigin: true,
      },
      '/api/v1/quantum': {
        target: 'http://localhost:8087',
        changeOrigin: true,
      },

      // Flowhub 数据任务服务
      '/api/v1/jobs': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
      '/api/v1/sources': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },

      // Brain/监控/系统服务
      '/api/v1/services': {
        target: 'http://localhost:8088',
        changeOrigin: true,
      },
      '/api/v1/monitoring': {
        target: 'http://localhost:8088',
        changeOrigin: true,
      },
      '/api/v1/system': {
        target: 'http://localhost:8088',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('echarts')) return 'echarts'
            if (id.includes('element-plus')) return 'element-plus'
            if (id.includes('/vue')) return 'vue'
            if (id.includes('axios')) return 'axios'
          }
        },
      },
    },
    chunkSizeWarningLimit: 1200,
  },
})
