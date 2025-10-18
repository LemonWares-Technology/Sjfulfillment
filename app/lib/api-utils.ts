import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, JWTPayload } from './auth'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export function createResponse<T>(
  data: T,
  status: number = 200,
  message?: string
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message
    },
    { status }
  )
}

export function createErrorResponse(
  error: string,
  status: number = 400
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error
    },
    { status }
  )
}

export function withAuth(
  handler: (request: NextRequest, user: JWTPayload, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    const user = getCurrentUser(request)
    if (!user) {
      return createErrorResponse('Unauthorized', 401)
    }
    return handler(request, user, context)
  }
}

export function withRole(
  allowedRoles: string[],
  handler: (request: NextRequest, user: JWTPayload, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    const user = getCurrentUser(request)
    if (!user) {
      return createErrorResponse('Unauthorized', 401)
    }
    if (!allowedRoles.includes(user.role)) {
      return createErrorResponse('Forbidden', 403)
    }
    // Handle dynamic route parameters for Next.js 15
    if (context && typeof context === 'object' && 'params' in context) {
      context.params = await context.params
    }
    return handler(request, user, context)
  }
}
