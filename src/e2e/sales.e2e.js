import { test, expect } from './fixtures/auth.js';

test.describe('Sales Flow - Complete', () => {
  test('should complete full sales flow: Quote → Sale → Invoice', async ({ authenticatedPage }) => {
    // 1. Navega para Orçamentos
    await authenticatedPage.goto('/Quotes');
    await authenticatedPage.waitForLoadState('networkidle');

    // 2. Cria novo orçamento
    await authenticatedPage.click('button:has-text("Novo")');
    
    // Seleciona cliente
    await authenticatedPage.click('input[placeholder*="Cliente"]');
    await authenticatedPage.click('text=João Silva');
    
    // Adiciona item
    await authenticatedPage.click('button:has-text("Adicionar Item")');
    await authenticatedPage.fill('input[placeholder*="Produto"]', 'Aparelho Auditivo');
    await authenticatedPage.fill('input[placeholder*="Quantidade"]', '1');
    await authenticatedPage.fill('input[placeholder*="Preço"]', '5000');
    
    // Salva orçamento
    await authenticatedPage.click('button[type="submit"]');
    await expect(authenticatedPage.locator('text=Orçamento criado')).toBeVisible({ timeout: 5000 });

    // 3. Converte para venda
    const quoteNumber = await authenticatedPage.locator('text=/Orçamento #[0-9]+/').first().textContent();
    await authenticatedPage.click(`button:has-text("Converter")`);
    
    // Confirma conversão
    await authenticatedPage.click('button:has-text("Confirmar")');
    
    // 4. Verifica se venda foi criada
    await authenticatedPage.goto('/Sales');
    await authenticatedPage.waitForLoadState('networkidle');
    
    const saleExists = await authenticatedPage.locator(`text=${quoteNumber.replace('Orçamento', 'Venda')}`).count() > 0;
    expect(saleExists).toBeTruthy();
    
    // 5. Gera NFe
    await authenticatedPage.click('button:has-text("NFe")');
    await expect(authenticatedPage.locator('text=Nota Fiscal')).toBeVisible({ timeout: 5000 });
  });

  test('should handle payment methods correctly', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/Sales');
    
    await authenticatedPage.click('button:has-text("Nova Venda")');
    
    // Seleciona método de pagamento PIX parcelado
    await authenticatedPage.click('select[name="paymentMethod"]');
    await authenticatedPage.selectOption('pix_parcelado');
    
    // Define parcelamento
    await authenticatedPage.fill('input[name="installments"]', '3');
    
    // Verifica se taxas foram calculadas
    const feeAmount = await authenticatedPage.locator('text=/Taxa:.*R\$/').textContent();
    expect(feeAmount).toBeTruthy();
  });

  test('should validate sales data before submission', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/Sales');
    await authenticatedPage.click('button:has-text("Nova Venda")');
    
    // Tenta submeter sem preencher campos obrigatórios
    await authenticatedPage.click('button[type="submit"]');
    
    // Verifica erros de validação
    const errorMessages = await authenticatedPage.locator('.text-red-500, .text-destructive').count();
    expect(errorMessages).toBeGreaterThan(0);
  });
});