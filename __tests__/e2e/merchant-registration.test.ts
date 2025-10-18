import { test, expect } from '@playwright/test'

test.describe('Merchant Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the merchant registration page
    await page.goto('/merchant-register')
  })

  test('should complete merchant registration successfully', async ({ page }) => {
    // Fill in business information
    await page.fill('[data-testid="business-name"]', 'Test Business')
    await page.selectOption('[data-testid="business-type"]', 'Retail')
    await page.fill('[data-testid="contact-email"]', 'test@business.com')
    await page.fill('[data-testid="contact-phone"]', '+1234567890')
    await page.fill('[data-testid="address"]', '123 Business St')
    await page.fill('[data-testid="city"]', 'Business City')
    await page.fill('[data-testid="state"]', 'Business State')
    await page.fill('[data-testid="zip-code"]', '12345')
    await page.fill('[data-testid="country"]', 'Business Country')

    // Fill in business details
    await page.fill('[data-testid="tax-id"]', 'TAX123456')
    await page.fill('[data-testid="business-license"]', 'LIC123456')
    await page.fill('[data-testid="business-description"]', 'Test business description')

    // Fill in owner information
    await page.fill('[data-testid="owner-first-name"]', 'John')
    await page.fill('[data-testid="owner-last-name"]', 'Doe')
    await page.fill('[data-testid="owner-email"]', 'john@business.com')
    await page.fill('[data-testid="owner-phone"]', '+1234567891')
    await page.fill('[data-testid="owner-password"]', 'password123')
    await page.fill('[data-testid="owner-confirm-password"]', 'password123')

    // Submit the form
    await page.click('[data-testid="submit-button"]')

    // Wait for success page
    await expect(page).toHaveURL('/merchant-registration-success')
    await expect(page.locator('h1')).toContainText('Registration Successful')
  })

  test('should show validation errors for missing required fields', async ({ page }) => {
    // Try to submit without filling required fields
    await page.click('[data-testid="submit-button"]')

    // Check for validation errors
    await expect(page.locator('[data-testid="business-name-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="contact-email-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="owner-first-name-error"]')).toBeVisible()
  })

  test('should show error for invalid email format', async ({ page }) => {
    await page.fill('[data-testid="contact-email"]', 'invalid-email')
    await page.fill('[data-testid="business-name"]', 'Test Business')
    await page.click('[data-testid="submit-button"]')

    await expect(page.locator('[data-testid="contact-email-error"]')).toContainText('Invalid email format')
  })

  test('should show error for password mismatch', async ({ page }) => {
    await page.fill('[data-testid="owner-password"]', 'password123')
    await page.fill('[data-testid="owner-confirm-password"]', 'different-password')
    await page.fill('[data-testid="business-name"]', 'Test Business')
    await page.click('[data-testid="submit-button"]')

    await expect(page.locator('[data-testid="password-mismatch-error"]')).toContainText('Passwords do not match')
  })

  test('should navigate to service selection after successful registration', async ({ page }) => {
    // Complete registration
    await page.fill('[data-testid="business-name"]', 'Test Business')
    await page.selectOption('[data-testid="business-type"]', 'Retail')
    await page.fill('[data-testid="contact-email"]', 'test@business.com')
    await page.fill('[data-testid="contact-phone"]', '+1234567890')
    await page.fill('[data-testid="address"]', '123 Business St')
    await page.fill('[data-testid="city"]', 'Business City')
    await page.fill('[data-testid="state"]', 'Business State')
    await page.fill('[data-testid="zip-code"]', '12345')
    await page.fill('[data-testid="country"]', 'Business Country')
    await page.fill('[data-testid="tax-id"]', 'TAX123456')
    await page.fill('[data-testid="business-license"]', 'LIC123456')
    await page.fill('[data-testid="business-description"]', 'Test business description')
    await page.fill('[data-testid="owner-first-name"]', 'John')
    await page.fill('[data-testid="owner-last-name"]', 'Doe')
    await page.fill('[data-testid="owner-email"]', 'john@business.com')
    await page.fill('[data-testid="owner-phone"]', '+1234567891')
    await page.fill('[data-testid="owner-password"]', 'password123')
    await page.fill('[data-testid="owner-confirm-password"]', 'password123')

    await page.click('[data-testid="submit-button"]')

    // Wait for success page
    await expect(page).toHaveURL('/merchant-registration-success')

    // Click on "Select Services" button
    await page.click('[data-testid="select-services-button"]')

    // Should navigate to service selection
    await expect(page).toHaveURL('/service-selection')
  })
})

test.describe('Service Selection Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.goto('/service-selection')
  })

  test('should display available services', async ({ page }) => {
    // Wait for services to load
    await page.waitForSelector('[data-testid="service-card"]')

    // Check that services are displayed
    const serviceCards = await page.locator('[data-testid="service-card"]').count()
    expect(serviceCards).toBeGreaterThan(0)

    // Check service details
    await expect(page.locator('[data-testid="service-name"]').first()).toBeVisible()
    await expect(page.locator('[data-testid="service-price"]').first()).toBeVisible()
    await expect(page.locator('[data-testid="service-description"]').first()).toBeVisible()
  })

  test('should allow selecting and deselecting services', async ({ page }) => {
    await page.waitForSelector('[data-testid="service-card"]')

    // Select first service
    const firstService = page.locator('[data-testid="service-card"]').first()
    await firstService.click()

    // Check that service is selected
    await expect(firstService).toHaveClass(/selected/)

    // Deselect service
    await firstService.click()

    // Check that service is deselected
    await expect(firstService).not.toHaveClass(/selected/)
  })

  test('should show total cost for selected services', async ({ page }) => {
    await page.waitForSelector('[data-testid="service-card"]')

    // Select services
    await page.locator('[data-testid="service-card"]').first().click()
    await page.locator('[data-testid="service-card"]').nth(1).click()

    // Check total cost display
    await expect(page.locator('[data-testid="total-cost"]')).toBeVisible()
    const totalCost = await page.locator('[data-testid="total-cost"]').textContent()
    expect(totalCost).toMatch(/\$\d+\.\d+/)
  })

  test('should proceed to dashboard after service selection', async ({ page }) => {
    await page.waitForSelector('[data-testid="service-card"]')

    // Select at least one service
    await page.locator('[data-testid="service-card"]').first().click()

    // Click proceed button
    await page.click('[data-testid="proceed-button"]')

    // Should navigate to dashboard
    await expect(page).toHaveURL('/merchant/dashboard')
  })

  test('should show error if no services are selected', async ({ page }) => {
    await page.waitForSelector('[data-testid="service-card"]')

    // Try to proceed without selecting services
    await page.click('[data-testid="proceed-button"]')

    // Check for error message
    await expect(page.locator('[data-testid="no-services-error"]')).toContainText('Please select at least one service')
  })
})

test.describe('Merchant Dashboard Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication and navigate to dashboard
    await page.goto('/merchant/dashboard')
  })

  test('should display dashboard overview', async ({ page }) => {
    // Check dashboard elements
    await expect(page.locator('[data-testid="dashboard-title"]')).toContainText('Dashboard')
    await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="quick-stats"]')).toBeVisible()
  })

  test('should display daily service charges', async ({ page }) => {
    // Wait for charges to load
    await page.waitForSelector('[data-testid="daily-charges"]')

    // Check daily charges section
    await expect(page.locator('[data-testid="today-charges"]')).toBeVisible()
    await expect(page.locator('[data-testid="monthly-total"]')).toBeVisible()
    await expect(page.locator('[data-testid="service-breakdown"]')).toBeVisible()
  })

  test('should navigate to products page', async ({ page }) => {
    await page.click('[data-testid="products-nav"]')
    await expect(page).toHaveURL('/products')
  })

  test('should navigate to orders page', async ({ page }) => {
    await page.click('[data-testid="orders-nav"]')
    await expect(page).toHaveURL('/orders')
  })

  test('should navigate to staff page', async ({ page }) => {
    await page.click('[data-testid="staff-nav"]')
    await expect(page).toHaveURL('/merchant/staff')
  })
})

