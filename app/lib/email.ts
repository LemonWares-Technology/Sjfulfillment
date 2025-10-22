// Email utility using ZeptoMail HTTP API
// Configure these env vars in your deployment:
// - EMAIL_PROVIDER=zeptomail
// - ZEPTOMAIL_API_KEY (required)
// - ZEPTOMAIL_API_URL (optional, defaults to ZeptoMail public API)
// - EMAIL_FROM: Sender, e.g. "SJFulfillment <no-reply@sjfulfillment.com>"
// - NEXT_PUBLIC_APP_URL or APP_BASE_URL: e.g. https://sjfulfillment.com

import axios from 'axios'

type SendEmailParams = {
  to: string | string[]
  subject: string
  html: string
}

// Nodemailer/SMTP removed — using ZeptoMail HTTP API exclusively.

// Send using ZeptoMail HTTP API
async function sendViaZeptoMail({ to, subject, html, from }: SendEmailParams & { from: string }) {
  const apiKey = process.env.ZEPTOMAIL_API_KEY?.trim()
  const apiUrl = process.env.ZEPTOMAIL_API_URL || 'https://api.zeptomail.com/v1.1/email'

  if (!apiKey) {
    throw new Error('ZeptoMail API key not set (ZEPTOMAIL_API_KEY)')
  }

  // Parse the from field: "Name <email@domain.com>" or just "email@domain.com"
  let fromEmail = from
  let fromName = 'SJFulfillment'
  const fromMatch = from.match(/^(.+?)\s*<([^>]+)>$/)
  if (fromMatch) {
    fromName = fromMatch[1].trim()
    fromEmail = fromMatch[2].trim()
  }

  // ZeptoMail API v1.1 requires this exact structure
  const recipients = Array.isArray(to) ? to : [to]
  const payload = {
    from: {
      address: fromEmail,
      name: fromName
    },
    to: recipients.map(email => ({
      email_address: {
        address: email,
        name: email.split('@')[0] // simple fallback name
      }
    })),
    subject,
    htmlbody: html
  }

  try {
    console.log('Sending email via ZeptoMail...', { 
      to: recipients, 
      subject, 
      from: fromEmail,
      fromName,
      apiUrl,
      apiKeyPrefix: apiKey.substring(0, 20) + '...' // Log prefix for debugging
    })
    
    const res = await axios.post(apiUrl, payload, {
      headers: {
        Authorization: apiKey, // ZeptoMail uses the key directly, not "Bearer"
        'Content-Type': 'application/json'
      },
      timeout: 15000
    })

    console.log('ZeptoMail response status:', res.status)
    return res.data
  } catch (err: any) {
    console.error('Error sending email via ZeptoMail:', err && err.response ? err.response.data || err.response.statusText : err.message || err)
    
    // Provide helpful error messages
    if (err?.response?.status === 401) {
      console.error('ZeptoMail 401: Check your ZEPTOMAIL_API_KEY is correct and active')
    } else if (err?.response?.status === 403) {
      console.error('ZeptoMail 403: Check your sender domain is verified in ZeptoMail console')
    }
    
    throw err
  }
}

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<void> {
  const from = process.env.EMAIL_FROM || 'SJFulfillment <no-reply@sjfulfillment.com>'
  // Use ZeptoMail exclusively
  await sendViaZeptoMail({ to, subject, html, from })
}

// Helper to create the email template wrapper with black background and glass effect
function createEmailTemplate(title: string, content: string): string {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
  </head>
  <body style="margin:0; padding:0; background-color:#000000; font-family: Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#000000;">
      <tr>
        <td align="center" style="padding:40px 20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; background:rgba(255,255,255,0.1); backdrop-filter:blur(10px); border-radius:5px; overflow:hidden;">
            <tr>
              <td align="center" style="padding:32px 24px 24px;">
                <img src="https://sjfulfillment.com/wp-content/uploads/2020/09/cropped-Main-Logo-white-886x.png" alt="SJFulfillment" height="60" style="max-width:150px; height:auto; display:block;"/>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;">
                ${content}
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px; background:rgba(0,0,0,0.3); text-align:center;">
                <p style="color:rgba(255,255,255,0.5); font-size:12px; margin:0;">© ${new Date().getFullYear()} SJFulfillment. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>`
}

export async function sendWelcomePartnerEmail(params: {
  to: string
  partnerName?: string
  companyName?: string
  email: string
  password: string
}): Promise<void> {
  const { to, partnerName, companyName, email, password } = params
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || 'http://localhost:3000'
  const loginUrl = `${baseUrl}/welcome`
  const displayName = partnerName || companyName || 'there'

  const content = `
    <h1 style="color:#f08c17; font-size:28px; font-weight:bold; margin:0 0 16px; text-align:center;">Welcome to SJFulfillment</h1>
    <p style="color:rgba(255,255,255,0.9); font-size:16px; line-height:1.6; margin:0 0 16px;">Hi ${escapeHtml(displayName)},</p>
    <p style="color:rgba(255,255,255,0.9); font-size:16px; line-height:1.6; margin:0 0 24px;">Your logistics partner account has been created successfully. Here are your login credentials:</p>
    <div style="background:rgba(255,255,255,0.2); border:1px solid rgba(255,255,255,0.3); border-radius:5px; padding:20px; margin:0 0 24px;">
      <p style="color:rgba(255,255,255,0.9); font-size:14px; margin:0 0 12px;">
        <strong style="color:#f08c17;">Email:</strong><br/>
        <span style="color:rgba(255,255,255,0.9);">${escapeHtml(email)}</span>
      </p>
      <p style="color:rgba(255,255,255,0.9); font-size:14px; margin:0;">
        <strong style="color:#f08c17;">Temporary Password:</strong><br/>
        <span style="color:rgba(255,255,255,0.9); font-family:monospace; background:rgba(0,0,0,0.3); padding:4px 8px; border-radius:3px; display:inline-block; margin-top:4px;">${escapeHtml(password)}</span>
      </p>
    </div>
    <p style="color:rgba(255,255,255,0.9); font-size:16px; line-height:1.6; margin:0 0 24px;">Click the button below to access your account:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" style="padding:0 0 24px;">
          <a href="${loginUrl}" style="display:inline-block; background:linear-gradient(to right, #f08c17, #ff9f3a); color:#ffffff; font-size:16px; font-weight:600; text-decoration:none; padding:14px 32px; border-radius:5px;">Sign In to Your Account</a>
        </td>
      </tr>
    </table>
    <p style="color:rgba(255,255,255,0.7); font-size:14px; line-height:1.6; margin:0 0 8px;">For security, we strongly recommend changing your password after your first login.</p>
    <p style="color:rgba(255,255,255,0.5); font-size:12px; line-height:1.5; margin:0; padding-top:16px; border-top:1px solid rgba(255,255,255,0.1);">If you didn't request this account, please ignore this email or contact support.</p>`

  const html = createEmailTemplate('Your SJFulfillment Logistics Partner Account', content)
  await sendEmail({ to, subject: 'Your SJFulfillment Logistics Partner Account', html })
}

export async function sendPasswordResetEmail(params: {
  to: string
  firstName?: string
  resetToken: string
}): Promise<void> {
  const { to, firstName, resetToken } = params
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || 'http://localhost:3000'
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`
  const displayName = firstName || 'there'

  const content = `
    <h1 style="color:#f08c17; font-size:28px; font-weight:bold; margin:0 0 16px; text-align:center;">Password Reset Request</h1>
    <p style="color:rgba(255,255,255,0.9); font-size:16px; line-height:1.6; margin:0 0 16px;">Hi ${escapeHtml(displayName)},</p>
    <p style="color:rgba(255,255,255,0.9); font-size:16px; line-height:1.6; margin:0 0 24px;">We received a request to reset your password. Click the button below to create a new password:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" style="padding:0 0 24px;">
          <a href="${resetUrl}" style="display:inline-block; background:linear-gradient(to right, #f08c17, #ff9f3a); color:#ffffff; font-size:16px; font-weight:600; text-decoration:none; padding:14px 32px; border-radius:5px;">Reset Your Password</a>
        </td>
      </tr>
    </table>
    <p style="color:rgba(255,255,255,0.7); font-size:14px; line-height:1.6; margin:0 0 16px;">This link will expire in 24 hours for security reasons.</p>
    <p style="color:rgba(255,255,255,0.7); font-size:14px; line-height:1.6; margin:0 0 8px;">If the button doesn't work, copy and paste this link into your browser:</p>
    <p style="color:rgba(255,255,255,0.6); font-size:12px; font-family:monospace; background:rgba(0,0,0,0.3); padding:8px; border-radius:3px; word-break:break-all; margin:0 0 24px;">${resetUrl}</p>
    <p style="color:rgba(255,255,255,0.5); font-size:12px; line-height:1.5; margin:0; padding-top:16px; border-top:1px solid rgba(255,255,255,0.1);">If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>`

  const html = createEmailTemplate('Reset Your Password', content)
  await sendEmail({ to, subject: 'Reset Your SJFulfillment Password', html })
}

export async function sendWelcomeMerchantEmail(params: {
  to: string
  businessName?: string
  firstName?: string
  email: string
}): Promise<void> {
  const { to, businessName, firstName, email } = params
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || 'http://localhost:3000'
  const loginUrl = `${baseUrl}/welcome`
  const displayName = businessName || firstName || 'there'

  const content = `
    <h1 style="color:#f08c17; font-size:28px; font-weight:bold; margin:0 0 16px; text-align:center;">Welcome to SJFulfillment</h1>
    <p style="color:rgba(255,255,255,0.9); font-size:16px; line-height:1.6; margin:0 0 16px;">Hi ${escapeHtml(displayName)},</p>
    <p style="color:rgba(255,255,255,0.9); font-size:16px; line-height:1.6; margin:0 0 24px;">Welcome to SJFulfillment! Your merchant account has been created successfully and is ready to use.</p>
    <div style="background:rgba(255,255,255,0.2); border:1px solid rgba(255,255,255,0.3); border-radius:5px; padding:20px; margin:0 0 24px;">
      <p style="color:rgba(255,255,255,0.9); font-size:14px; margin:0;">
        <strong style="color:#f08c17;">Your Account Email:</strong><br/>
        <span style="color:rgba(255,255,255,0.9);">${escapeHtml(email)}</span>
      </p>
    </div>
    <p style="color:rgba(255,255,255,0.9); font-size:16px; line-height:1.6; margin:0 0 24px;">You can now sign in with the credentials you provided during registration. Click the button below to get started:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" style="padding:0 0 24px;">
          <a href="${loginUrl}" style="display:inline-block; background:linear-gradient(to right, #f08c17, #ff9f3a); color:#ffffff; font-size:16px; font-weight:600; text-decoration:none; padding:14px 32px; border-radius:5px;">Sign In to Your Dashboard</a>
        </td>
      </tr>
    </table>
    <p style="color:rgba(255,255,255,0.7); font-size:14px; line-height:1.6; margin:0 0 8px;">Next steps:</p>
    <ul style="color:rgba(255,255,255,0.7); font-size:14px; line-height:1.8; margin:0 0 16px; padding-left:20px;">
      <li>Complete your merchant profile</li>
      <li>Select a service plan that fits your needs</li>
      <li>Set up your first products and warehouses</li>
      <li>Start managing your fulfillment operations</li>
    </ul>
    <p style="color:rgba(255,255,255,0.5); font-size:12px; line-height:1.5; margin:0; padding-top:16px; border-top:1px solid rgba(255,255,255,0.1);">If you didn't create this account, please contact our support team immediately.</p>`

  const html = createEmailTemplate('Your SJFulfillment Merchant Account', content)
  await sendEmail({ to, subject: 'Welcome to SJFulfillment - Your Merchant Account', html })
}

export async function sendWelcomeStaffEmail(params: {
  to: string
  firstName?: string
  role?: string
  email: string
  password: string
}): Promise<void> {
  const { to, firstName, role, email, password } = params
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || 'http://localhost:3000'
  const loginUrl = `${baseUrl}/welcome`
  const displayName = firstName || 'there'
  const roleDisplay = role ? role.replace(/_/g, ' ').toLowerCase() : 'staff member'

  const content = `
    <h1 style="color:#f08c17; font-size:28px; font-weight:bold; margin:0 0 16px; text-align:center;">Welcome to the Team</h1>
    <p style="color:rgba(255,255,255,0.9); font-size:16px; line-height:1.6; margin:0 0 16px;">Hi ${escapeHtml(displayName)},</p>
    <p style="color:rgba(255,255,255,0.9); font-size:16px; line-height:1.6; margin:0 0 24px;">Your ${roleDisplay} account has been created. Here are your login credentials:</p>
    <div style="background:rgba(255,255,255,0.2); border:1px solid rgba(255,255,255,0.3); border-radius:5px; padding:20px; margin:0 0 24px;">
      <p style="color:rgba(255,255,255,0.9); font-size:14px; margin:0 0 12px;">
        <strong style="color:#f08c17;">Email:</strong><br/>
        <span style="color:rgba(255,255,255,0.9);">${escapeHtml(email)}</span>
      </p>
      <p style="color:rgba(255,255,255,0.9); font-size:14px; margin:0;">
        <strong style="color:#f08c17;">Temporary Password:</strong><br/>
        <span style="color:rgba(255,255,255,0.9); font-family:monospace; background:rgba(0,0,0,0.3); padding:4px 8px; border-radius:3px; display:inline-block; margin-top:4px;">${escapeHtml(password)}</span>
      </p>
    </div>
    <p style="color:rgba(255,255,255,0.9); font-size:16px; line-height:1.6; margin:0 0 24px;">Click the button below to access your account:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" style="padding:0 0 24px;">
          <a href="${loginUrl}" style="display:inline-block; background:linear-gradient(to right, #f08c17, #ff9f3a); color:#ffffff; font-size:16px; font-weight:600; text-decoration:none; padding:14px 32px; border-radius:5px;">Sign In Now</a>
        </td>
      </tr>
    </table>
    <p style="color:rgba(255,255,255,0.7); font-size:14px; line-height:1.6; margin:0 0 8px;">Please change your password after your first login for security.</p>
    <p style="color:rgba(255,255,255,0.5); font-size:12px; line-height:1.5; margin:0; padding-top:16px; border-top:1px solid rgba(255,255,255,0.1);">If you have any questions, contact your administrator.</p>`

  const html = createEmailTemplate('Your SJFulfillment Staff Account', content)
  await sendEmail({ to, subject: 'Your SJFulfillment Staff Account', html })
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
