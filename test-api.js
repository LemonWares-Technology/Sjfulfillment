// Simple API testing script
const API_BASE = 'http://localhost:3000/api';

// Test API key (you'll need to create one first)
const API_KEY = 'pk_test_key_here';

async function testApi() {
  console.log('🧪 Testing SJFulfillment API...\n');

  // Test 1: List Products
  try {
    console.log('1️⃣ Testing GET /api/external/products');
    const response = await fetch(`${API_BASE}/external/products`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Products API working:', data.data?.products?.length || 0, 'products found');
    } else {
      console.log('❌ Products API failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ Products API error:', error.message);
  }

  // Test 2: Create Product
  try {
    console.log('\n2️⃣ Testing POST /api/external/products');
    const productData = {
      name: 'Test Product',
      description: 'A test product created via API',
      category: 'Test',
      brand: 'Test Brand',
      unitPrice: 99.99,
      quantity: 10
    };

    const response = await fetch(`${API_BASE}/external/products`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(productData)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Create Product API working:', data.data?.name);
    } else {
      const error = await response.text();
      console.log('❌ Create Product API failed:', response.status, error);
    }
  } catch (error) {
    console.log('❌ Create Product API error:', error.message);
  }

  // Test 3: List Orders
  try {
    console.log('\n3️⃣ Testing GET /api/external/orders');
    const response = await fetch(`${API_BASE}/external/orders`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Orders API working:', data.data?.orders?.length || 0, 'orders found');
    } else {
      console.log('❌ Orders API failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ Orders API error:', error.message);
  }

  // Test 4: Get Inventory
  try {
    console.log('\n4️⃣ Testing GET /api/external/inventory');
    const response = await fetch(`${API_BASE}/external/inventory`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Inventory API working:', data.data?.inventory?.length || 0, 'items found');
    } else {
      console.log('❌ Inventory API failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ Inventory API error:', error.message);
  }

  console.log('\n🎉 API testing complete!');
  console.log('\n📝 Next steps:');
  console.log('1. Create an API key in Settings → API Management');
  console.log('2. Replace API_KEY in this script with your actual key');
  console.log('3. Run: node test-api.js');
}

// Run the tests
testApi().catch(console.error);
