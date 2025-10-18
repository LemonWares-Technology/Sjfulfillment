import { WebSocketServer, WebSocket } from 'ws'
import { IncomingMessage } from 'http'
import { parse } from 'url'

interface WebSocketClient {
  id: string
  ws: WebSocket
  userId?: string
  role?: string
  merchantId?: string
  authenticated: boolean
  lastPing: number
}

interface WebSocketMessage {
  type: 'auth' | 'order_update' | 'stock_alert' | 'payment_received' | 'logistics_update' | 'warehouse_alert' | 'system_notification' | 'ping' | 'pong'
  data?: any
  timestamp?: string
  clientId?: string
}

class ProductionWebSocketServer {
  private wss: WebSocketServer | null = null
  private clients = new Map<string, WebSocketClient>()
  private heartbeatInterval: NodeJS.Timeout | null = null
  private readonly HEARTBEAT_INTERVAL = 30000 // 30 seconds
  private readonly PING_TIMEOUT = 60000 // 60 seconds

  constructor() {
    // Don't auto-initialize to avoid conflicts
    // this.initializeServer()
    // this.startHeartbeat()
  }

  private initializeServer() {
    if (this.wss) return

    this.wss = new WebSocketServer({ 
      port: 0, // Dynamic port assignment
      perMessageDeflate: {
        threshold: 1024,
        concurrencyLimit: 10,
        memLevel: 7
      },
      maxPayload: 16 * 1024 * 1024, // 16MB max payload
      skipUTF8Validation: false
    })

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const clientId = this.generateClientId()
      const client: WebSocketClient = {
        id: clientId,
        ws,
        authenticated: false,
        lastPing: Date.now()
      }

      this.clients.set(clientId, client)

      // Handle incoming messages
      ws.on('message', (data: Buffer) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString())
          this.handleMessage(clientId, message)
        } catch (error) {
          this.sendError(clientId, 'Invalid message format')
        }
      })

      // Handle connection close
      ws.on('close', (code: number, reason: Buffer) => {
        this.clients.delete(clientId)
        this.broadcastSystemMessage('client_disconnected', { clientId })
      })

      // Handle errors
      ws.on('error', (error: Error) => {
        this.clients.delete(clientId)
      })

      // Send welcome message
      this.sendMessage(clientId, {
        type: 'system_notification',
        data: {
          message: 'Connected to WebSocket server',
          clientId
        }
      })
    })

    this.wss.on('error', (error: Error) => {
      console.error('WebSocket server error:', error)
    })
  }

  private handleMessage(clientId: string, message: WebSocketMessage) {
    const client = this.clients.get(clientId)
    if (!client) return

    switch (message.type) {
      case 'auth':
        this.handleAuthentication(clientId, message.data)
        break
      
      case 'ping':
        client.lastPing = Date.now()
        this.sendMessage(clientId, { type: 'pong' })
        break
      
      case 'order_update':
      case 'stock_alert':
      case 'payment_received':
      case 'logistics_update':
      case 'warehouse_alert':
      case 'system_notification':
        if (client.authenticated) {
          this.broadcastMessage(message.type, message.data, clientId)
        }
        break
      
      default:
        this.sendError(clientId, 'Unknown message type')
    }
  }

  private handleAuthentication(clientId: string, authData: any) {
    const client = this.clients.get(clientId)
    if (!client) return

    try {
      // In production, validate JWT token here
      const { token, userId, role, merchantId } = authData
      
      if (token && userId) {
        client.userId = userId
        client.role = role
        client.merchantId = merchantId
        client.authenticated = true

        this.sendMessage(clientId, {
          type: 'auth_success',
          data: {
            message: 'Authentication successful',
            userId,
            role,
            merchantId
          }
        })

        // Notify other clients about new authenticated user
        this.broadcastSystemMessage('user_authenticated', {
          userId,
          role,
          merchantId
        })
      } else {
        this.sendError(clientId, 'Invalid authentication data')
      }
    } catch (error) {
      this.sendError(clientId, 'Authentication failed')
    }
  }

  private broadcastMessage(type: string, data: any, senderId?: string) {
    const message: WebSocketMessage = {
      type: type as any,
      data,
      timestamp: new Date().toISOString()
    }

    this.clients.forEach((client, clientId) => {
      if (clientId !== senderId && client.authenticated && client.ws.readyState === WebSocket.OPEN) {
        this.sendMessage(clientId, message)
      }
    })
  }

  private broadcastSystemMessage(type: string, data: any) {
    this.broadcastMessage(type, data)
  }

  private sendMessage(clientId: string, message: WebSocketMessage) {
    const client = this.clients.get(clientId)
    if (client && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message))
      } catch (error) {
        this.clients.delete(clientId)
      }
    }
  }

  private sendError(clientId: string, errorMessage: string) {
    this.sendMessage(clientId, {
      type: 'system_notification',
      data: {
        type: 'error',
        message: errorMessage
      }
    })
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now()
      
      this.clients.forEach((client, clientId) => {
        if (now - client.lastPing > this.PING_TIMEOUT) {
          // Client hasn't pinged in time, disconnect
          client.ws.close(1000, 'Ping timeout')
          this.clients.delete(clientId)
        } else {
          // Send ping to client
          this.sendMessage(clientId, { type: 'ping' })
        }
      })
    }, this.HEARTBEAT_INTERVAL)
  }

  private generateClientId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
  }

  public getStats() {
    return {
      connectedClients: this.clients.size,
      authenticatedClients: Array.from(this.clients.values()).filter(c => c.authenticated).length,
      serverPort: this.wss?.options.port || 'dynamic'
    }
  }

  public broadcastToRole(role: string, type: string, data: any) {
    this.clients.forEach((client, clientId) => {
      if (client.authenticated && client.role === role && client.ws.readyState === WebSocket.OPEN) {
        this.sendMessage(clientId, {
          type: type as any,
          data,
          timestamp: new Date().toISOString()
        })
      }
    })
  }

  public broadcastToMerchant(merchantId: string, type: string, data: any) {
    this.clients.forEach((client, clientId) => {
      if (client.authenticated && client.merchantId === merchantId && client.ws.readyState === WebSocket.OPEN) {
        this.sendMessage(clientId, {
          type: type as any,
          data,
          timestamp: new Date().toISOString()
        })
      }
    })
  }

  public destroy() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }
    
    this.clients.forEach((client) => {
      client.ws.close(1000, 'Server shutting down')
    })
    
    this.clients.clear()
    
    if (this.wss) {
      this.wss.close()
      this.wss = null
    }
  }
}

// Export singleton instance
export const webSocketServer = new ProductionWebSocketServer()
export default webSocketServer
