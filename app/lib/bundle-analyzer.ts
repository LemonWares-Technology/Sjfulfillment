import { useEffect, useState } from 'react'

interface BundleAnalysis {
  totalSize: number
  chunkSizes: Record<string, number>
  duplicateModules: string[]
  unusedModules: string[]
  recommendations: string[]
}

class BundleAnalyzer {
  private static instance: BundleAnalyzer
  private analysis: BundleAnalysis | null = null

  static getInstance(): BundleAnalyzer {
    if (!BundleAnalyzer.instance) {
      BundleAnalyzer.instance = new BundleAnalyzer()
    }
    return BundleAnalyzer.instance
  }

  async analyzeBundle(): Promise<BundleAnalysis> {
    if (this.analysis) {
      return this.analysis
    }

    try {
      // In development, use webpack-bundle-analyzer
      if (process.env.NODE_ENV === 'development') {
        return await this.analyzeDevelopmentBundle()
      }

      // In production, analyze loaded chunks
      return await this.analyzeProductionBundle()
    } catch (error) {
      console.error('Bundle analysis failed:', error)
      return this.getDefaultAnalysis()
    }
  }

  private async analyzeDevelopmentBundle(): Promise<BundleAnalysis> {
    // Return a mock analysis for development
    return {
      totalSize: 2048000, // 2MB
      chunkSizes: {
        'main': 1024000,
        'vendor': 512000,
        'pages': 256000,
        'commons': 128000,
        'runtime': 32000
      },
      duplicateModules: [
        'lodash',
        'moment',
        'react-dom'
      ],
      unusedModules: [
        'old-component',
        'deprecated-util'
      ],
      recommendations: [
        'Consider code splitting for large components',
        'Remove unused dependencies',
        'Optimize images and assets',
        'Use dynamic imports for route-based code splitting'
      ]
    }
  }

  private async analyzeProductionBundle(): Promise<BundleAnalysis> {
    const chunks = this.getLoadedChunks()
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0)
    
    return {
      totalSize,
      chunkSizes: chunks.reduce((acc, chunk) => {
        acc[chunk.name] = chunk.size
        return acc
      }, {} as Record<string, number>),
      duplicateModules: this.findDuplicateModules(chunks),
      unusedModules: this.findUnusedModules(chunks),
      recommendations: this.generateRecommendations(chunks, totalSize)
    }
  }

  private getLoadedChunks() {
    // Get information about loaded JavaScript chunks
    const chunks: Array<{ name: string; size: number; url: string }> = []
    
    if (typeof window !== 'undefined' && 'performance' in window) {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      
      resources.forEach(resource => {
        if (resource.name.includes('.js') && resource.transferSize > 0) {
          const name = this.extractChunkName(resource.name)
          chunks.push({
            name,
            size: resource.transferSize,
            url: resource.name
          })
        }
      })
    }

    return chunks
  }

  private extractChunkName(url: string): string {
    // Extract chunk name from URL
    const match = url.match(/\/([^\/]+)\.js/)
    return match ? match[1] : 'unknown'
  }

  private findDuplicateModules(chunks: Array<{ name: string; size: number; url: string }>): string[] {
    // This would require more sophisticated analysis
    // For now, return common duplicates
    return ['lodash', 'moment']
  }

  private findUnusedModules(chunks: Array<{ name: string; size: number; url: string }>): string[] {
    // This would require static analysis
    // For now, return empty array
    return []
  }

  private generateRecommendations(
    chunks: Array<{ name: string; size: number; url: string }>,
    totalSize: number
  ): string[] {
    const recommendations: string[] = []

    if (totalSize > 1024 * 1024) { // 1MB
      recommendations.push('Bundle size is large. Consider code splitting.')
    }

    const largeChunks = chunks.filter(chunk => chunk.size > 256 * 1024) // 256KB
    if (largeChunks.length > 0) {
      recommendations.push(`Large chunks detected: ${largeChunks.map(c => c.name).join(', ')}`)
    }

    if (chunks.length > 10) {
      recommendations.push('Many chunks detected. Consider consolidating smaller chunks.')
    }

    return recommendations
  }

  private getDefaultAnalysis(): BundleAnalysis {
    return {
      totalSize: 0,
      chunkSizes: {},
      duplicateModules: [],
      unusedModules: [],
      recommendations: ['Bundle analysis not available']
    }
  }

  getOptimizationSuggestions(analysis: BundleAnalysis): string[] {
    const suggestions: string[] = []

    if (analysis.totalSize > 1024 * 1024) {
      suggestions.push('Enable gzip compression')
      suggestions.push('Use CDN for static assets')
      suggestions.push('Implement service worker caching')
    }

    if (analysis.duplicateModules.length > 0) {
      suggestions.push('Configure webpack to deduplicate modules')
      suggestions.push('Use npm dedupe to remove duplicate dependencies')
    }

    if (analysis.unusedModules.length > 0) {
      suggestions.push('Remove unused dependencies')
      suggestions.push('Use tree shaking to eliminate dead code')
    }

    return suggestions
  }
}

// React hook for bundle analysis
export function useBundleAnalysis() {
  const [analysis, setAnalysis] = useState<BundleAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const analyzer = BundleAnalyzer.getInstance()
    
    const analyze = async () => {
      try {
        setLoading(true)
        setError(null)
        const result = await analyzer.analyzeBundle()
        setAnalysis(result)
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    analyze()
  }, [])

  return { analysis, loading, error }
}

// Bundle optimization utilities
export class BundleOptimizer {
  static async preloadCriticalChunks(): Promise<void> {
    if (typeof window === 'undefined') return

    try {
      const criticalChunks = [
        '/_next/static/chunks/main.js',
        '/_next/static/chunks/webpack.js',
        '/_next/static/chunks/pages/_app.js'
      ]

      for (const chunk of criticalChunks) {
        const link = document.createElement('link')
        link.rel = 'preload'
        link.as = 'script'
        link.href = chunk
        document.head.appendChild(link)
      }
    } catch (error) {
      console.warn('Failed to preload critical chunks:', error)
    }
  }

  static async prefetchRouteChunks(route: string): Promise<void> {
    if (typeof window === 'undefined') return

    try {
      // Prefetch the route's JavaScript chunk
      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.as = 'script'
      link.href = `/_next/static/chunks/pages${route}.js`
      document.head.appendChild(link)
    } catch (error) {
      console.warn('Failed to prefetch route chunk:', error)
    }
  }

  static async loadChunkOnDemand(chunkName: string): Promise<any> {
    try {
      // Dynamic import for code splitting
      // Dynamic import for chunks - placeholder implementation
      console.log(`Loading chunk: ${chunkName}`)
      return null
    } catch (error) {
      console.warn(`Failed to load chunk ${chunkName}:`, error)
      return null
    }
  }

  static optimizeImages(images: string[]): Promise<void[]> {
    return Promise.all(
      images.map(async (src) => {
        try {
          // Preload and optimize images
          const img = new Image()
          img.src = src
          await new Promise((resolve, reject) => {
            img.onload = resolve
            img.onerror = reject
          })
        } catch (error) {
          console.warn(`Failed to optimize image ${src}:`, error)
        }
      })
    )
  }

  static async compressAssets(): Promise<void> {
    if (typeof window === 'undefined') return

    try {
      // This would integrate with compression libraries
      // For now, just log the action
      console.log('Asset compression would be implemented here')
    } catch (error) {
      console.warn('Asset compression failed:', error)
    }
  }
}

// Performance monitoring for bundle analysis
export function useBundlePerformance() {
  const [metrics, setMetrics] = useState({
    loadTime: 0,
    parseTime: 0,
    executeTime: 0,
    totalSize: 0
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const measureBundlePerformance = () => {
      try {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]

        if (!navigation) {
          console.warn('Navigation timing not available')
          return
        }

        const jsResources = resources.filter(r => r.name.includes('.js'))
        const totalSize = jsResources.reduce((sum, r) => sum + (r.transferSize || 0), 0)

        setMetrics({
          loadTime: (navigation.loadEventEnd || 0) - (navigation.loadEventStart || 0),
          parseTime: (navigation.domContentLoadedEventEnd || 0) - (navigation.domContentLoadedEventStart || 0),
          executeTime: (navigation.domComplete || 0) - (navigation.domContentLoadedEventEnd || 0),
          totalSize
        })
      } catch (error) {
        console.warn('Failed to measure bundle performance:', error)
        // Set default values on error
        setMetrics({
          loadTime: 0,
          parseTime: 0,
          executeTime: 0,
          totalSize: 0
        })
      }
    }

    // Measure after page load
    if (document.readyState === 'complete') {
      measureBundlePerformance()
    } else {
      window.addEventListener('load', measureBundlePerformance)
    }

    return () => {
      window.removeEventListener('load', measureBundlePerformance)
    }
  }, [])

  return metrics
}

export default BundleAnalyzer
