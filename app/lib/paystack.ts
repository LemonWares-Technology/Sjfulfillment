// Paystack integration utilities
export interface PaystackConfig {
  publicKey: string
  email: string
  amount: number
  currency?: string
  reference?: string
  callback?: string
  metadata?: Record<string, any>
}

export interface PaystackResponse {
  status: boolean
  message: string
  data: {
    authorization_url: string
    access_code: string
    reference: string
  }
}

// Initialize Paystack payment
export async function initializePaystackPayment(config: PaystackConfig): Promise<PaystackResponse> {
  const response = await fetch('/api/payments/paystack/initialize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  })

  if (!response.ok) {
    throw new Error('Failed to initialize payment')
  }

  return response.json()
}

// Verify Paystack payment
export async function verifyPaystackPayment(reference: string): Promise<any> {
  const response = await fetch(`/api/payments/paystack/verify?reference=${reference}`, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error('Failed to verify payment')
  }

  return response.json()
}

// Generate payment reference
export function generatePaymentReference(): string {
  return `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Format amount for Paystack (convert to kobo)
export function formatAmountForPaystack(amount: number): number {
  return Math.round(amount * 100) // Convert to kobo
}
