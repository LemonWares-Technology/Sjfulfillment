'use client'

import { useState, useEffect, useRef, ReactNode, ComponentType, lazy } from 'react'
import { PerformanceOptimizer } from './performance-monitor'

interface LazyLoadProps {
  children: ReactNode
  threshold?: number
  rootMargin?: string
  fallback?: ReactNode
  className?: string
}

export function LazyLoad({ 
  children, 
  threshold = 0.1, 
  rootMargin = '50px',
  fallback = <div className="animate-pulse bg-gray-200 h-32 rounded" />,
  className = ''
}: LazyLoadProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const elementRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = PerformanceOptimizer.createIntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasLoaded) {
            setIsVisible(true)
            setHasLoaded(true)
          }
        })
      },
      { threshold, rootMargin }
    )

    observer.observe(element)

    return () => {
      observer.unobserve(element)
    }
  }, [threshold, rootMargin, hasLoaded])

  return (
    <div ref={elementRef} className={className}>
      {isVisible ? children : fallback}
    </div>
  )
}

// Lazy load images
interface LazyImageProps {
  src: string
  alt: string
  className?: string
  placeholder?: string
  onLoad?: () => void
  onError?: () => void
}

export function LazyImage({ 
  src, 
  alt, 
  className = '',
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PC9zdmc+',
  onLoad,
  onError
}: LazyImageProps) {
  const [imageSrc, setImageSrc] = useState(placeholder)
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const img = imgRef.current
    if (!img) return

    const observer = PerformanceOptimizer.createIntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isLoaded && !hasError) {
            // Preload the image
            PerformanceOptimizer.preloadImage(src)
              .then(() => {
                setImageSrc(src)
                setIsLoaded(true)
                onLoad?.()
              })
              .catch(() => {
                setHasError(true)
                onError?.()
              })
          }
        })
      },
      { threshold: 0.1, rootMargin: '100px' }
    )

    observer.observe(img)

    return () => {
      observer.unobserve(img)
    }
  }, [src, isLoaded, hasError, onLoad, onError])

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={`transition-opacity duration-300 ${
        isLoaded ? 'opacity-100' : 'opacity-50'
      } ${className}`}
      onLoad={() => {
        if (imageSrc === src) {
          setIsLoaded(true)
          onLoad?.()
        }
      }}
      onError={() => {
        setHasError(true)
        onError?.()
      }}
    />
  )
}

// Lazy load components
export function withLazyLoading<P extends object>(
  Component: ComponentType<P>,
  fallback?: ReactNode
) {
  return function LazyComponent(props: P) {
    return (
      <LazyLoad fallback={fallback}>
        <Component {...props} />
      </LazyLoad>
    )
  }
}

// Virtual scrolling for large lists
interface VirtualScrollProps {
  items: any[]
  itemHeight: number
  containerHeight: number
  renderItem: (item: any, index: number) => ReactNode
  className?: string
}

export function VirtualScroll({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className = ''
}: VirtualScrollProps) {
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const visibleStart = Math.floor(scrollTop / itemHeight)
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight) + 1,
    items.length
  )

  const visibleItems = items.slice(visibleStart, visibleEnd)
  const totalHeight = items.length * itemHeight
  const offsetY = visibleStart * itemHeight

  const handleScroll = PerformanceOptimizer.throttle((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, 16) // ~60fps

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map((item, index) => (
            <div
              key={visibleStart + index}
              style={{ height: itemHeight }}
            >
              {renderItem(item, visibleStart + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Infinite scroll
interface InfiniteScrollProps {
  children: ReactNode
  onLoadMore: () => void
  hasMore: boolean
  loading: boolean
  threshold?: number
  className?: string
}

export function InfiniteScroll({
  children,
  onLoadMore,
  hasMore,
  loading,
  threshold = 0.1,
  className = ''
}: InfiniteScrollProps) {
  const [isLoading, setIsLoading] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const trigger = triggerRef.current
    if (!trigger || !hasMore || loading || isLoading) return

    const observer = PerformanceOptimizer.createIntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsLoading(true)
            onLoadMore()
            // Reset loading state after a delay
            setTimeout(() => setIsLoading(false), 1000)
          }
        })
      },
      { threshold }
    )

    observer.observe(trigger)

    return () => {
      observer.unobserve(trigger)
    }
  }, [hasMore, loading, isLoading, onLoadMore, threshold])

  return (
    <div className={className}>
      {children}
      {hasMore && (
        <div ref={triggerRef} className="h-10 flex items-center justify-center">
          {loading || isLoading ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500"></div>
          ) : (
            <div className="text-gray-500 text-sm">Scroll to load more...</div>
          )}
        </div>
      )}
    </div>
  )
}

// Progressive image loading
interface ProgressiveImageProps {
  src: string
  placeholder: string
  alt: string
  className?: string
}

export function ProgressiveImage({
  src,
  placeholder,
  alt,
  className = ''
}: ProgressiveImageProps) {
  const [currentSrc, setCurrentSrc] = useState(placeholder)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      setCurrentSrc(src)
      setIsLoaded(true)
    }
    img.src = src
  }, [src])

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <img
        src={currentSrc}
        alt={alt}
        className={`transition-all duration-500 ${
          isLoaded ? 'blur-0 scale-100' : 'blur-sm scale-105'
        }`}
      />
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
    </div>
  )
}

// Code splitting utilities using React.lazy
export const LazyComponents = {
  Analytics: lazy(() => import('../analytics/page')),
  Returns: lazy(() => import('../returns/page')),
  Notifications: lazy(() => import('../notifications/page'))
}

export default LazyLoad

