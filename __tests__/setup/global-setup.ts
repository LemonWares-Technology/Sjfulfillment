import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use
  const browser = await chromium.launch()
  const page = await browser.newPage()

  try {
    // Wait for the application to be ready
    await page.goto(baseURL || 'http://localhost:3000')
    
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle')
    
    // Check if the application is running
    const title = await page.title()
    console.log(`Application title: ${title}`)
    
    // You can add additional setup here, such as:
    // - Creating test data
    // - Setting up authentication
    // - Configuring test environment
    
  } catch (error) {
    console.error('Global setup failed:', error)
    throw error
  } finally {
    await browser.close()
  }
}

export default globalSetup

