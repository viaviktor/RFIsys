interface PerformanceMetrics {
  operation: string
  duration: number
  timestamp: number
  metadata?: Record<string, any>
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = []
  private maxMetrics = 1000

  startTimer(operation: string, metadata?: Record<string, any>) {
    const startTime = performance.now()
    
    return {
      end: () => {
        const duration = performance.now() - startTime
        this.recordMetric({
          operation,
          duration: Math.round(duration * 100) / 100, // Round to 2 decimal places
          timestamp: Date.now(),
          metadata,
        })
        
        // Log slow operations in development
        if (process.env.NODE_ENV === 'development' && duration > 1000) {
          console.warn(`⚠️  Slow operation detected: ${operation} took ${duration.toFixed(2)}ms`, metadata)
        }
        
        return duration
      }
    }
  }

  recordMetric(metric: PerformanceMetrics) {
    this.metrics.push(metric)
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }
  }

  getMetrics(operation?: string): PerformanceMetrics[] {
    if (operation) {
      return this.metrics.filter(m => m.operation === operation)
    }
    return [...this.metrics]
  }

  getAverageTime(operation: string): number {
    const operationMetrics = this.getMetrics(operation)
    if (operationMetrics.length === 0) return 0
    
    const totalTime = operationMetrics.reduce((sum, metric) => sum + metric.duration, 0)
    return Math.round((totalTime / operationMetrics.length) * 100) / 100
  }

  clearMetrics() {
    this.metrics = []
  }

  getSummary() {
    const operations = [...new Set(this.metrics.map(m => m.operation))]
    
    return operations.map(operation => {
      const operationMetrics = this.getMetrics(operation)
      const durations = operationMetrics.map(m => m.duration)
      
      return {
        operation,
        count: operationMetrics.length,
        averageTime: this.getAverageTime(operation),
        minTime: Math.min(...durations),
        maxTime: Math.max(...durations),
        lastExecuted: Math.max(...operationMetrics.map(m => m.timestamp)),
      }
    })
  }
}

export const performanceMonitor = new PerformanceMonitor()

// Helper function for timing database operations
export function withTiming<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const timer = performanceMonitor.startTimer(operation, metadata)
  
  return fn().finally(() => {
    timer.end()
  })
}

// Helper function for timing API requests  
export function timeApiRequest(request: string, metadata?: Record<string, any>) {
  return performanceMonitor.startTimer(`api:${request}`, metadata)
}