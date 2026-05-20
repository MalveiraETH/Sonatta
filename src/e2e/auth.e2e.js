import { test, expect } from './fixtures/auth.js';

test.describe('Authentication Flow', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/');
    
    // Verifica se redireciona para login (ajuste conforme seu fluxo)
    await expect(page).toHaveURL(/login|auth/i);
  });

  test('should allow login with valid credentials', async ({ page }) => {
    // Implementar conforme seu fluxo de login real
    await page.goto('/');
    
    // Exemplo básico - ajuste conforme necessário
    await page.fill('input[type="email"]', 'admin@sonatta.com.br');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Aguarda redirecionamento para dashboard
    await page.waitForURL('**/Dashboard');
    await expect(page).toHaveURL(/Dashboard/);
  });

  test('should persist authentication', async ({ authenticatedPage }) => {
    await expect(authenticatedPage).toHaveURL(/Dashboard|Clients/);
    
    const user = await authenticatedPage.evaluate(() => 
      JSON.parse(localStorage.getItem('user'))
    );
    
    expect(user.email).toBe('test@sonatta.com.br');
  });
});