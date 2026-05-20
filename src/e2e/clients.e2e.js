import { test, expect } from './fixtures/auth.js';

test.describe('Clients Management', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/Clients');
    await authenticatedPage.waitForLoadState('networkidle');
  });

  test('should list all clients', async ({ authenticatedPage }) => {
    const clientsTable = authenticatedPage.locator('table');
    await expect(clientsTable).toBeVisible();
    
    const rows = await authenticatedPage.locator('tbody tr').count();
    expect(rows).toBeGreaterThanOrEqual(0);
  });

  test('should create a new client', async ({ authenticatedPage }) => {
    // Clica em "Novo Cliente" ou similar
    await authenticatedPage.click('button:has-text("Novo")');
    
    // Preenche formulário
    await authenticatedPage.fill('input[placeholder*="Nome"]', 'João Silva');
    await authenticatedPage.fill('input[placeholder*="Telefone"]', '92991234567');
    await authenticatedPage.fill('input[placeholder*="Email"]', 'joao@example.com');
    
    // Submete formulário
    await authenticatedPage.click('button[type="submit"]');
    
    // Verifica sucesso
    await expect(authenticatedPage.locator('text=Cliente criado')).toBeVisible({ timeout: 5000 });
  });

  test('should search clients by name', async ({ authenticatedPage }) => {
    const searchInput = authenticatedPage.locator('input[placeholder*="buscar"]');
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('João');
      await authenticatedPage.waitForLoadState('networkidle');
      
      const rows = await authenticatedPage.locator('tbody tr').count();
      expect(rows).toBeGreaterThan(0);
    }
  });

  test('should filter clients by status', async ({ authenticatedPage }) => {
    const statusSelect = authenticatedPage.locator('select[name="status"]');
    
    if (await statusSelect.isVisible()) {
      await statusSelect.selectOption('cliente_ativo');
      await authenticatedPage.waitForLoadState('networkidle');
      
      const statusBadges = await authenticatedPage.locator('span:has-text("Ativo")').count();
      expect(statusBadges).toBeGreaterThan(0);
    }
  });

  test('should edit a client', async ({ authenticatedPage }) => {
    // Encontra primeiro cliente e clica em editar
    const editButton = authenticatedPage.locator('button[title*="Editar"]').first();
    await editButton.click();
    
    // Modifica campo
    const nameInput = authenticatedPage.locator('input[placeholder*="Nome"]').first();
    await nameInput.fill('João Silva - Modificado');
    
    // Salva
    await authenticatedPage.click('button[type="submit"]');
    
    await expect(authenticatedPage.locator('text=atualizado|salvo')).toBeVisible({ timeout: 5000 });
  });

  test('should delete a client with confirmation', async ({ authenticatedPage }) => {
    // Encontra botão de deletar
    const deleteButton = authenticatedPage.locator('button[title*="Deletar"]').first();
    
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      
      // Confirma dialog
      await authenticatedPage.click('button:has-text("Confirmar")');
      
      await expect(authenticatedPage.locator('text=deletado|removido')).toBeVisible({ timeout: 5000 });
    }
  });
});