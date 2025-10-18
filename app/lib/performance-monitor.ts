import { useEffect, useState } from 'react'

interface PerformanceMetrics {
  pageLoadTime: number
  firstContentfulPaint: number
  largestContentfulPaint: number
  firstInputDelay: number
  cumulativeLayoutShift: number
  timeToInteractive: number
  memoryUsage?: number
  networkRequests: number
  errorCount: number
}

interface PerformanceEntry {
  name: string
  entryType: string
  startTime: number
  duration: number
  timestamp: number
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics
  private observers: PerformanceObserver[]
  private startTime: number

  constructor() {
    this.metrics = {
      pageLoadTime: 0,
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      firstInputDelay: 0,
      cumulativeLayoutShift: 0,
      timeToInteractive: 0,
      networkRequests: 0,
      errorCount: 0
    }
    this.observers = []
    this.startTime = performance.now()
    this.initializeObservers()
  }

  private initializeObservers() {
    // Observe navigation timing
    if ('PerformanceObserver' in window) {
      const navObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry) => {
          if (entry.entryType === 'navigation') {
            this.metrics.pageLoadTime = entry.loadEventEnd - entry.loadEventStart
            this.metrics.timeToInteractive = entry.domInteractive - entry.navigationStart
          }
        })
      })
      navObserver.observe({ entryTypes: ['navigation'] })
      this.observers.push(navObserver)

      // Observe paint timing
      const paintObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            this.metrics.firstContentfulPaint = entry.startTime
          }
        })
      })
      paintObserver.observe({ entryTypes: ['paint'] })
      this.observers.push(paintObserver)

      // Observe largest contentful paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        this.metrics.largestContentfulPaint = lastEntry.startTime
      })
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
      this.observers.push(lcpObserver)

      // Observe first input delay
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          this.metrics.firstInputDelay = entry.processingStart - entry.startTime
        })
      })
      fidObserver.observe({ entryTypes: ['first-input'] })
      this.observers.push(fidObserver)

      // Observe layout shift
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value
          }
        })
        this.metrics.cumulativeLayoutShift = clsValue
      })
      clsObserver.observe({ entryTypes: ['layout-shift'] })
      this.observers.push(clsObserver)

      // Observe resource timing
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        this.metrics.networkRequests += entries.length
      })
      resourceObserver.observe({ entryTypes: ['resource'] })
      this.observers.push(resourceObserver)
    }

    // Monitor memory usage
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory
        this.metrics.memoryUsage = memory.usedJSHeapSize / 1024 / 1024 // MB
      }, 5000)
    }

    // Monitor errors
    window.addEventListener('error', () => {
      this.metrics.errorCount++
    })

    window.addEventListener('unhandledrejection', () => {
      this.metrics.errorCount++
    })
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  getPerformanceScore(): number {
    const scores = {
      fcp: this.getScore(this.metrics.firstContentfulPaint, [1800, 3000]),
      lcp: this.getScore(this.metrics.largestContentfulPaint, [2500, 4000]),
      fid: this.getScore(this.metrics.firstInputDelay, [100, 300]),
      cls: this.getScore(this.metrics.cumulativeLayoutShift, [0.1, 0.25])
    }

    return Math.round((scores.fcp + scores.lcp + scores.fid + scores.cls) / 4)
  }

  private getScore(value: number, thresholds: [number, number]): number {
    if (value <= thresholds[0]) return 100
    if (value <= thresholds[1]) return 75
    return 50
  }

  reportMetrics(): void {
    const metrics = this.getMetrics()
    const score = this.getPerformanceScore()

    // Send to analytics service
    if (typeof window !== 'undefined' && 'gtag' in window) {
      (window as any).gtag('event', 'performance_metrics', {
        page_load_time: metrics.pageLoadTime,
        first_contentful_paint: metrics.firstContentfulPaint,
        largest_contentful_paint: metrics.largestContentfulPaint,
        first_input_delay: metrics.firstInputDelay,
        cumulative_layout_shift: metrics.cumulativeLayoutShift,
        time_to_interactive: metrics.timeToInteractive,
        memory_usage: metrics.memoryUsage,
        network_requests: metrics.networkRequests,
        error_count: metrics.errorCount,
        performance_score: score
      })
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Performance Metrics:', {
        ...metrics,
        score
      })
    }
  }

  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
  }
}

// React hook for performance monitoring
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [score, setScore] = useState<number>(0)

  useEffect(() => {
    const monitor = new PerformanceMonitor()

    // Report metrics after page load
    const reportTimer = setTimeout(() => {
      const currentMetrics = monitor.getMetrics()
      const currentScore = monitor.getPerformanceScore()
      
      setMetrics(currentMetrics)
      setScore(currentScore)
      monitor.reportMetrics()
    }, 3000)

    return () => {
      clearTimeout(reportTimer)
      monitor.cleanup()
    }
  }, [])

  return { metrics, score }
}

// Performance optimization utilities
export class PerformanceOptimizer {
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout
    return (...args: Parameters<T>) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func(...args), wait)
    }
  }

  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args)
        inThrottle = true
        setTimeout(() => inThrottle = false, limit)
      }
    }
  }

  static lazyLoad(component: React.ComponentType<any>) {
    return React.lazy(() => Promise.resolve({ default: component }))
  }

  static preloadImage(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve()
      img.onerror = reject
      img.src = src
    })
  }

  static optimizeImages(images: string[]): Promise<void[]> {
    return Promise.all(images.map(src => this.preloadImage(src)))
  }

  static createIntersectionObserver(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit
  ): IntersectionObserver {
    return new IntersectionObserver(callback, {
      rootMargin: '50px',
      threshold: 0.1,
      ...options
    })
  }

  static memoize<T extends (...args: any[]) => any>(fn: T): T {
    const cache = new Map()
    return ((...args: Parameters<T>) => {
      const key = JSON.stringify(args)
      if (cache.has(key)) {
        return cache.get(key)
      }
      const result = fn(...args)
      cache.set(key, result)
      return result
    }) as T
  }
}

// Bundle analyzer for development
export function analyzeBundle() {
  if (process.env.NODE_ENV === 'development') {
    console.log('Bundle analysis available. Run: npm run analyze')
  }
}

export default PerformanceMonitor
