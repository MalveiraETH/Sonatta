/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable no-undef */
import { test as base, expect } from '@playwright/test';

const testWithAuth = base.extend({
  authenticatedPage: async ({ page }, use) => {
    await page.goto('/');
    
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

export const test = testWithAuth;
export { expect };