/* eslint-disable react-hooks/rules-of-hooks */
import { test as base } from '@playwright/test';

export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    // Login before each test
    await page.goto('/');
    
    // Mock login (ajuste conforme seu fluxo real)
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'test-token-123');
      localStorage.setItem('user', JSON.stringify({
        id: 'user-123',
        email: 'test@sonatta.com.br',
        full_name: 'Test User',
        role: 'admin'
      }));
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    await use(page);
  },
});

export { expect } from '@playwright/test';