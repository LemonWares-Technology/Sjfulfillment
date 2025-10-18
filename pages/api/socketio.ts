import { NextApiRequest, NextApiResponse } from 'next'
import { Server as NetServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'

export type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: NetServer & {
      io: SocketIOServer
    }
  }
}

const SocketHandler = (req: NextApiRequest, res: NextApiResponseServerIO) => {
  if (res.socket.server.io) {
    // Socket is already running
  } else {
    // Configure Socket.IO for Vercel's serverless environment
    const io = new SocketIOServer(res.socket.server, {
      path: '/api/socketio',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? process.env.NEXT_PUBLIC_APP_URL || "https://sjfulfillment.vercel.app"
          : ['http://localhost:3000', `http://localhost:${process.env.PORT || 3000}`],
        methods: ['GET', 'POST'],
        credentials: true
      },
      // Optimize for serverless deployment
      ...(process.env.NODE_ENV === 'production' && {
        transports: ['polling'], // Force polling in production
        allowEIO3: true, // Support Engine.IO v3 for compatibility
        pingTimeout: 60000,
        pingInterval: 25000
      })
    })
    res.socket.server.io = io

    io.on('connection', (socket) => {
      // Handle authentication
      socket.on('auth', (data) => {
        socket.emit('auth_success', { message: 'Authenticated successfully' })
      })

      // Handle order updates
      socket.on('order_update', (data) => {
        socket.broadcast.emit('order_update', {
          ...data,
          timestamp: new Date().toISOString()
        })
      })

      // Handle stock alerts
      socket.on('stock_alert', (data) => {
        socket.broadcast.emit('stock_alert', {
          ...data,
          timestamp: new Date().toISOString()
        })
      })

      // Handle payment notifications
      socket.on('payment_received', (data) => {
        socket.broadcast.emit('payment_received', {
          ...data,
          timestamp: new Date().toISOString()
        })
      })

      // Handle logistics updates
      socket.on('logistics_update', (data) => {
        socket.broadcast.emit('logistics_update', {
          ...data,
          timestamp: new Date().toISOString()
        })
      })

      // Handle warehouse alerts
      socket.on('warehouse_alert', (data) => {
        socket.broadcast.emit('warehouse_alert', {
          ...data,
          timestamp: new Date().toISOString()
        })
      })

      // Handle system notifications
      socket.on('system_notification', (data) => {
        socket.broadcast.emit('system_notification', {
          ...data,
          timestamp: new Date().toISOString()
        })
      })

      socket.on('disconnect', () => {
        // Client disconnected
      })
    })
  }
  res.end()
}

export default SocketHandler
