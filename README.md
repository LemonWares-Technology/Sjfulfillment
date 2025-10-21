This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# Production Ready

## Voice calls via Vonage (Nexmo)

This app uses the Vonage Voice API to place outbound audio calls and receive status webhooks. Vonage requires your webhook URLs to be publicly reachable.

Configure a public base URL in your environment so callbacks can reach your app:

- In production: set `PUBLIC_BASE_URL` (preferred) or `NEXT_PUBLIC_APP_URL` to your site origin, e.g. `https://app.example.com`.
- In local development: start a tunnel (e.g. ngrok or Cloudflare Tunnel) and set `PUBLIC_BASE_URL` to the tunnel URL, e.g. `https://1234-56-78-90.ngrok-free.app`.

Required env variables for Vonage Voice API:

```bash
# Vonage Voice API (required)
VONAGE_APPLICATION_ID=your-vonage-app-id
# Base64-encoded PEM private key for the Vonage application (RS256)
VONAGE_PRIVATE_KEY=base64-encoded-pem
# Your purchased/linked Vonage virtual number in E.164 format
VONAGE_VIRTUAL_NUMBER=+1234567890

# Public origin used to build webhook URLs (recommended)
PUBLIC_BASE_URL=https://your-public-url
```

Webhook endpoint configured by this app:

- Event URL: `POST {PUBLIC_BASE_URL}/api/services/call/status`

The call initiation endpoint from the frontend is unchanged: `POST /api/services/call` with body `{ to, type: 'audio', customerName, customerRole, notificationType }`.

Notes:
- Video calls are not yet implemented with Vonage in this app; initiating with `type: 'video'` returns HTTP 501.
- Phone numbers are normalized to E.164. If a number doesn't start with `+`, the app assumes NG (+234) and strips a leading 0.

## Email Configuration (ZeptoMail)

This app uses ZeptoMail for transactional emails. Configure these environment variables:

```bash
EMAIL_PROVIDER=zeptomail
ZEPTOMAIL_API_KEY='Zoho-enczapikey YOUR_KEY_HERE'
EMAIL_FROM="YourApp <no-reply@yourdomain.com>"
```

**Important:** The sender domain (e.g., `yourdomain.com`) must be verified in your ZeptoMail account. If you get error TM_3601 (403 Request Denied), verify:
1. Your domain is added and verified in ZeptoMail console
2. `EMAIL_FROM` uses an email address from that verified domain
3. `ZEPTOMAIL_API_KEY` is correct and active

