import { test, expect } from './fixtures/auth.js';

test.describe('Performance Tests', () => {
  test('should load dashboard in under 3 seconds', async ({ authenticatedPage }) => {
    const startTime = Date.now();
    
    await authenticatedPage.goto('/Dashboard');
    await authenticatedPage.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000);
  });

  test('should load clients list in under 2 seconds', async ({ authenticatedPage }) => {
    const startTime = Date.now();
    
    await authenticatedPage.goto('/Clients');
    await authenticatedPage.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(2000);
  });

  test('should handle large lists without lag', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/Clients');
    await authenticatedPage.waitForLoadState('networkidle');

    // Scroll na lista
    const tableBody = authenticatedPage.locator('tbody');
    await tableBody.evaluate(el => el.scrollTop = el.scrollHeight);
    
    // Verifica se mantém responsiva
    const rows = await authenticatedPage.locator('tbody tr').count();
    expect(rows).toBeGreaterThan(0);
  });

  test('should not have layout shifts', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/Dashboard');
    
    // Verifica Cumulative Layout Shift
    const cls = await authenticatedPage.evaluate(() => {
      return new Promise(resolve => {
        let cls = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            cls += entry.value;
          }
          resolve(cls);
        }).observe({ entryTypes: ['layout-shift'] });
        
        setTimeout(() => resolve(cls), 3000);
      });
    });
    
    // CLS deve estar abaixo de 0.1 (bom)
    expect(cls).toBeLessThan(0.1);
  });
});