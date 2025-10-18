'use client'

import { useState } from 'react'
import DashboardLayout from '@/app/components/dashboard-layout'
import { useAuth } from '@/app/lib/auth-context'
import { 
  CodeBracketIcon,
  DocumentTextIcon,
  PlayIcon,
  ClipboardDocumentIcon,
  CheckIcon
} from '@heroicons/react/24/outline'

export default function ApiDocsPage() {
  const { user } = useAuth()
  const [activeSection, setActiveSection] = useState('overview')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const copyToClipboard = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(id)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const sections = [
    { id: 'overview', name: 'Overview', icon: DocumentTextIcon },
    { id: 'authentication', name: 'Authentication', icon: CodeBracketIcon },
    { id: 'products', name: 'Products API', icon: CodeBracketIcon },
    { id: 'orders', name: 'Orders API', icon: CodeBracketIcon },
    { id: 'inventory', name: 'Inventory API', icon: CodeBracketIcon },
    { id: 'webhooks', name: 'Webhooks', icon: CodeBracketIcon },
    { id: 'examples', name: 'Examples', icon: PlayIcon }
  ]

  const CodeBlock = ({ code, language = 'bash', id }: { code: string, language?: string, id: string }) => (
    <div className="relative">
      <pre className="bg-white/20 text-white p-4 rounded-lg overflow-x-auto text-sm">
        <code className={`language-${language}`}>{code}</code>
      </pre>
      <button
        onClick={() => copyToClipboard(code, id)}
        className="absolute top-2 right-2 p-2 text-white/70 hover:text-white bg-[#f08c17] rounded"
      >
        {copiedCode === id ? <CheckIcon className="h-5 w-5" /> : <ClipboardDocumentIcon className="h-5 w-5" />}
      </button>
    </div>
  )

  return (
    <DashboardLayout userRole={user?.role || 'MERCHANT_ADMIN'}>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#f08c17]">API Documentation</h1>
          <p className="mt-2 text-white/90">Comprehensive guide to integrating with the SJFulfillment API.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="space-y-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-[5px] transition-colors ${
                  activeSection === section.id
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white'
                    : 'text-white/80 hover:bg-white/20 hover:text-white'
                }`}
              >
                <section.icon className="mr-3 h-5 w-5" />
                {section.name}
              </button>
            ))}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white/30 shadow rounded-[5px]">
              <div className="px-4 py-5 sm:p-6">
                {activeSection === 'overview' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-[#f08c17] mb-4">API Overview</h2>
                      <p className="text-white/90 mb-4">
                        The SJFulfillment API provides comprehensive endpoints for managing products, orders, and inventory. All endpoints require authentication via API keys.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="border border-white/30 rounded-[5px] p-4">
                        <h3 className="text-lg font-semibold text-white mb-2">Base URL</h3>
                        <CodeBlock 
                          code="https://your-domain.com/api/external" 
                          id="base-url"
                        />
                      </div>
                      <div className="border border-white/30 rounded-[5px] p-4">
                        <h3 className="text-lg font-semibold text-white mb-2">Authentication</h3>
                        <CodeBlock 
                          code="Authorization: Bearer YOUR_API_KEY" 
                          id="auth-header"
                        />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Features</h3>
                      <ul className="space-y-2 text-white/90">
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-[#f08c17] rounded-full mr-3"></span>
                          Product management (CRUD operations)
                        </li>
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-[#f08c17] rounded-full mr-3"></span>
                          Order creation and status updates
                        </li>
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-[#f08c17] rounded-full mr-3"></span>
                          Real-time inventory tracking
                        </li>
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-[#f08c17] rounded-full mr-3"></span>
                          Webhook notifications
                        </li>
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-[#f08c17] rounded-full mr-3"></span>
                          Rate limiting and usage tracking
                        </li>
                      </ul>
                    </div>
                  </div>
                )}

                {activeSection === 'authentication' && (
                  <div className="space-y-6">
                    <div>
                        <h2 className="text-2xl font-bold text-[#f08c17] mb-4">Authentication</h2>
                        <p className="text-white/90 mb-4">
                        All API requests require authentication using your API key. Include the key in the 
                        Authorization header of every request.
                      </p>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Getting Your API Key</h3>
                      <ol className="list-decimal list-inside space-y-2 text-white/90 mb-4">
                        <li>Log into your SJFulfillment dashboard</li>
                        <li>Navigate to Settings → API Management</li>
                        <li>Click "Create API Key"</li>
                        <li>Configure permissions and rate limits</li>
                        <li>Copy your public and secret keys</li>
                      </ol>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Making Requests</h3>
                      <CodeBlock 
                        code={`curl -H "Authorization: Bearer pk_your_public_key_here" -H "Content-Type: application/json" https://your-domain.com/api/external/products`}
                        id="auth-example"
                      />
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Rate Limiting</h3>
                        <p className="text-white/90 mb-2">
                        API requests are rate limited to prevent abuse. Default limits:
                      </p>
                      <ul className="space-y-1 text-white/90">
                        <li>• 1000 requests per hour per API key</li>
                        <li>• Rate limit headers included in responses</li>
                        <li>• 429 status code when limit exceeded</li>
                      </ul>
                    </div>
                  </div>
                )}

                {activeSection === 'products' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-[#f08c17] mb-4">Products API</h2>
                      <p className="text-white/90 mb-4">
                        Manage your product catalog with full CRUD operations.
                      </p>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">List Products</h3>
                      <CodeBlock 
                        code={`GET /api/external/products

# Query Parameters
?page=1&limit=10&category=Electronics&search=laptop`}
                        id="list-products"
                      />
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Create Product</h3>
                      <CodeBlock 
                        code={`POST /api/external/products
Content-Type: application/json

{
  "name": "Sample Product",
  "description": "Product description",
  "category": "Electronics",
  "brand": "Brand Name",
  "weight": 1.5,
  "unitPrice": 99.99,
  "images": ["https://example.com/image.jpg"],
  "quantity": 100,
  "warehouseId": "warehouse_123"
}`}
                        id="create-product"
                      />
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Update Product</h3>
                      <CodeBlock 
                        code={`PUT /api/external/products/{id}
Content-Type: application/json

{
  "name": "Updated Product Name",
  "unitPrice": 149.99,
  "isActive": true
}`}
                        id="update-product"
                      />
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Delete Product</h3>
                      <CodeBlock 
                        code={`DELETE /api/external/products/{id}`}
                        id="delete-product"
                      />
                    </div>
                  </div>
                )}

                {activeSection === 'orders' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-[#f08c17] mb-4">Orders API</h2>
                      <p className="text-white/90 mb-4">
                        Create and manage orders with automatic inventory updates.
                      </p>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">List Orders</h3>
                      <CodeBlock 
                        code={`GET /api/external/orders

# Query Parameters
?page=1&limit=10&status=PENDING&startDate=2024-01-01`}
                        id="list-orders"
                      />
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Create Order</h3>
                      <CodeBlock 
                        code={`POST /api/external/orders
Content-Type: application/json

{
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "customerPhone": "+2348012345678",
  "shippingAddress": {
    "street": "123 Main Street",
    "city": "Lagos",
    "state": "Lagos",
    "country": "Nigeria",
    "postalCode": "100001"
  },
  "items": [
    {
      "productId": "prod_123",
      "quantity": 2,
      "unitPrice": 99.99
    }
  ],
  "deliveryFee": 5.00,
  "paymentMethod": "COD",
  "notes": "Handle with care"
}`}
                        id="create-order"
                      />
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Update Order Status</h3>
                      <CodeBlock 
                        code={`PUT /api/external/orders/{id}
Content-Type: application/json

{
  "status": "SHIPPED",
  "trackingNumber": "TRK123456789",
  "notes": "Order shipped via DHL"
}`}
                        id="update-order"
                      />
                    </div>
                  </div>
                )}

                {activeSection === 'inventory' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-[#f08c17] mb-4">Inventory API</h2>
                      <p className="text-white/90 mb-4">
                        Track and update inventory levels across warehouses.
                      </p>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Get Inventory</h3>
                      <CodeBlock 
                        code={`GET /api/external/inventory\n\n# Query Parameters\n?page=1&limit=10&productId=prod_123&lowStock=true`}
                        id="get-inventory"
                      />
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Update Inventory</h3>
                      <CodeBlock 
                        code={`POST /api/external/inventory\nContent-Type: application/json\n\n{\n  \"productId\": \"prod_123\",\n  \"warehouseId\": \"warehouse_123\",\n  \"quantity\": 150,\n  \"movementType\": \"STOCK_IN\",\n  \"reason\": \"Restock from supplier\",\n  \"notes\": \"Bulk restock\"\n}`} 
                        id="update-inventory"
                      />
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Movement Types</h3>
                      <ul className="space-y-1 text-white/90">
                        <li>• <code className="bg-white/20 px-1 rounded">STOCK_IN</code> - Add stock</li>
                        <li>• <code className="bg-white/20 px-1 rounded">STOCK_OUT</code> - Remove stock</li>
                        <li>• <code className="bg-white/20 px-1 rounded">ADJUSTMENT</code> - Set exact quantity</li>
                      </ul>
                    </div>
                  </div>
                )}

                {activeSection === 'webhooks' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-[#f08c17] mb-4">Webhooks</h2>
                      <p className="text-white/90 mb-4">
                        Receive real-time notifications about events in your account.
                      </p>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Available Events</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium text-white mb-2">Order Events</h4>
                          <ul className="space-y-1 text-sm text-white/90">
                            <li>• order.created</li>
                            <li>• order.updated</li>
                            <li>• order.status_changed</li>
                            <li>• order.delivered</li>
                            <li>• order.cancelled</li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-medium text-white mb-2">Product Events</h4>
                          <ul className="space-y-1 text-sm text-white/90">
                            <li>• product.created</li>
                            <li>• product.updated</li>
                            <li>• product.deleted</li>
                            <li>• inventory.updated</li>
                            <li>• low_stock.alert</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Webhook Payload</h3>
                      <CodeBlock 
                        code={`{
  "event": "order.created",
  "data": {
    "id": "order_123",
    "orderNumber": "ORD-001",
    "status": "PENDING",
    "customerName": "John Doe",
    "totalAmount": 204.98
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "merchantId": "merchant_123"
}`}
                        id="webhook-payload"
                      />
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Signature Verification</h3>
                      <CodeBlock 
                        code={`const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}`}
                        id="webhook-verification"
                      />
                    </div>
                  </div>
                )}

                {activeSection === 'examples' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-[#f08c17] mb-4">Integration Examples</h2>
                      <p className="text-white/90 mb-4">
                        Real-world examples of integrating with popular e-commerce platforms.
                      </p>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">WooCommerce Integration</h3>
                      <CodeBlock 
                        code={`// Sync product from WooCommerce
POST /api/integrations/woocommerce/sync-product

{
  "id": 123,
  "name": "WooCommerce Product",
  "price": "99.99",
  "stock_quantity": 100,
  "sku": "WC-001",
  "categories": [
    {
      "id": 1,
      "name": "Electronics"
    }
  ]
}`}
                        id="woocommerce-product"
                      />
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Shopify Integration</h3>
                      <CodeBlock 
                        code={`// Sync product from Shopify
POST /api/integrations/shopify/sync-product

{
  "id": 789,
  "title": "Shopify Product",
  "product_type": "Electronics",
  "vendor": "Brand Name",
  "variants": [
    {
      "price": "99.99",
      "sku": "SHOP-001",
      "inventory_quantity": 100
    }
  ]
}`}
                        id="shopify-product"
                      />
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">JavaScript Example</h3>
                      <CodeBlock 
                        code={`const API_BASE = 'https://your-domain.com/api/external';
const API_KEY = 'pk_your_public_key_here';

async function createProduct(productData) {
  const response = await fetch(\`\${API_BASE}/products\`, {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${API_KEY}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(productData)
  });
  
  if (!response.ok) {
    throw new Error(\`HTTP error! status: \${response.status}\`);
  }
  
  return await response.json();
}

// Usage
const product = await createProduct({
  name: 'New Product',
  category: 'Electronics',
  unitPrice: 99.99,
  quantity: 100
});`}
                        id="javascript-example"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
