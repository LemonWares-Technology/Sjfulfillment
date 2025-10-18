import { test, expect } from '@playwright/test'

test.describe('Admin Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock admin authentication
    await page.goto('/admin/dashboard')
  })

  test.describe('Merchant Management', () => {
    test('should display merchants list', async ({ page }) => {
      await page.goto('/admin/merchants')

      // Wait for merchants to load
      await page.waitForSelector('[data-testid="merchants-table"]')

      // Check table headers
      await expect(page.locator('th:has-text("Business Name")')).toBeVisible()
      await expect(page.locator('th:has-text("Contact Email")')).toBeVisible()
      await expect(page.locator('th:has-text("Status")')).toBeVisible()
      await expect(page.locator('th:has-text("Actions")')).toBeVisible()
    })

    test('should filter merchants by status', async ({ page }) => {
      await page.goto('/admin/merchants')

      // Select status filter
      await page.selectOption('[data-testid="status-filter"]', 'ACTIVE')

      // Wait for filtered results
      await page.waitForSelector('[data-testid="merchants-table"] tbody tr')

      // Check that all visible merchants have ACTIVE status
      const statusCells = await page.locator('[data-testid="status-badge"]').all()
      for (const cell of statusCells) {
        await expect(cell).toContainText('ACTIVE')
      }
    })

    test('should search merchants by name', async ({ page }) => {
      await page.goto('/admin/merchants')

      // Enter search term
      await page.fill('[data-testid="search-input"]', 'Test Business')

      // Wait for search results
      await page.waitForSelector('[data-testid="merchants-table"] tbody tr')

      // Check that results contain search term
      const businessNameCells = await page.locator('[data-testid="business-name"]').all()
      for (const cell of businessNameCells) {
        const text = await cell.textContent()
        expect(text?.toLowerCase()).toContain('test business')
      }
    })

    test('should view merchant details', async ({ page }) => {
      await page.goto('/admin/merchants')

      // Click on first merchant's view button
      await page.locator('[data-testid="view-merchant"]').first().click()

      // Should navigate to merchant details page
      await expect(page).toHaveURL(/\/admin\/merchants\/[^\/]+$/)

      // Check merchant details are displayed
      await expect(page.locator('[data-testid="merchant-details"]')).toBeVisible()
      await expect(page.locator('[data-testid="business-info"]')).toBeVisible()
      await expect(page.locator('[data-testid="contact-info"]')).toBeVisible()
    })
  })

  test.describe('Staff Management', () => {
    test('should display staff members list', async ({ page }) => {
      await page.goto('/admin/staff')

      // Wait for staff to load
      await page.waitForSelector('[data-testid="staff-table"]')

      // Check table headers
      await expect(page.locator('th:has-text("Name")')).toBeVisible()
      await expect(page.locator('th:has-text("Email")')).toBeVisible()
      await expect(page.locator('th:has-text("Role")')).toBeVisible()
      await expect(page.locator('th:has-text("Merchant")')).toBeVisible()
      await expect(page.locator('th:has-text("Status")')).toBeVisible()
    })

    test('should create new staff member', async ({ page }) => {
      await page.goto('/admin/staff')

      // Click add staff button
      await page.click('[data-testid="add-staff-button"]')

      // Fill in staff details
      await page.fill('[data-testid="first-name"]', 'John')
      await page.fill('[data-testid="last-name"]', 'Doe')
      await page.fill('[data-testid="email"]', 'john@example.com')
      await page.fill('[data-testid="phone"]', '+1234567890')
      await page.selectOption('[data-testid="role"]', 'MERCHANT_STAFF')
      await page.selectOption('[data-testid="merchant"]', 'merchant-1')

      // Submit form
      await page.click('[data-testid="create-staff-button"]')

      // Check for success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Staff member created successfully')
    })

    test('should filter staff by role', async ({ page }) => {
      await page.goto('/admin/staff')

      // Select role filter
      await page.selectOption('[data-testid="role-filter"]', 'MERCHANT_STAFF')

      // Wait for filtered results
      await page.waitForSelector('[data-testid="staff-table"] tbody tr')

      // Check that all visible staff have MERCHANT_STAFF role
      const roleCells = await page.locator('[data-testid="role-badge"]').all()
      for (const cell of roleCells) {
        await expect(cell).toContainText('MERCHANT_STAFF')
      }
    })
  })

  test.describe('Logistics Partners Management', () => {
    test('should display logistics partners list', async ({ page }) => {
      await page.goto('/logistics')

      // Wait for partners to load
      await page.waitForSelector('[data-testid="partners-table"]')

      // Check table headers
      await expect(page.locator('th:has-text("Company Name")')).toBeVisible()
      await expect(page.locator('th:has-text("Contact Email")')).toBeVisible()
      await expect(page.locator('th:has-text("Coverage Areas")')).toBeVisible()
      await expect(page.locator('th:has-text("Status")')).toBeVisible()
    })

    test('should create new logistics partner', async ({ page }) => {
      await page.goto('/logistics')

      // Click add partner button
      await page.click('[data-testid="add-partner-button"]')

      // Fill in partner details
      await page.fill('[data-testid="company-name"]', 'Test Logistics')
      await page.fill('[data-testid="contact-email"]', 'test@logistics.com')
      await page.fill('[data-testid="contact-phone"]', '+1234567890')
      await page.fill('[data-testid="address"]', '123 Logistics St')
      await page.fill('[data-testid="password"]', 'password123')

      // Add coverage area
      await page.fill('[data-testid="coverage-area-input"]', 'Area 1')
      await page.click('[data-testid="add-area-button"]')

      // Submit form
      await page.click('[data-testid="create-partner-button"]')

      // Check for success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Logistics partner created successfully')
    })

    test('should edit existing logistics partner', async ({ page }) => {
      await page.goto('/logistics')

      // Click edit button on first partner
      await page.locator('[data-testid="edit-partner"]').first().click()

      // Update company name
      await page.fill('[data-testid="company-name"]', 'Updated Logistics')

      // Submit form
      await page.click('[data-testid="update-partner-button"]')

      // Check for success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Logistics partner updated successfully')
    })
  })

  test.describe('Subscriptions Management', () => {
    test('should display merchant subscriptions', async ({ page }) => {
      await page.goto('/admin/subscriptions')

      // Wait for subscriptions to load
      await page.waitForSelector('[data-testid="subscriptions-table"]')

      // Check table headers
      await expect(page.locator('th:has-text("Merchant")')).toBeVisible()
      await expect(page.locator('th:has-text("Service")')).toBeVisible()
      await expect(page.locator('th:has-text("Daily Price")')).toBeVisible()
      await expect(page.locator('th:has-text("Status")')).toBeVisible()
      await expect(page.locator('th:has-text("Start Date")')).toBeVisible()
    })

    test('should filter subscriptions by status', async ({ page }) => {
      await page.goto('/admin/subscriptions')

      // Select status filter
      await page.selectOption('[data-testid="status-filter"]', 'ACTIVE')

      // Wait for filtered results
      await page.waitForSelector('[data-testid="subscriptions-table"] tbody tr')

      // Check that all visible subscriptions have ACTIVE status
      const statusCells = await page.locator('[data-testid="status-badge"]').all()
      for (const cell of statusCells) {
        await expect(cell).toContainText('ACTIVE')
      }
    })

    test('should view subscription details', async ({ page }) => {
      await page.goto('/admin/subscriptions')

      // Click on first subscription's view button
      await page.locator('[data-testid="view-subscription"]').first().click()

      // Should show subscription details modal
      await expect(page.locator('[data-testid="subscription-details-modal"]')).toBeVisible()
      await expect(page.locator('[data-testid="merchant-info"]')).toBeVisible()
      await expect(page.locator('[data-testid="service-info"]')).toBeVisible()
      await expect(page.locator('[data-testid="subscription-info"]')).toBeVisible()
    })
  })

  test.describe('Analytics Dashboard', () => {
    test('should display analytics overview', async ({ page }) => {
      await page.goto('/analytics')

      // Wait for analytics to load
      await page.waitForSelector('[data-testid="analytics-dashboard"]')

      // Check key metrics
      await expect(page.locator('[data-testid="total-orders"]')).toBeVisible()
      await expect(page.locator('[data-testid="total-revenue"]')).toBeVisible()
      await expect(page.locator('[data-testid="average-order-value"]')).toBeVisible()
      await expect(page.locator('[data-testid="top-products"]')).toBeVisible()
    })

    test('should filter analytics by date range', async ({ page }) => {
      await page.goto('/analytics')

      // Set date range filter
      await page.fill('[data-testid="start-date"]', '2024-01-01')
      await page.fill('[data-testid="end-date"]', '2024-12-31')

      // Apply filter
      await page.click('[data-testid="apply-filter-button"]')

      // Wait for filtered data to load
      await page.waitForSelector('[data-testid="analytics-dashboard"]')

      // Check that data is updated
      await expect(page.locator('[data-testid="total-orders"]')).toBeVisible()
    })

    test('should filter analytics by merchant', async ({ page }) => {
      await page.goto('/analytics')

      // Select merchant filter
      await page.selectOption('[data-testid="merchant-filter"]', 'merchant-1')

      // Apply filter
      await page.click('[data-testid="apply-filter-button"]')

      // Wait for filtered data to load
      await page.waitForSelector('[data-testid="analytics-dashboard"]')

      // Check that data is updated
      await expect(page.locator('[data-testid="total-orders"]')).toBeVisible()
    })

    test('should export analytics data', async ({ page }) => {
      await page.goto('/analytics')

      // Click export button
      await page.click('[data-testid="export-button"]')

      // Select export format
      await page.selectOption('[data-testid="export-format"]', 'CSV')

      // Confirm export
      await page.click('[data-testid="confirm-export-button"]')

      // Check for download
      const downloadPromise = page.waitForEvent('download')
      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(/analytics.*\.csv$/)
    })
  })
})

