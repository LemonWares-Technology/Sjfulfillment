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

    console.log('✅ ZeptoMail response status:', res.status)
    console.log('✅ Email sent successfully')
    return res.data
  } catch (err: any) {
    console.error('❌ Error sending email via ZeptoMail:', {
      status: err?.response?.status,
      statusText: err?.response?.statusText,
      data: err?.response?.data,
      message: err?.message,
      code: err?.code
    })
    
    // Provide helpful error messages
    if (err?.response?.status === 401) {
      console.error('ZeptoMail 401: Check your ZEPTOMAIL_API_KEY is correct and active')
    } else if (err?.response?.status === 403) {
      console.error('ZeptoMail 403: Check your sender domain is verified in ZeptoMail console')
    } else if (err?.code === 'ECONNREFUSED') {
      console.error('Connection refused: Unable to reach ZeptoMail API')
    } else if (err?.code === 'ETIMEDOUT') {
      console.error('Connection timeout: ZeptoMail API did not respond in time')
    }
    
    throw err
  }
}

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<void> {
  // Log environment variables for debugging
  console.log('📧 sendEmail called with environment check:', {
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
    EMAIL_FROM: process.env.EMAIL_FROM,
    ZEPTOMAIL_API_KEY_SET: !!process.env.ZEPTOMAIL_API_KEY,
    ZEPTOMAIL_API_KEY_LENGTH: process.env.ZEPTOMAIL_API_KEY?.length,
    to,
    subject
  })

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

export async function sendOrderConfirmationEmail(params: {
  to: string
  customerName: string
  orderNumber: string
  orderItems: Array<{
    productName: string
    sku: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }>
  orderValue: number
  deliveryFee: number
  totalAmount: number
  status: string
  shippingAddress: string
  merchantName: string
  merchantBusinessName: string
  merchantAddress?: string
  merchantPhone?: string
  merchantEmail?: string
  paymentMethod?: string
  createdAt: Date
  orderId: string
}): Promise<void> {
  const {
    to,
    customerName,
    orderNumber,
    orderItems,
    orderValue,
    deliveryFee,
    totalAmount,
    status,
    shippingAddress,
    merchantName,
    merchantBusinessName,
    merchantAddress,
    merchantPhone,
    merchantEmail,
    paymentMethod,
    createdAt,
    orderId
  } = params

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount)
  }

  // Format date
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  // Format status for display
  const formatStatus = (status: string) => {
    const statusColors: { [key: string]: string } = {
      'PENDING': '#fbbf24',
      'CONFIRMED': '#3b82f6',
      'PROCESSING': '#8b5cf6',
      'READY_FOR_DISPATCH': '#f59e0b',
      'IN_TRANSIT': '#6366f1',
      'DELIVERED': '#10b981',
      'CANCELLED': '#ef4444',
      'RETURNED': '#64748b'
    }
    
    const color = statusColors[status] || '#f08c17'
    const displayStatus = status.replace(/_/g, ' ')
    
    return `<span style="display:inline-block; background:${color}; color:#ffffff; font-size:12px; font-weight:600; padding:6px 12px; border-radius:5px; text-transform:uppercase;">${displayStatus}</span>`
  }

  // Build order items table
  const orderItemsHtml = orderItems.map(item => `
    <tr>
      <td style="padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.1);">
        <div style="color:rgba(255,255,255,0.9); font-size:14px; font-weight:600; margin-bottom:4px;">${escapeHtml(item.productName)}</div>
        <div style="color:rgba(255,255,255,0.6); font-size:12px;">SKU: ${escapeHtml(item.sku)}</div>
      </td>
      <td style="padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.1); text-align:center; color:rgba(255,255,255,0.9); font-size:14px;">
        ${item.quantity}
      </td>
      <td style="padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.1); text-align:right; color:rgba(255,255,255,0.9); font-size:14px;">
        ${formatCurrency(item.unitPrice)}
      </td>
      <td style="padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.1); text-align:right; color:rgba(255,255,255,0.9); font-size:14px; font-weight:600;">
        ${formatCurrency(item.totalPrice)}
      </td>
    </tr>
  `).join('')

  const content = `
    <h1 style="color:#f08c17; font-size:28px; font-weight:bold; margin:0 0 16px; text-align:center;">Order Confirmation</h1>
    <p style="color:rgba(255,255,255,0.9); font-size:16px; line-height:1.6; margin:0 0 16px;">Hi ${escapeHtml(customerName)},</p>
    <p style="color:rgba(255,255,255,0.9); font-size:16px; line-height:1.6; margin:0 0 24px;">Thank you for your order! ${escapeHtml(merchantBusinessName)} has created an order for you through SJFulfillment. Here are your order details:</p>
    
    <!-- Order Summary Card -->
    <div style="background:rgba(255,255,255,0.2); border:1px solid rgba(255,255,255,0.3); border-radius:5px; padding:20px; margin:0 0 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding-bottom:12px;">
            <span style="color:rgba(255,255,255,0.7); font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">Order Number</span><br/>
            <span style="color:#f08c17; font-size:18px; font-weight:bold; font-family:monospace;">${escapeHtml(orderNumber)}</span>
          </td>
          <td style="padding-bottom:12px; text-align:right;">
            <span style="color:rgba(255,255,255,0.7); font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">Status</span><br/>
            ${formatStatus(status)}
          </td>
        </tr>
        <tr>
          <td colspan="2" style="padding-top:12px; border-top:1px solid rgba(255,255,255,0.1);">
            <span style="color:rgba(255,255,255,0.7); font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">Order Date</span><br/>
            <span style="color:rgba(255,255,255,0.9); font-size:14px;">${formatDate(createdAt)}</span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Merchant Info -->
    <div style="background:rgba(255,255,255,0.15); border-left:4px solid #f08c17; padding:16px; margin:0 0 24px; border-radius:3px;">
      <p style="color:rgba(255,255,255,0.7); font-size:12px; text-transform:uppercase; letter-spacing:0.5px; margin:0 0 8px;">Merchant</p>
      <p style="color:rgba(255,255,255,0.9); font-size:16px; font-weight:600; margin:0;">${escapeHtml(merchantBusinessName)}</p>
    </div>

    <!-- Order Items -->
    <h2 style="color:#f08c17; font-size:20px; font-weight:600; margin:0 0 16px;">Order Items</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
      <thead>
        <tr>
          <th style="padding:12px 0; border-bottom:2px solid rgba(255,255,255,0.2); color:rgba(255,255,255,0.7); font-size:12px; text-transform:uppercase; letter-spacing:0.5px; text-align:left;">Product</th>
          <th style="padding:12px 0; border-bottom:2px solid rgba(255,255,255,0.2); color:rgba(255,255,255,0.7); font-size:12px; text-transform:uppercase; letter-spacing:0.5px; text-align:center;">Qty</th>
          <th style="padding:12px 0; border-bottom:2px solid rgba(255,255,255,0.2); color:rgba(255,255,255,0.7); font-size:12px; text-transform:uppercase; letter-spacing:0.5px; text-align:right;">Price</th>
          <th style="padding:12px 0; border-bottom:2px solid rgba(255,255,255,0.2); color:rgba(255,255,255,0.7); font-size:12px; text-transform:uppercase; letter-spacing:0.5px; text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${orderItemsHtml}
      </tbody>
    </table>

    <!-- Order Totals -->
    <div style="background:rgba(255,255,255,0.2); border:1px solid rgba(255,255,255,0.3); border-radius:5px; padding:20px; margin:0 0 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding:8px 0; color:rgba(255,255,255,0.9); font-size:14px;">Subtotal:</td>
          <td style="padding:8px 0; text-align:right; color:rgba(255,255,255,0.9); font-size:14px;">${formatCurrency(orderValue)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0; color:rgba(255,255,255,0.9); font-size:14px;">Delivery Fee:</td>
          <td style="padding:8px 0; text-align:right; color:rgba(255,255,255,0.9); font-size:14px;">${formatCurrency(deliveryFee)}</td>
        </tr>
        <tr>
          <td style="padding:12px 0 0; border-top:2px solid rgba(255,255,255,0.3); color:#f08c17; font-size:18px; font-weight:bold;">Total:</td>
          <td style="padding:12px 0 0; border-top:2px solid rgba(255,255,255,0.3); text-align:right; color:#f08c17; font-size:18px; font-weight:bold;">${formatCurrency(totalAmount)}</td>
        </tr>
      </table>
    </div>

    <!-- Shipping Address -->
    <h2 style="color:#f08c17; font-size:20px; font-weight:600; margin:0 0 16px;">Shipping Address</h2>
    <div style="background:rgba(255,255,255,0.15); border-radius:5px; padding:16px; margin:0 0 24px;">
      <p style="color:rgba(255,255,255,0.9); font-size:14px; line-height:1.6; margin:0;">${escapeHtml(shippingAddress).replace(/\n/g, '<br/>')}</p>
    </div>

    ${paymentMethod ? `
    <!-- Payment Method -->
    <div style="background:rgba(255,255,255,0.15); border-radius:5px; padding:16px; margin:0 0 24px;">
      <span style="color:rgba(255,255,255,0.7); font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">Payment Method</span><br/>
      <span style="color:rgba(255,255,255,0.9); font-size:14px; font-weight:600;">${escapeHtml(paymentMethod.replace(/_/g, ' '))}</span>
    </div>
    ` : ''}

    <!-- Merchant Contact Information -->
    <h2 style="color:#f08c17; font-size:20px; font-weight:600; margin:24px 0 16px;">Merchant Information</h2>
    <div style="background:rgba(255,255,255,0.15); border-radius:5px; padding:16px; margin:0 0 24px;">
      <p style="color:rgba(255,255,255,0.9); font-size:16px; font-weight:600; margin:0 0 12px;">${escapeHtml(merchantBusinessName)}</p>
      ${merchantAddress ? `<p style="color:rgba(255,255,255,0.8); font-size:14px; margin:0 0 8px;">📍 ${escapeHtml(merchantAddress)}</p>` : ''}
      ${merchantPhone ? `<p style="color:rgba(255,255,255,0.8); font-size:14px; margin:0 0 8px;">📞 ${escapeHtml(merchantPhone)}</p>` : ''}
      ${merchantEmail ? `<p style="color:rgba(255,255,255,0.8); font-size:14px; margin:0;">✉️ ${escapeHtml(merchantEmail)}</p>` : ''}
    </div>

    <!-- Track Order Button -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
      <tr>
        <td align="center">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://portal.sjfulfillment.com'}/track?orderId=${orderId}" style="display:inline-block; background:linear-gradient(to right, #f08c17, #ff9f3a); color:#ffffff; font-size:16px; font-weight:600; text-decoration:none; padding:14px 32px; border-radius:5px; margin:0 auto;">Track Your Order</a>
        </td>
      </tr>
    </table>

    <p style="color:rgba(255,255,255,0.9); font-size:14px; line-height:1.6; margin:16px 0;">You will receive email updates as your order status changes. If you have any questions about your order, please contact ${escapeHtml(merchantBusinessName)} using the information above.</p>
    <p style="color:rgba(255,255,255,0.5); font-size:12px; line-height:1.5; margin:0; padding-top:16px; border-top:1px solid rgba(255,255,255,0.1);">This is an automated confirmation email. Please do not reply to this email.</p>`

  const html = createEmailTemplate('Order Confirmation', content)
  await sendEmail({ to, subject: `Order Confirmation - ${orderNumber}`, html })
}

export async function sendOrderStatusUpdateEmail(params: {
  to: string
  customerName: string
  orderNumber: string
  newStatus: string
  merchantBusinessName: string
  merchantAddress?: string
  merchantPhone?: string
  merchantEmail?: string
  trackingNumber?: string
  notes?: string
  updatedAt: Date
  orderId: string
}): Promise<void> {
  const {
    to,
    customerName,
    orderNumber,
    newStatus,
    merchantBusinessName,
    merchantAddress,
    merchantPhone,
    merchantEmail,
    trackingNumber,
    notes,
    updatedAt,
    orderId
  } = params

  // Format date
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  // Format status for display
  const formatStatus = (status: string) => {
    const statusColors: { [key: string]: string } = {
      'PENDING': '#fbbf24',
      'CONFIRMED': '#3b82f6',
      'PROCESSING': '#8b5cf6',
      'READY_FOR_DISPATCH': '#f59e0b',
      'IN_TRANSIT': '#6366f1',
      'DELIVERED': '#10b981',
      'CANCELLED': '#ef4444',
      'RETURNED': '#64748b'
    }
    
    const color = statusColors[status] || '#f08c17'
    const displayStatus = status.replace(/_/g, ' ')
    
    return `<span style="display:inline-block; background:${color}; color:#ffffff; font-size:14px; font-weight:600; padding:8px 16px; border-radius:5px; text-transform:uppercase;">${displayStatus}</span>`
  }

  // Get status-specific message
  const getStatusMessage = (status: string) => {
    const messages: { [key: string]: { title: string; description: string } } = {
      'PENDING': {
        title: 'Order Received',
        description: 'Your order has been received and is being reviewed.'
      },
      'CONFIRMED': {
        title: 'Order Confirmed',
        description: 'Your order has been confirmed and will be processed soon.'
      },
      'PROCESSING': {
        title: 'Order Processing',
        description: 'Your order is currently being prepared for shipment.'
      },
      'READY_FOR_DISPATCH': {
        title: 'Ready for Dispatch',
        description: 'Your order has been packed and is ready for pickup by our delivery partner.'
      },
      'IN_TRANSIT': {
        title: 'Order in Transit',
        description: 'Your order is on its way to you!'
      },
      'DELIVERED': {
        title: 'Order Delivered',
        description: 'Your order has been successfully delivered. Thank you for your purchase!'
      },
      'CANCELLED': {
        title: 'Order Cancelled',
        description: 'Your order has been cancelled.'
      },
      'RETURNED': {
        title: 'Order Returned',
        description: 'Your order has been returned.'
      }
    }
    
    return messages[status] || { 
      title: 'Order Status Updated', 
      description: 'Your order status has been updated.' 
    }
  }

  const statusInfo = getStatusMessage(newStatus)

  const content = `
    <h1 style="color:#f08c17; font-size:28px; font-weight:bold; margin:0 0 16px; text-align:center;">Order Status Update</h1>
    <p style="color:rgba(255,255,255,0.9); font-size:16px; line-height:1.6; margin:0 0 16px;">Hi ${escapeHtml(customerName)},</p>
    <p style="color:rgba(255,255,255,0.9); font-size:16px; line-height:1.6; margin:0 0 24px;">There's an update on your order from ${escapeHtml(merchantBusinessName)}!</p>
    
    <!-- Status Update Card -->
    <div style="background:rgba(255,255,255,0.2); border:1px solid rgba(255,255,255,0.3); border-radius:5px; padding:24px; margin:0 0 24px; text-align:center;">
      <div style="margin-bottom:16px;">
        ${formatStatus(newStatus)}
      </div>
      <h2 style="color:#f08c17; font-size:24px; font-weight:bold; margin:0 0 12px;">${statusInfo.title}</h2>
      <p style="color:rgba(255,255,255,0.9); font-size:16px; line-height:1.6; margin:0;">${statusInfo.description}</p>
    </div>

    <!-- Order Info -->
    <div style="background:rgba(255,255,255,0.15); border-radius:5px; padding:20px; margin:0 0 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding-bottom:12px;">
            <span style="color:rgba(255,255,255,0.7); font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">Order Number</span><br/>
            <span style="color:#f08c17; font-size:16px; font-weight:bold; font-family:monospace;">${escapeHtml(orderNumber)}</span>
          </td>
        </tr>
        <tr>
          <td style="padding-top:12px; border-top:1px solid rgba(255,255,255,0.1);">
            <span style="color:rgba(255,255,255,0.7); font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">Last Updated</span><br/>
            <span style="color:rgba(255,255,255,0.9); font-size:14px;">${formatDate(updatedAt)}</span>
          </td>
        </tr>
      </table>
    </div>

    ${trackingNumber ? `
    <!-- Tracking Info -->
    <div style="background:linear-gradient(135deg, rgba(240,140,23,0.2), rgba(255,159,58,0.2)); border:2px solid #f08c17; border-radius:5px; padding:20px; margin:0 0 24px;">
      <h3 style="color:#f08c17; font-size:16px; font-weight:600; margin:0 0 12px; text-align:center;">Tracking Information</h3>
      <div style="text-align:center;">
        <span style="color:rgba(255,255,255,0.7); font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">Tracking Number</span><br/>
        <span style="color:#f08c17; font-size:20px; font-weight:bold; font-family:monospace; background:rgba(0,0,0,0.3); padding:8px 16px; border-radius:5px; display:inline-block; margin-top:8px;">${escapeHtml(trackingNumber)}</span>
      </div>
    </div>
    ` : ''}

    ${notes ? `
    <!-- Additional Notes -->
    <div style="background:rgba(255,255,255,0.15); border-left:4px solid #f08c17; padding:16px; margin:0 0 24px; border-radius:3px;">
      <p style="color:rgba(255,255,255,0.7); font-size:12px; text-transform:uppercase; letter-spacing:0.5px; margin:0 0 8px;">Additional Information</p>
      <p style="color:rgba(255,255,255,0.9); font-size:14px; line-height:1.6; margin:0;">${escapeHtml(notes)}</p>
    </div>
    ` : ''}

    <!-- Merchant Contact Information -->
    <h2 style="color:#f08c17; font-size:20px; font-weight:600; margin:24px 0 16px;">Merchant Information</h2>
    <div style="background:rgba(255,255,255,0.15); border-radius:5px; padding:16px; margin:0 0 24px;">
      <p style="color:rgba(255,255,255,0.9); font-size:16px; font-weight:600; margin:0 0 12px;">${escapeHtml(merchantBusinessName)}</p>
      ${merchantAddress ? `<p style="color:rgba(255,255,255,0.8); font-size:14px; margin:0 0 8px;">📍 ${escapeHtml(merchantAddress)}</p>` : ''}
      ${merchantPhone ? `<p style="color:rgba(255,255,255,0.8); font-size:14px; margin:0 0 8px;">📞 ${escapeHtml(merchantPhone)}</p>` : ''}
      ${merchantEmail ? `<p style="color:rgba(255,255,255,0.8); font-size:14px; margin:0;">✉️ ${escapeHtml(merchantEmail)}</p>` : ''}
    </div>

    <!-- Track Order Button -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
      <tr>
        <td align="center">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://portal.sjfulfillment.com'}/track?orderId=${orderId}" style="display:inline-block; background:linear-gradient(to right, #f08c17, #ff9f3a); color:#ffffff; font-size:16px; font-weight:600; text-decoration:none; padding:14px 32px; border-radius:5px; margin:0 auto;">Track Your Order</a>
        </td>
      </tr>
    </table>

    <p style="color:rgba(255,255,255,0.9); font-size:14px; line-height:1.6; margin:0 0 16px;">If you have any questions about your order, please contact ${escapeHtml(merchantBusinessName)} using the information above.</p>
    <p style="color:rgba(255,255,255,0.5); font-size:12px; line-height:1.5; margin:0; padding-top:16px; border-top:1px solid rgba(255,255,255,0.1);">This is an automated notification email. Please do not reply to this email.</p>`

  const html = createEmailTemplate('Order Status Update', content)
  await sendEmail({ to, subject: `Order Update: ${orderNumber} - ${statusInfo.title}`, html })
}

// Send order notification to merchant
export async function sendMerchantOrderNotificationEmail(params: {
  to: string
  merchantName: string
  orderNumber: string
  customerName: string
  customerEmail: string
  customerPhone: string
  orderItems: Array<{
    productName: string
    sku: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }>
  orderValue: number
  deliveryFee: number
  totalAmount: number
  shippingAddress: string
  paymentMethod?: string
  createdAt: Date
  orderId: string
}): Promise<void> {
  const {
    to,
    merchantName,
    orderNumber,
    customerName,
    customerEmail,
    customerPhone,
    orderItems,
    orderValue,
    deliveryFee,
    totalAmount,
    shippingAddress,
    paymentMethod,
    createdAt,
    orderId
  } = params

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount)
  }

  // Format date
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const content = `
    <h1 style="color:#f08c17; font-size:28px; font-weight:bold; margin:0 0 8px; text-align:center;">New Order Received!</h1>
    <p style="color:rgba(255,255,255,0.9); font-size:16px; line-height:1.6; margin:0 0 24px; text-align:center;">Hi ${escapeHtml(merchantName)}, you have received a new order.</p>

    <!-- Order Header -->
    <div style="background:linear-gradient(135deg, rgba(240,140,23,0.3), rgba(255,159,58,0.3)); border:2px solid #f08c17; border-radius:5px; padding:20px; margin:0 0 24px; text-align:center;">
      <span style="color:rgba(255,255,255,0.7); font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">Order Number</span><br/>
      <span style="color:#f08c17; font-size:24px; font-weight:bold; font-family:monospace;">${escapeHtml(orderNumber)}</span><br/>
      <span style="color:rgba(255,255,255,0.7); font-size:12px; margin-top:8px; display:inline-block;">${formatDate(createdAt)}</span>
    </div>

    <!-- Customer Information -->
    <h2 style="color:#f08c17; font-size:20px; font-weight:600; margin:0 0 16px;">Customer Information</h2>
    <div style="background:rgba(255,255,255,0.15); border-radius:5px; padding:16px; margin:0 0 24px;">
      <p style="color:rgba(255,255,255,0.9); font-size:14px; margin:0 0 8px;"><strong>Name:</strong> ${escapeHtml(customerName)}</p>
      <p style="color:rgba(255,255,255,0.9); font-size:14px; margin:0 0 8px;"><strong>Email:</strong> ${escapeHtml(customerEmail)}</p>
      <p style="color:rgba(255,255,255,0.9); font-size:14px; margin:0 0 8px;"><strong>Phone:</strong> ${escapeHtml(customerPhone)}</p>
      <p style="color:rgba(255,255,255,0.9); font-size:14px; margin:0;"><strong>Shipping Address:</strong><br/>${escapeHtml(shippingAddress).replace(/\n/g, '<br/>')}</p>
    </div>

    <!-- Order Items -->
    <h2 style="color:#f08c17; font-size:20px; font-weight:600; margin:0 0 16px;">Order Items</h2>
    <table role="presentation" width="100%" cellpadding="8" cellspacing="0" border="0" style="background:rgba(255,255,255,0.15); border-radius:5px; margin:0 0 16px;">
      <thead>
        <tr style="border-bottom:2px solid rgba(255,255,255,0.2);">
          <th style="color:rgba(255,255,255,0.7); font-size:12px; text-align:left; text-transform:uppercase; letter-spacing:0.5px; padding:12px 8px;">Product</th>
          <th style="color:rgba(255,255,255,0.7); font-size:12px; text-align:center; text-transform:uppercase; letter-spacing:0.5px; padding:12px 8px;">SKU</th>
          <th style="color:rgba(255,255,255,0.7); font-size:12px; text-align:center; text-transform:uppercase; letter-spacing:0.5px; padding:12px 8px;">Qty</th>
          <th style="color:rgba(255,255,255,0.7); font-size:12px; text-align:right; text-transform:uppercase; letter-spacing:0.5px; padding:12px 8px;">Unit Price</th>
          <th style="color:rgba(255,255,255,0.7); font-size:12px; text-align:right; text-transform:uppercase; letter-spacing:0.5px; padding:12px 8px;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${orderItems.map(item => `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.1);">
          <td style="color:rgba(255,255,255,0.9); font-size:14px; padding:12px 8px;">${escapeHtml(item.productName)}</td>
          <td style="color:rgba(255,255,255,0.7); font-size:12px; text-align:center; padding:12px 8px; font-family:monospace;">${escapeHtml(item.sku)}</td>
          <td style="color:rgba(255,255,255,0.9); font-size:14px; text-align:center; padding:12px 8px;">${item.quantity}</td>
          <td style="color:rgba(255,255,255,0.9); font-size:14px; text-align:right; padding:12px 8px;">${formatCurrency(item.unitPrice)}</td>
          <td style="color:rgba(255,255,255,0.9); font-size:14px; text-align:right; padding:12px 8px; font-weight:600;">${formatCurrency(item.totalPrice)}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- Order Summary -->
    <div style="background:rgba(255,255,255,0.15); border-radius:5px; padding:20px; margin:0 0 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="color:rgba(255,255,255,0.7); font-size:14px; padding:8px 0; text-align:right;">Subtotal:</td>
          <td style="color:rgba(255,255,255,0.9); font-size:14px; padding:8px 0 8px 20px; text-align:right; font-weight:600; width:120px;">${formatCurrency(orderValue)}</td>
        </tr>
        <tr>
          <td style="color:rgba(255,255,255,0.7); font-size:14px; padding:8px 0; text-align:right;">Delivery Fee:</td>
          <td style="color:rgba(255,255,255,0.9); font-size:14px; padding:8px 0 8px 20px; text-align:right; font-weight:600;">${formatCurrency(deliveryFee)}</td>
        </tr>
        <tr style="border-top:2px solid rgba(255,255,255,0.2);">
          <td style="color:rgba(255,255,255,0.9); font-size:18px; padding:16px 0 0; text-align:right; font-weight:bold;">Total:</td>
          <td style="color:#f08c17; font-size:20px; padding:16px 0 0 20px; text-align:right; font-weight:bold;">${formatCurrency(totalAmount)}</td>
        </tr>
      </table>
    </div>

    ${paymentMethod ? `
    <!-- Payment Method -->
    <div style="background:rgba(255,255,255,0.15); border-radius:5px; padding:16px; margin:0 0 24px;">
      <span style="color:rgba(255,255,255,0.7); font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">Payment Method</span><br/>
      <span style="color:rgba(255,255,255,0.9); font-size:14px; font-weight:600;">${escapeHtml(paymentMethod.replace(/_/g, ' '))}</span>
    </div>
    ` : ''}

    <!-- Action Buttons -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
      <tr>
        <td align="center">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://portal.sjfulfillment.com'}/orders/${orderId}" style="display:inline-block; background:linear-gradient(to right, #f08c17, #ff9f3a); color:#ffffff; font-size:16px; font-weight:600; text-decoration:none; padding:14px 32px; border-radius:5px; margin:0 auto;">View Order Details</a>
        </td>
      </tr>
    </table>

    <p style="color:rgba(255,255,255,0.9); font-size:14px; line-height:1.6; margin:16px 0; text-align:center;">Please process this order promptly. The customer has been notified and is expecting timely fulfillment.</p>
    <p style="color:rgba(255,255,255,0.5); font-size:12px; line-height:1.5; margin:0; padding-top:16px; border-top:1px solid rgba(255,255,255,0.1); text-align:center;">This is an automated notification from SJFulfillment.</p>`

  const html = createEmailTemplate('New Order Received', content)
  await sendEmail({ to, subject: `New Order: ${orderNumber}`, html })
}

// Send order status update notification to merchant
export async function sendMerchantStatusUpdateEmail(params: {
  to: string
  merchantName: string
  orderNumber: string
  customerName: string
  newStatus: string
  trackingNumber?: string
  notes?: string
  updatedAt: Date
  orderId: string
}): Promise<void> {
  const {
    to,
    merchantName,
    orderNumber,
    customerName,
    newStatus,
    trackingNumber,
    notes,
    updatedAt,
    orderId
  } = params

  // Format date
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  // Format status for display
  const formatStatus = (status: string) => {
    const statusColors: { [key: string]: string } = {
      'PENDING': '#fbbf24',
      'CONFIRMED': '#3b82f6',
      'PROCESSING': '#8b5cf6',
      'READY_FOR_DISPATCH': '#f59e0b',
      'IN_TRANSIT': '#6366f1',
      'DELIVERED': '#10b981',
      'CANCELLED': '#ef4444',
      'RETURNED': '#64748b'
    }
    
    const color = statusColors[status] || '#f08c17'
    const displayStatus = status.replace(/_/g, ' ')
    
    return `<span style="display:inline-block; background:${color}; color:#ffffff; font-size:14px; font-weight:600; padding:8px 16px; border-radius:5px; text-transform:uppercase;">${displayStatus}</span>`
  }

  // Get status-specific message for merchants
  const getStatusMessage = (status: string) => {
    const messages: { [key: string]: { title: string; description: string } } = {
      'PENDING': {
        title: 'Order Awaiting Confirmation',
        description: 'This order is pending and awaiting your confirmation.'
      },
      'CONFIRMED': {
        title: 'Order Confirmed',
        description: 'This order has been confirmed and is ready for processing.'
      },
      'PROCESSING': {
        title: 'Order Being Processed',
        description: 'This order is currently being prepared for shipment.'
      },
      'READY_FOR_DISPATCH': {
        title: 'Ready for Dispatch',
        description: 'This order has been packed and is ready for pickup.'
      },
      'IN_TRANSIT': {
        title: 'Order in Transit',
        description: 'This order is on its way to the customer.'
      },
      'DELIVERED': {
        title: 'Order Delivered Successfully',
        description: 'This order has been delivered to the customer. Great job!'
      },
      'CANCELLED': {
        title: 'Order Cancelled',
        description: 'This order has been cancelled.'
      },
      'RETURNED': {
        title: 'Order Returned',
        description: 'This order has been returned by the customer.'
      }
    }
    
    return messages[status] || { 
      title: 'Order Status Updated', 
      description: 'The order status has been updated.' 
    }
  }

  const statusInfo = getStatusMessage(newStatus)

  const content = `
    <h1 style="color:#f08c17; font-size:28px; font-weight:bold; margin:0 0 16px; text-align:center;">Order Status Update</h1>
    <p style="color:rgba(255,255,255,0.9); font-size:16px; line-height:1.6; margin:0 0 16px;">Hi ${escapeHtml(merchantName)},</p>
    <p style="color:rgba(255,255,255,0.9); font-size:16px; line-height:1.6; margin:0 0 24px;">The status of order <strong>${escapeHtml(orderNumber)}</strong> for customer <strong>${escapeHtml(customerName)}</strong> has been updated.</p>
    
    <!-- Status Update Card -->
    <div style="background:rgba(255,255,255,0.2); border:1px solid rgba(255,255,255,0.3); border-radius:5px; padding:24px; margin:0 0 24px; text-align:center;">
      <div style="margin-bottom:16px;">
        ${formatStatus(newStatus)}
      </div>
      <h2 style="color:#f08c17; font-size:24px; font-weight:bold; margin:0 0 12px;">${statusInfo.title}</h2>
      <p style="color:rgba(255,255,255,0.9); font-size:16px; line-height:1.6; margin:0;">${statusInfo.description}</p>
    </div>

    <!-- Order Info -->
    <div style="background:rgba(255,255,255,0.15); border-radius:5px; padding:20px; margin:0 0 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding-bottom:12px;">
            <span style="color:rgba(255,255,255,0.7); font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">Order Number</span><br/>
            <span style="color:#f08c17; font-size:16px; font-weight:bold; font-family:monospace;">${escapeHtml(orderNumber)}</span>
          </td>
        </tr>
        <tr>
          <td style="padding-top:12px; padding-bottom:12px; border-top:1px solid rgba(255,255,255,0.1);">
            <span style="color:rgba(255,255,255,0.7); font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">Customer</span><br/>
            <span style="color:rgba(255,255,255,0.9); font-size:14px;">${escapeHtml(customerName)}</span>
          </td>
        </tr>
        <tr>
          <td style="padding-top:12px; border-top:1px solid rgba(255,255,255,0.1);">
            <span style="color:rgba(255,255,255,0.7); font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">Last Updated</span><br/>
            <span style="color:rgba(255,255,255,0.9); font-size:14px;">${formatDate(updatedAt)}</span>
          </td>
        </tr>
      </table>
    </div>

    ${trackingNumber ? `
    <!-- Tracking Info -->
    <div style="background:linear-gradient(135deg, rgba(240,140,23,0.2), rgba(255,159,58,0.2)); border:2px solid #f08c17; border-radius:5px; padding:20px; margin:0 0 24px;">
      <h3 style="color:#f08c17; font-size:16px; font-weight:600; margin:0 0 12px; text-align:center;">Tracking Information</h3>
      <div style="text-align:center;">
        <span style="color:rgba(255,255,255,0.7); font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">Tracking Number</span><br/>
        <span style="color:#f08c17; font-size:20px; font-weight:bold; font-family:monospace; background:rgba(0,0,0,0.3); padding:8px 16px; border-radius:5px; display:inline-block; margin-top:8px;">${escapeHtml(trackingNumber)}</span>
      </div>
    </div>
    ` : ''}

    ${notes ? `
    <!-- Additional Notes -->
    <div style="background:rgba(255,255,255,0.15); border-left:4px solid #f08c17; padding:16px; margin:0 0 24px; border-radius:3px;">
      <p style="color:rgba(255,255,255,0.7); font-size:12px; text-transform:uppercase; letter-spacing:0.5px; margin:0 0 8px;">Additional Information</p>
      <p style="color:rgba(255,255,255,0.9); font-size:14px; line-height:1.6; margin:0;">${escapeHtml(notes)}</p>
    </div>
    ` : ''}

    <!-- Action Button -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
      <tr>
        <td align="center">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://portal.sjfulfillment.com'}/orders/${orderId}" style="display:inline-block; background:linear-gradient(to right, #f08c17, #ff9f3a); color:#ffffff; font-size:16px; font-weight:600; text-decoration:none; padding:14px 32px; border-radius:5px; margin:0 auto;">View Order Details</a>
        </td>
      </tr>
    </table>

    <p style="color:rgba(255,255,255,0.9); font-size:14px; line-height:1.6; margin:16px 0; text-align:center;">The customer has been notified about this status update.</p>
    <p style="color:rgba(255,255,255,0.5); font-size:12px; line-height:1.5; margin:0; padding-top:16px; border-top:1px solid rgba(255,255,255,0.1); text-align:center;">This is an automated notification from SJFulfillment.</p>`

  const html = createEmailTemplate('Order Status Update', content)
  await sendEmail({ to, subject: `Order Update: ${orderNumber} - ${statusInfo.title}`, html })
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
