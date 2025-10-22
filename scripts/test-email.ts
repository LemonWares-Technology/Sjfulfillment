/**
 * Test script to verify email functionality
 * Run with: npx tsx scripts/test-email.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env file
config({ path: resolve(process.cwd(), '.env') })

import { sendEmail } from '../app/lib/email'

async function testEmailSending() {
  try {
    console.log('🚀 Starting email test...')
    console.log('Environment check:')
    console.log('- EMAIL_PROVIDER:', process.env.EMAIL_PROVIDER)
    console.log('- EMAIL_FROM:', process.env.EMAIL_FROM)
    console.log('- ZEPTOMAIL_API_KEY:', process.env.ZEPTOMAIL_API_KEY ? 'Set (length: ' + process.env.ZEPTOMAIL_API_KEY.length + ')' : 'NOT SET')
    console.log('- NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL)
    console.log('')

    // Test email
    const testEmail = 'testusercodefromtheslum@gmail.com' // Change this to your email for testing
    
    console.log(`📧 Sending test email to: ${testEmail}`)
    
    await sendEmail({
      to: testEmail,
      subject: 'Test Email from SJFulfillment',
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h1 style="color: #f08c17;">Test Email</h1>
            <p>This is a test email from SJFulfillment.</p>
            <p>If you received this, the email system is working correctly!</p>
            <p>Timestamp: ${new Date().toISOString()}</p>
          </body>
        </html>
      `
    })

    console.log('✅ Test email sent successfully!')
    console.log('')
    console.log('If you did not receive the email, check:')
    console.log('1. Your ZEPTOMAIL_API_KEY is correct')
    console.log('2. Your sender domain (sjfulfillment.com) is verified in ZeptoMail')
    console.log('3. The recipient email is valid')
    console.log('4. Check spam/junk folder')
    
  } catch (error) {
    console.error('❌ Test failed!')
    console.error('Error details:', error)
    
    if (error instanceof Error) {
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    
    process.exit(1)
  }
}

// Run the test
testEmailSending()
  .then(() => {
    console.log('\n✅ Email test completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Email test failed:', error)
    process.exit(1)
  })
