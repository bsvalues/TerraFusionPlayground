import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup to be run before starting tests
 * - Creates global state like auth sessions
 * - Sets up shared environment
 */
async function globalSetup(config: FullConfig) {
  // Define base URL for test environment
  const { baseURL } = config.projects[0].use;
  
  // Create browser and context
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Setup auth state if needed
  if (process.env.E2E_AUTH === 'true') {
    console.log('Setting up auth state for tests...');
    
    // Navigate to login page
    await page.goto(`${baseURL}/login`);
    
    // Login with test credentials
    await page.fill('input[name="email"]', process.env.E2E_TEST_EMAIL || 'test@example.com');
    await page.fill('input[name="password"]', process.env.E2E_TEST_PASSWORD || 'test-password');
    await page.click('button[type="submit"]');
    
    // Wait for login to complete
    await page.waitForNavigation();
    
    // Save authentication state
    await page.context().storageState({ path: './tests/e2e/auth-state.json' });
  }
  
  // Close browser
  await browser.close();
}

export default globalSetup;