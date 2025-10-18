import { PrismaClient } from '../app/generated/prisma'

const prisma = new PrismaClient()

async function createDailyBillingRecords() {
  try {
    console.log('Creating daily billing records...')
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Get all active service subscriptions
    const subscriptions = await prisma.merchantServiceSubscription.findMany({
      where: {
        status: 'ACTIVE',
        startDate: { lte: today },
        OR: [
          { endDate: null },
          { endDate: { gte: today } }
        ]
      },
      include: {
        merchant: {
          select: {
            id: true,
            businessName: true
          }
        },
        service: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    console.log(`Found ${subscriptions.length} active subscriptions`)

    // Group subscriptions by merchant
    const merchantSubscriptions = subscriptions.reduce((acc, sub) => {
      if (!acc[sub.merchantId]) {
        acc[sub.merchantId] = []
      }
      acc[sub.merchantId].push(sub)
      return acc
    }, {} as Record<string, typeof subscriptions>)

    // Create billing records for each merchant
    const billingRecords = []
    for (const [merchantId, merchantSubs] of Object.entries(merchantSubscriptions)) {
      const totalAmount = merchantSubs.reduce((sum, sub) => {
        return sum + (Number(sub.priceAtSubscription) * sub.quantity)
      }, 0)

      if (totalAmount > 0) {
        // Check if billing record already exists for today
        const existingRecord = await prisma.billingRecord.findFirst({
          where: {
            merchantId,
            billingType: 'DAILY_SERVICE_FEE',
            dueDate: {
              gte: today,
              lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) // Next day
            }
          }
        })

        if (!existingRecord) {
          const billingRecord = await prisma.billingRecord.create({
            data: {
              merchantId,
              billingType: 'DAILY_SERVICE_FEE',
              description: `Daily service charges for ${today.toISOString().split('T')[0]}`,
              amount: totalAmount,
              dueDate: today,
              status: 'PENDING'
            }
          })

          billingRecords.push(billingRecord)
          console.log(`Created billing record for ${merchantSubs[0].merchant.businessName}: ₦${totalAmount}`)
        } else {
          console.log(`Billing record already exists for ${merchantSubs[0].merchant.businessName}`)
        }
      }
    }

    console.log(`✅ Created ${billingRecords.length} daily billing records`)
    
    // Display summary
    const totalAmount = billingRecords.reduce((sum, record) => sum + Number(record.amount), 0)
    console.log(`💰 Total daily charges: ₦${totalAmount}`)

  } catch (error) {
    console.error('❌ Error creating daily billing records:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createDailyBillingRecords()

