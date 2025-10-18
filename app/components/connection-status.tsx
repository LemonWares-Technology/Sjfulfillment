'use client'

import { useWebSocket } from '@/app/lib/websocket-context'
import { 
  WifiIcon, 
  ExclamationTriangleIcon, 
  CheckCircleIcon,
  XCircleIcon 
} from '@heroicons/react/24/outline'

export default function ConnectionStatus() {
  const { connectionStatus, isConnected } = useWebSocket()

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />
      case 'connecting':
        return <WifiIcon className="h-4 w-4 text-yellow-500 animate-pulse" />
      case 'disconnected':
        return <XCircleIcon className="h-4 w-4 text-gray-400" />
      case 'error':
        return <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
      default:
        return <XCircleIcon className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected'
      case 'connecting':
        return 'Connecting...'
      case 'disconnected':
        return 'Disconnected'
      case 'error':
        return 'Connection Error'
      default:
        return 'Unknown'
    }
  }

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-600'
      case 'connecting':
        return 'text-yellow-600'
      case 'disconnected':
        return 'text-gray-500'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-gray-500'
    }
  }

  return (
    <div className="flex items-center space-x-1 text-xs">
      {getStatusIcon()}
      <span className={`${getStatusColor()} hidden sm:inline`}>
        {getStatusText()}
      </span>
    </div>
  )
}

