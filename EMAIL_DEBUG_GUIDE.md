# Email Debugging Guide

## Quick Checklist

### 1. **IMPORTANT: Restart Your Server**
After changing environment variables, you MUST restart your Next.js server:
```bash
# Stop the server (Ctrl+C), then start it again
npm run dev
```

### 2. Test Email Configuration
Run the test script to verify your email setup:
```bash
npx tsx scripts/test-email.ts
```

**Before running**, edit `scripts/test-email.ts` and change `test@example.com` to your actual email address.

### 3. Check Environment Variables
Verify these are set in **BOTH** `.env` **AND** `.env.local`:

**In `.env.local` (this file is always loaded by Next.js):**
```
EMAIL_PROVIDER=zeptomail
ZEPTOMAIL_API_KEY=Zoho-enczapikey wSsVR61...
EMAIL_FROM=SJFulfillment <no-reply@sjfulfillment.com>
```

**Note:** If `NODE_ENV=production` is set in `.env`, Next.js will ONLY load `.env.local` and `.env.production.local`, not `.env`. Make sure your email variables are in `.env.local`!

### 4. Check Console Logs
When creating an order, look for these log messages in your terminal:

**Success Flow:**
```
Attempting to send order confirmation email... { to: 'customer@email.com', orderNumber: 'ORD-...', ... }
Sending email via ZeptoMail... { to: [...], subject: '...', ... }
✅ ZeptoMail response status: 200
✅ Email sent successfully
✅ Order confirmation email sent successfully to: customer@email.com
```

**Error Flow:**
```
Attempting to send order confirmation email...
❌ Error sending email via ZeptoMail: { status: 401, ... }
ZeptoMail 401: Check your ZEPTOMAIL_API_KEY is correct and active
❌ Error sending order confirmation email: [Error details]
```

### 4. Common Issues and Solutions

#### Issue: "No customer email provided"
**Log:** `⚠️ Skipping email: No customer email provided for order`
**Solution:** Make sure you're providing a `customerEmail` when creating the order.

#### Issue: "ZeptoMail 401"
**Cause:** Invalid API key
**Solution:** 
1. Log into ZeptoMail console
2. Generate a new API key
3. Update `ZEPTOMAIL_API_KEY` in `.env`
4. Restart your server

#### Issue: "ZeptoMail 403"
**Cause:** Sender domain not verified
**Solution:**
1. Log into ZeptoMail console
2. Verify that `sjfulfillment.com` domain is verified
3. Make sure DNS records (SPF, DKIM, DMARC) are configured

#### Issue: "Connection refused" or "ECONNREFUSED"
**Cause:** Cannot reach ZeptoMail API
**Solution:**
1. Check your internet connection
2. Verify firewall isn't blocking outbound connections
3. Check if ZeptoMail service is operational

#### Issue: "Timeout" or "ETIMEDOUT"
**Cause:** API not responding in time
**Solution:**
1. Check your internet speed
2. Try again (might be temporary)
3. Increase timeout in `email.ts` (currently 15000ms)

### 5. Verify Email Was Sent

Even if you see success logs, check:
1. **Recipient's inbox** - emails should arrive within seconds
2. **Spam/Junk folder** - emails might be filtered
3. **ZeptoMail dashboard** - check "Email Logs" section to see delivery status

### 6. Debug Mode

To see more detailed logs, check your terminal when:
- Creating a new order
- Updating an order status

Look for:
- `Attempting to send order confirmation email...`
- `Sending email via ZeptoMail...`
- `✅ ZeptoMail response status: 200`
- `✅ Order confirmation email sent successfully`

### 7. Test in Development

To test without creating real orders:

1. Run the test script:
```bash
npx tsx scripts/test-email.ts
```

2. Or use the API directly:
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "customerName": "Test Customer",
    "customerEmail": "your-email@example.com",
    "customerPhone": "1234567890",
    "shippingAddress": "123 Test St",
    "deliveryFee": 1000,
    "paymentMethod": "CARD",
    "items": [{
      "productId": "PRODUCT_ID",
      "quantity": 1,
      "unitPrice": 5000
    }]
  }'
```

### 8. Production Checklist

Before deploying to production:
- [ ] ZEPTOMAIL_API_KEY is set and valid
- [ ] EMAIL_FROM domain is verified in ZeptoMail
- [ ] Test email script works
- [ ] Create a test order and verify email is received
- [ ] Update an order status and verify status email is received
- [ ] Check ZeptoMail dashboard for email delivery logs

## Need Help?

If emails still aren't sending after following this guide:
1. Check the terminal/console logs for specific error messages
2. Verify your ZeptoMail account is active and has credits
3. Test with the test script first before creating actual orders
4. Check ZeptoMail's documentation: https://www.zoho.com/zeptomail/help/
