import { prisma } from '@/app/lib/prisma'

export interface PaymentStatus {
  hasActiveSubscription: boolean
  subscriptionStatus: string | null
  needsPayment: boolean
  lastPaymentDate: Date | null
  nextBillingDate: Date | null
  amountDue: number
}

export async function checkMerchantPaymentStatus(merchantId: string): Promise<PaymentStatus> {
  try {
    // Check if merchant has any active service subscriptions (cash-on-delivery model)
    const activeServiceSubscriptions = await prisma.merchantServiceSubscription.findMany({
      where: {
        merchantId,
        status: 'ACTIVE'
      },
      select: {
        id: true,
        status: true,
        startDate: true,
        endDate: true,
        priceAtSubscription: true,
        quantity: true
      }
    })

    // Check for pending daily billing records
    const pendingBillingRecords = await prisma.billingRecord.findMany({
      where: {
        merchantId,
        status: 'PENDING',
        billingType: 'DAILY_SERVICE_FEE'
      },
      select: {
        amount: true,
        dueDate: true
      },
      orderBy: { dueDate: 'asc' }
    })

    // Calculate total accumulated charges
    const totalAccumulatedCharges = pendingBillingRecords.reduce((sum, record) => {
      return sum + Number(record.amount)
    }, 0)

    // Calculate daily charges from active services
    const dailyCharges = activeServiceSubscriptions.reduce((sum, sub) => {
      return sum + (Number(sub.priceAtSubscription) * sub.quantity)
    }, 0)

    return {
      hasActiveSubscription: activeServiceSubscriptions.length > 0,
      subscriptionStatus: activeServiceSubscriptions.length > 0 ? 'ACTIVE' : null,
      needsPayment: totalAccumulatedCharges > 0, // Needs payment if there are accumulated charges
      lastPaymentDate: null, // No upfront payments in COD model
      nextBillingDate: pendingBillingRecords.length > 0 ? pendingBillingRecords[0].dueDate : null,
      amountDue: totalAccumulatedCharges
    }
  } catch (error) {
    console.error('Error checking payment status:', error)
    return {
      hasActiveSubscription: false,
      subscriptionStatus: null,
      needsPayment: false, // Don't block access in COD model
      lastPaymentDate: null,
      nextBillingDate: null,
      amountDue: 0
    }
  }
}

export function shouldBlockMerchantAccess(paymentStatus: PaymentStatus): boolean {
  // In cash-on-delivery model, don't block access based on payment status
  // Merchants can use services and pay when orders are delivered
  return false
}
