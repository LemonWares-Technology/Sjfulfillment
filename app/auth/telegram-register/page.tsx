'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/lib/auth-context'
import { useApi } from '@/app/lib/use-api'
import { useRouter } from 'next/navigation'
import { 
  ChatBubbleLeftRightIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline'

export default function TelegramRegisterPage() {
  const { user } = useAuth()
  const { get, post, loading } = useApi()
  const router = useRouter()
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected' | 'error'>('checking')
  const [telegramData, setTelegramData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [botInfo, setBotInfo] = useState<any>(null)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    checkTelegramStatus()
    getBotInfo()
  }, [user])

  const checkTelegramStatus = async () => {
    try {
      const response = await get('/api/telegram/auth/status')
      if (response?.success) {
        setTelegramData(response)
        setStatus(response.connected ? 'connected' : 'disconnected')
      } else {
        setStatus('error')
        setError('Failed to check Telegram status')
      }
    } catch (error: any) {
      console.error('Error checking Telegram status:', error)
      setStatus('error')
      setError(error.message || 'Failed to check Telegram status')
    }
  }

  const getBotInfo = async () => {
    try {
      const response = await get('/api/messaging/telegram?action=info')
      if (response?.success && response.botInfo) {
        setBotInfo(response.botInfo.result)
      }
    } catch (error) {
      console.error('Error getting bot info:', error)
    }
  }

  const handleConnect = async () => {
    try {
      setError(null)
      // For now, we'll use a simple approach
      // In a real implementation, you'd generate a unique code
      const telegramId = prompt('Enter your Telegram ID (you can get this from @userinfobot on Telegram):')
      
      if (!telegramId) {
        return
      }

      const response = await post('/api/telegram/auth/connect', {
        telegramId: parseInt(telegramId)
      })

      if (response?.success) {
        setStatus('connected')
        setTelegramData(response.user)
      } else {
        setError(response?.error || 'Failed to connect Telegram account')
      }
    } catch (error: any) {
      console.error('Error connecting Telegram:', error)
      setError(error.message || 'Failed to connect Telegram account')
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your Telegram account?')) {
      return
    }

    try {
      setError(null)
      const response = await post('/api/telegram/auth/connect', {}, 'DELETE')

      if (response?.success) {
        setStatus('disconnected')
        setTelegramData(null)
      } else {
        setError(response?.error || 'Failed to disconnect Telegram account')
      }
    } catch (error: any) {
      console.error('Error disconnecting Telegram:', error)
      setError(error.message || 'Failed to disconnect Telegram account')
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'checking':
        return <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      case 'connected':
        return <CheckCircleIcon className="h-8 w-8 text-green-600" />
      case 'disconnected':
        return <XCircleIcon className="h-8 w-8 text-gray-400" />
      case 'error':
        return <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'checking':
        return 'Checking Telegram connection...'
      case 'connected':
        return 'Telegram Connected'
      case 'disconnected':
        return 'Telegram Not Connected'
      case 'error':
        return 'Connection Error'
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'text-green-600'
      case 'disconnected':
        return 'text-gray-500'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-blue-600'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <ChatBubbleLeftRightIcon className="h-12 w-12 text-blue-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Telegram Integration
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Connect your Telegram account to receive notifications and messages
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Status Section */}
          <div className="mb-6">
            <div className="flex items-center justify-center mb-4">
              {getStatusIcon()}
            </div>
            <h3 className={`text-center text-lg font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </h3>
          </div>

          {/* Bot Info */}
          {botInfo && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Bot Information</h4>
              <p className="text-sm text-blue-800">
                <strong>Bot Name:</strong> {botInfo.first_name}
              </p>
              <p className="text-sm text-blue-800">
                <strong>Username:</strong> @{botInfo.username}
              </p>
            </div>
          )}

          {/* Connected State */}
          {status === 'connected' && telegramData && (
            <div className="mb-6">
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <h4 className="text-sm font-medium text-green-900 mb-2">Connected Account</h4>
                <p className="text-sm text-green-800">
                  <strong>Telegram ID:</strong> {telegramData.telegramId}
                </p>
                <p className="text-sm text-green-800">
                  <strong>Subscribed:</strong> {telegramData.subscribed ? 'Yes' : 'No'}
                </p>
                {telegramData.lastActive && (
                  <p className="text-sm text-green-800">
                    <strong>Last Active:</strong> {new Date(telegramData.lastActive).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Instructions */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-2">How to Connect</h4>
            <ol className="text-sm text-gray-600 space-y-1">
              <li>1. Open Telegram on your phone or computer</li>
              <li>2. Search for @userinfobot and send /start</li>
              <li>3. Copy your Telegram ID from the bot's response</li>
              <li>4. Click "Connect Telegram" below and enter your ID</li>
              <li>5. You'll receive a welcome message confirming the connection</li>
            </ol>
          </div>

          {/* Features */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-2">What You'll Receive</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Order status updates</li>
              <li>• Inventory alerts</li>
              <li>• System notifications</li>
              <li>• Direct messages from support</li>
              <li>• Business communications</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {status === 'disconnected' && (
              <button
                onClick={handleConnect}
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Connecting...' : 'Connect Telegram'}
              </button>
            )}

            {status === 'connected' && (
              <button
                onClick={handleDisconnect}
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Disconnecting...' : 'Disconnect Telegram'}
              </button>
            )}

            <button
              onClick={() => router.push('/settings')}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Back to Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
