'use client'

import { useState, useEffect } from 'react'

interface PWAInstallPrompt {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface PWAState {
  isInstallable: boolean
  isInstalled: boolean
  isStandalone: boolean
  isOnline: boolean
  installPrompt: PWAInstallPrompt | null
}

class PWAManager {
  private static instance: PWAManager
  private state: PWAState = {
    isInstallable: false,
    isInstalled: false,
    isStandalone: false,
    isOnline: navigator.onLine,
    installPrompt: null
  }
  private listeners: Array<(state: PWAState) => void> = []

  static getInstance(): PWAManager {
    if (!PWAManager.instance) {
      PWAManager.instance = new PWAManager()
    }
    return PWAManager.instance
  }

  constructor() {
    this.initialize()
  }

  private initialize() {
    // Check if app is installed
    this.state.isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                            (window.navigator as any).standalone === true

    // Check if app is in standalone mode
    this.state.isStandalone = window.matchMedia('(display-mode: standalone)').matches

    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      this.state.installPrompt = e as PWAInstallPrompt
      this.state.isInstallable = true
      this.notifyListeners()
    })

    // Listen for appinstalled event
    window.addEventListener('appinstalled', () => {
      this.state.isInstalled = true
      this.state.isInstallable = false
      this.state.installPrompt = null
      this.notifyListeners()
    })

    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.state.isOnline = true
      this.notifyListeners()
    })

    window.addEventListener('offline', () => {
      this.state.isOnline = false
      this.notifyListeners()
    })

    // Check for service worker support
    if ('serviceWorker' in navigator) {
      this.registerServiceWorker()
    }
  }

  private async registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      console.log('Service Worker registered successfully:', registration)
      
      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available
              this.showUpdateNotification()
            }
          })
        }
      })
    } catch (error) {
      console.error('Service Worker registration failed:', error)
    }
  }

  private showUpdateNotification() {
    // Show update notification to user
    if (confirm('New version available! Would you like to update?')) {
      window.location.reload()
    }
  }

  async installApp(): Promise<boolean> {
    if (!this.state.installPrompt) {
      return false
    }

    try {
      await this.state.installPrompt.prompt()
      const choiceResult = await this.state.installPrompt.userChoice
      
      if (choiceResult.outcome === 'accepted') {
        this.state.isInstalled = true
        this.state.isInstallable = false
        this.state.installPrompt = null
        this.notifyListeners()
        return true
      }
      
      return false
    } catch (error) {
      console.error('Installation failed:', error)
      return false
    }
  }

  getState(): PWAState {
    return { ...this.state }
  }

  subscribe(listener: (state: PWAState) => void): () => void {
    this.listeners.push(listener)
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.getState()))
  }

  // Utility methods
  isSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window
  }

  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied'
    }

    if (Notification.permission === 'granted') {
      return 'granted'
    }

    if (Notification.permission === 'denied') {
      return 'denied'
    }

    const permission = await Notification.requestPermission()
    return permission
  }

  async subscribeToPushNotifications(): Promise<PushSubscription | null> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return null
    }

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
        )
      })

      // Send subscription to server
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
      })

      return subscription
    } catch (error) {
      console.error('Push subscription failed:', error)
      return null
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  async shareContent(data: ShareData): Promise<boolean> {
    if (!navigator.share) {
      return false
    }

    try {
      await navigator.share(data)
      return true
    } catch (error) {
      console.error('Sharing failed:', error)
      return false
    }
  }

  // Cache management
  async clearCache(): Promise<void> {
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames.map(name => caches.delete(name))
      )
    }
  }

  async getCacheSize(): Promise<number> {
    if (!('caches' in window)) return 0

    let totalSize = 0
    const cacheNames = await caches.keys()

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName)
      const keys = await cache.keys()
      
      for (const request of keys) {
        const response = await cache.match(request)
        if (response) {
          const blob = await response.blob()
          totalSize += blob.size
        }
      }
    }

    return totalSize
  }
}

// React hook for PWA functionality
export function usePWA() {
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isStandalone: false,
    isOnline: navigator.onLine,
    installPrompt: null
  })

  useEffect(() => {
    const pwaManager = PWAManager.getInstance()
    
    // Set initial state
    setState(pwaManager.getState())
    
    // Subscribe to state changes
    const unsubscribe = pwaManager.subscribe(setState)
    
    return unsubscribe
  }, [])

  const installApp = async () => {
    const pwaManager = PWAManager.getInstance()
    return await pwaManager.installApp()
  }

  const requestNotificationPermission = async () => {
    const pwaManager = PWAManager.getInstance()
    return await pwaManager.requestNotificationPermission()
  }

  const subscribeToPushNotifications = async () => {
    const pwaManager = PWAManager.getInstance()
    return await pwaManager.subscribeToPushNotifications()
  }

  const shareContent = async (data: ShareData) => {
    const pwaManager = PWAManager.getInstance()
    return await pwaManager.shareContent(data)
  }

  const clearCache = async () => {
    const pwaManager = PWAManager.getInstance()
    return await pwaManager.clearCache()
  }

  const getCacheSize = async () => {
    const pwaManager = PWAManager.getInstance()
    return await pwaManager.getCacheSize()
  }

  return {
    ...state,
    installApp,
    requestNotificationPermission,
    subscribeToPushNotifications,
    shareContent,
    clearCache,
    getCacheSize,
    isSupported: PWAManager.getInstance().isSupported()
  }
}

// PWA Install Button Component
interface PWAInstallButtonProps {
  className?: string
  children?: React.ReactNode
}

export function PWAInstallButton({ className = '', children }: PWAInstallButtonProps) {
  const { isInstallable, installApp } = usePWA()
  const [isInstalling, setIsInstalling] = useState(false)

  if (!isInstallable) {
    return null
  }

  const handleInstall = async () => {
    setIsInstalling(true)
    try {
      await installApp()
    } finally {
      setIsInstalling(false)
    }
  }

  return (
    <button
      onClick={handleInstall}
      disabled={isInstalling}
      className={`flex items-center px-4 py-2 text-sm font-medium text-white bg-amber-700 rounded-md hover:bg-amber-800 disabled:opacity-50 ${className}`}
    >
      {isInstalling ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          Installing...
        </>
      ) : (
        children || 'Install App'
      )}
    </button>
  )
}

// PWA Status Indicator
export function PWAStatusIndicator() {
  const { isOnline, isInstalled, isStandalone } = usePWA()

  return (
    <div className="flex items-center space-x-2">
      {!isOnline && (
        <div className="flex items-center text-red-600">
          <div className="w-2 h-2 bg-red-600 rounded-full mr-1"></div>
          <span className="text-xs">Offline</span>
        </div>
      )}
      
      {isInstalled && (
        <div className="flex items-center text-green-600">
          <div className="w-2 h-2 bg-green-600 rounded-full mr-1"></div>
          <span className="text-xs">Installed</span>
        </div>
      )}
      
      {isStandalone && (
        <div className="flex items-center text-blue-600">
          <div className="w-2 h-2 bg-amber-700 rounded-full mr-1"></div>
          <span className="text-xs">Standalone</span>
        </div>
      )}
    </div>
  )
}

export default PWAManager

