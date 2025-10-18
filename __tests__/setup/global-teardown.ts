import { FullConfig } from '@playwright/test'

async function globalTeardown(config: FullConfig) {
  console.log('Running global teardown...')
  
  try {
    // Clean up any global resources
    // - Close database connections
    // - Clean up test data
    // - Reset application state
    
    console.log('Global teardown completed successfully')
  } catch (error) {
    console.error('Global teardown failed:', error)
    throw error
  }
}

export default globalTeardown

