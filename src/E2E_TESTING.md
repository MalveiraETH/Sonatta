# E2E Testing Guide - Sonatta

## Setup

```bash
# Instala Playwright
npx playwright install

# Rodando testes
npm run test:e2e

# Com UI interativa
npm run test:e2e:ui

# Debug mode
npm run test:e2e:debug

# Em navegador visível (headed)
npm run test:e2e:headed

# Apenas Chromium
npm run test:e2e:chromium

# Mobile Chrome
npm run test:e2e:mobile
```

## Estrutura

```
e2e/
├── fixtures/
│   └── auth.js                 # Fixture de autenticação
├── auth.e2e.js                 # Testes de login
├── clients.e2e.js              # Testes de clientes
├── sales.e2e.js                # Testes de vendas
└── performance.e2e.js          # Testes de performance
```

## Testes Implementados

### 1. **Auth Flow** (auth.e2e.js)
- Login/logout
- Persistência de sessão
- Redirecionamento em não autenticado

### 2. **Clients Management** (clients.e2e.js)
- Listar clientes
- Criar novo cliente
- Buscar por nome
- Filtrar por status
- Editar cliente
- Deletar cliente

### 3. **Sales Complete Flow** (sales.e2e.js)
- Criar orçamento
- Converter para venda
- Gerar NFe
- Validar métodos de pagamento
- Testar validações

### 4. **Performance** (performance.e2e.js)
- Load time < 3s
- List load < 2s
- Scroll sem lag
- Cumulative Layout Shift < 0.1

## Escrevendo Novos Testes

```javascript
import { test, expect } from './fixtures/auth.js';

test.describe('Nova Feature', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/SuaPagina');
  });

  test('deve fazer algo', async ({ authenticatedPage }) => {
    // Ação
    await authenticatedPage.click('button:has-text("Ação")');
    
    // Verificação
    await expect(authenticatedPage.locator('text=Sucesso')).toBeVisible();
  });
});
```

## Seletores Úteis

```javascript
// Por texto
await page.click('button:has-text("Enviar")');
await page.locator('text=Mensagem de sucesso');

// Por atributo
await page.fill('input[name="email"]', 'test@example.com');
await page.selectOption('select[name="tipo"]', 'valor');

// CSS
await page.locator('.my-class');
await page.locator('#my-id');

// Data-testid (recomendado)
await page.locator('[data-testid="submit-btn"]');
```

## Best Practices

1. **Use fixtures** para autenticação comum
2. **Grupo testes** com `test.describe()`
3. **Use beforeEach/afterEach** para setup/cleanup
4. **Locators dinâmicos** em vez de hard-coded
5. **Waits explícitos**: `waitForLoadState()`, `waitForURL()`
6. **Assertions claras**: use expect() com mensagens
7. **Não sleep()**: use waits apropriados

## CI/CD Integration

No GitHub Actions (já configurado):

```yaml
- name: Run E2E tests
  run: npm run test:e2e
  
- name: Upload reports
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Debugging

```bash
# Debug interativo
npm run test:e2e:debug

# Ver traces
npx playwright show-trace trace.zip

# Inspecionar elemento
page.pause()  # Pausa execução
```

## Performance Benchmarks

- Dashboard: < 3s
- Lista de Clientes: < 2s
- Criar Cliente: < 1s
- Busca/Filtro: < 1s
- CLS (layout shift): < 0.1