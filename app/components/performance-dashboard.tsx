'use client'

import { usePerformanceMonitor } from '@/app/lib/performance-monitor'
import { useState, useEffect } from 'react'
import { 
  ChartBarIcon, 
  ClockIcon, 
  CpuChipIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'

interface PerformanceDashboardProps {
  className?: string
}

export default function PerformanceDashboard({ className = '' }: PerformanceDashboardProps) {
  const { metrics, score } = usePerformanceMonitor()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Show dashboard after metrics are loaded
    if (metrics) {
      setIsVisible(true)
    }
  }, [metrics])

  if (!isVisible || !metrics) {
    return null
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreIcon = (score: number) => {
    if (score >= 90) return <CheckCircleIcon className="h-5 w-5 text-green-600" />
    if (score >= 70) return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
    return <XCircleIcon className="h-5 w-5 text-red-600" />
  }

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const formatMemory = (mb: number) => {
    if (mb < 1024) return `${mb.toFixed(1)}MB`
    return `${(mb / 1024).toFixed(1)}GB`
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <ChartBarIcon className="h-6 w-6 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Performance Dashboard</h3>
        </div>
        <div className="flex items-center">
          {getScoreIcon(score)}
          <span className={`ml-2 text-2xl font-bold ${getScoreColor(score)}`}>
            {score}
          </span>
          <span className="ml-1 text-sm text-gray-500">/100</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Core Web Vitals */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700 uppercase tracking-wide">
            Core Web Vitals
          </h4>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">First Contentful Paint</span>
              <span className="text-sm font-medium">
                {formatTime(metrics.firstContentfulPaint)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Largest Contentful Paint</span>
              <span className="text-sm font-medium">
                {formatTime(metrics.largestContentfulPaint)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">First Input Delay</span>
              <span className="text-sm font-medium">
                {formatTime(metrics.firstInputDelay)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Cumulative Layout Shift</span>
              <span className="text-sm font-medium">
                {metrics.cumulativeLayoutShift.toFixed(3)}
              </span>
            </div>
          </div>
        </div>

        {/* Loading Performance */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700 uppercase tracking-wide">
            Loading Performance
          </h4>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Page Load Time</span>
              <span className="text-sm font-medium">
                {formatTime(metrics.pageLoadTime)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Time to Interactive</span>
              <span className="text-sm font-medium">
                {formatTime(metrics.timeToInteractive)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Network Requests</span>
              <span className="text-sm font-medium">
                {metrics.networkRequests}
              </span>
            </div>
          </div>
        </div>

        {/* System Resources */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700 uppercase tracking-wide">
            System Resources
          </h4>
          
          <div className="space-y-3">
            {metrics.memoryUsage && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Memory Usage</span>
                <span className="text-sm font-medium">
                  {formatMemory(metrics.memoryUsage)}
                </span>
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Error Count</span>
              <span className={`text-sm font-medium ${
                metrics.errorCount > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {metrics.errorCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Recommendations */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 uppercase tracking-wide mb-3">
          Recommendations
        </h4>
        
        <div className="space-y-2">
          {metrics.firstContentfulPaint > 1800 && (
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" />
              <span className="text-sm text-gray-600">
                First Contentful Paint is slow. Consider optimizing images and reducing render-blocking resources.
              </span>
            </div>
          )}
          
          {metrics.largestContentfulPaint > 2500 && (
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" />
              <span className="text-sm text-gray-600">
                Largest Contentful Paint is slow. Optimize the largest content element and improve server response times.
              </span>
            </div>
          )}
          
          {metrics.firstInputDelay > 100 && (
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" />
              <span className="text-sm text-gray-600">
                First Input Delay is high. Reduce JavaScript execution time and break up long tasks.
              </span>
            </div>
          )}
          
          {metrics.cumulativeLayoutShift > 0.1 && (
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" />
              <span className="text-sm text-gray-600">
                Cumulative Layout Shift is high. Reserve space for dynamic content and avoid inserting content above existing content.
              </span>
            </div>
          )}
          
          {metrics.errorCount > 0 && (
            <div className="flex items-start">
              <XCircleIcon className="h-4 w-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
              <span className="text-sm text-gray-600">
                {metrics.errorCount} error(s) detected. Check browser console for details.
              </span>
            </div>
          )}
          
          {score >= 90 && (
            <div className="flex items-start">
              <CheckCircleIcon className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
              <span className="text-sm text-gray-600">
                Excellent performance! Keep up the good work.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

