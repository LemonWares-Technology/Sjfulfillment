/**
 * Simple test script to verify email configuration
 * Usage: npx ts-node scripts/test-email-simple.ts
 */

import axios from 'axios'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function testEmail() {
  console.log('🧪 Testing email configuration...\n')

  // Check environment variables
  console.log('Environment variables:')
  console.log('- EMAIL_PROVIDER:', process.env.EMAIL_PROVIDER)
  console.log('- EMAIL_FROM:', process.env.EMAIL_FROM)
  console.log('- ZEPTOMAIL_API_KEY set:', !!process.env.ZEPTOMAIL_API_KEY)
  console.log('- ZEPTOMAIL_API_KEY length:', process.env.ZEPTOMAIL_API_KEY?.length)
  console.log('- ZEPTOMAIL_API_KEY prefix:', process.env.ZEPTOMAIL_API_KEY?.substring(0, 30) + '...')
  console.log()

  if (!process.env.ZEPTOMAIL_API_KEY) {
    console.error('❌ ZEPTOMAIL_API_KEY is not set!')
    process.exit(1)
  }

  const apiKey = process.env.ZEPTOMAIL_API_KEY.trim()
  const apiUrl = 'https://api.zeptomail.com/v1.1/email'
  const from = process.env.EMAIL_FROM || 'SJFulfillment <no-reply@sjfulfillment.com>'

  // Parse from field
  let fromEmail = from
  let fromName = 'SJFulfillment'
  const fromMatch = from.match(/^(.+?)\s*<([^>]+)>$/)
  if (fromMatch) {
    fromName = fromMatch[1].trim()
    fromEmail = fromMatch[2].trim()
  }

  console.log('Parsed FROM field:')
  console.log('- Name:', fromName)
  console.log('- Email:', fromEmail)
  console.log()

  // Prompt for test email address
  const testEmail = process.argv[2]
  if (!testEmail) {
    console.error('❌ Please provide a test email address as argument:')
    console.error('   npx ts-node scripts/test-email-simple.ts your@email.com')
    process.exit(1)
  }

  console.log('Sending test email to:', testEmail)
  console.log()

  const payload = {
    from: {
      address: fromEmail,
      name: fromName
    },
    to: [{
      email_address: {
        address: testEmail,
        name: testEmail.split('@')[0]
      }
    }],
    subject: 'Test Email from SJFulfillment',
    htmlbody: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
      </head>
      <body style="margin:0; padding:40px; background-color:#000000; font-family: Arial, sans-serif;">
        <div style="max-width:600px; margin:0 auto; background:rgba(255,255,255,0.1); backdrop-filter:blur(10px); border-radius:10px; padding:40px; color:#ffffff;">
          <h1 style="color:#f08c17; margin:0 0 20px;">✅ Email Test Successful!</h1>
          <p style="font-size:16px; line-height:1.6; margin:0 0 20px;">
            If you're seeing this email, your SJFulfillment email configuration is working correctly!
          </p>
          <div style="background:rgba(255,255,255,0.1); border-radius:5px; padding:20px; margin:20px 0;">
            <p style="margin:0; font-size:14px;"><strong>Test Details:</strong></p>
            <p style="margin:10px 0 0; font-size:14px;">Sent at: ${new Date().toISOString()}</p>
            <p style="margin:5px 0 0; font-size:14px;">From: ${fromName} &lt;${fromEmail}&gt;</p>
            <p style="margin:5px 0 0; font-size:14px;">To: ${testEmail}</p>
          </div>
          <p style="font-size:14px; color:rgba(255,255,255,0.7); margin:20px 0 0;">
            You can now use this email configuration for order notifications!
          </p>
        </div>
      </body>
      </html>
    `
  }

  try {
    console.log('📤 Sending request to ZeptoMail API...')
    const response = await axios.post(apiUrl, payload, {
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    })

    console.log()
    console.log('✅ SUCCESS!')
    console.log('Response status:', response.status)
    console.log('Response data:', JSON.stringify(response.data, null, 2))
    console.log()
    console.log('📬 Check your inbox at:', testEmail)
    console.log('   (It may take a few seconds to arrive)')
  } catch (error: any) {
    console.log()
    console.error('❌ FAILED!')
    console.error('Error:', error.message)
    
    if (error.response) {
      console.error('Status:', error.response.status)
      console.error('Status Text:', error.response.statusText)
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2))
      
      if (error.response.status === 401) {
        console.error()
        console.error('🔑 Authentication Error:')
        console.error('   Your ZEPTOMAIL_API_KEY may be incorrect or inactive.')
        console.error('   Check your ZeptoMail account at: https://www.zeptomail.com/')
      } else if (error.response.status === 403) {
        console.error()
        console.error('🚫 Forbidden Error:')
        console.error('   Your sender email domain may not be verified.')
        console.error('   Verify your domain in ZeptoMail console.')
      }
    } else if (error.code) {
      console.error('Error Code:', error.code)
      
      if (error.code === 'ECONNREFUSED') {
        console.error()
        console.error('🌐 Connection Error:')
        console.error('   Unable to reach ZeptoMail API.')
        console.error('   Check your internet connection.')
      } else if (error.code === 'ETIMEDOUT') {
        console.error()
        console.error('⏱️ Timeout Error:')
        console.error('   Request took too long.')
        console.error('   Try again or check your connection.')
      }
    }
    
    process.exit(1)
  }
}

testEmail()
