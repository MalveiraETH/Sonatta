# Monitoring & Logging Guide - Sonatta

## Sentry Setup

### 1. Criar Conta Sentry
- Acesse https://sentry.io
- Crie projeto React
- Copie DSN

### 2. Configurar Variáveis de Ambiente

`.env.production`:
```
VITE_SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
```

### 3. Verificar Integração

```javascript
import { captureException, captureMessage } from '@/lib/sentry';

// Erros automáticos são capturados
throw new Error('Teste');

// Ou manual
try {
  // código
} catch (error) {
  captureException(error, { context: 'meu-contexto' });
}

// Mensagens
captureMessage('Algo importante aconteceu', 'warning');
```

## Eventos Capturados Automaticamente

✅ Erros não tratados (uncaught exceptions)
✅ Promise rejections
✅ Network errors (com filtros)
✅ Performance metrics (Web Vitals)
✅ User interactions (breadcrumbs)
✅ Console.error()
✅ React Error Boundary

## Dashboard Sentry

Acesse https://sentry.io para visualizar:

### 1. **Errors/Issues**
- Frequência
- Último ocorrência
- Stack trace completo
- Usuário afetado
- Breadcrumbs (ações antes do erro)

### 2. **Performance**
- Web Vitals (LCP, FID, CLS)
- Page load times
- Transaction durations
- Slowest transactions

### 3. **Release Tracking**
- Qual versão causou bug?
- Regression detection
- Deployment tracking

### 4. **Alerting**
- Alert quando novo issue
- Alert por thresholds
- Integração Slack/Email

## Configurar Alerts

1. Alerts > Create Alert Rule
2. When: `An event is seen`
3. Where: Seu projeto
4. Send notification to: Slack/Email

## Logging Manual

```javascript
import { captureException, captureMessage, addBreadcrumb, setUser } from '@/lib/sentry';

// Set contexto do usuário
const user = await base44.auth.me();
setUser(user);

// Track ações importantes
addBreadcrumb('Usuário criou nova venda', 'sale', {
  sale_id: '123',
  amount: 5000
});

// Erros críticos
try {
  await processPagamento(venda);
} catch (error) {
  captureException(error, {
    sale_id: venda.id,
    amount: venda.total,
    payment_method: venda.payment_method
  });
}

// Avisos
captureMessage(`Venda #${sale.id} aguardando pagamento por 30 dias`, 'warning');
```

## Backend Logging

Backend (Deno) - logs vão para console e são persistidos:

```javascript
// Função logError.js já configurada
const response = await base44.functions.invoke('logError', {
  error: {
    message: err.message,
    stack: err.stack
  },
  context: {
    sale_id: '123',
    user_id: 'user-123'
  },
  level: 'error'
});
```

## Métricas por Plano

| Métrica | Gratuito | Básico | Premium |
|---------|----------|--------|---------|
| Events/mês | 10k | 100k | Ilimitado |
| Retention | 7 dias | 30 dias | 90 dias |
| Team members | 1 | 5 | Ilimitado |
| Integrations | Básico | Total | Total |

## Health Checks

Endpoint para monitorar saúde da app:

```javascript
// GET /api/health
{
  status: "healthy",
  timestamp: "2026-05-20T10:30:00Z",
  uptime: 86400,
  errors_last_hour: 0,
  response_time_ms: 45
}
```

## Dashboards Úteis

### Dashboard 1: Overview
- Events por dia
- Top issues
- Top transactions lentos
- Usuários únicos afetados

### Dashboard 2: Performance
- LCP (Largest Contentful Paint)
- FID (First Input Delay)
- CLS (Cumulative Layout Shift)
- Custom metrics

### Dashboard 3: Vendas
- Erro durante checkout?
- Stripe webhooks falhando?
- Rate limiting triggers

## Troubleshooting

### Eventos não aparecem em Sentry
1. Verifica se DSN está correto
2. Verifica se `enabled: true` em dev/prod
3. Verifica console para erros
4. Test: `captureMessage('teste')`

### Muito ruído (muitos erros irrelevantes)
1. Adiciona filtro em `beforeSend`
2. Ignora erros de rede genéricos
3. Ignora erros de 3rd party scripts

### Performance metrics não aparecem
1. Verifica se `tracesSampleRate > 0`
2. Verifica se BrowserTracing integrado
3. Aguarda 5 minutos para dados chegar

## SLA & Uptime

Acompanhar em dashboard:
- Status page: status.sonatta.com.br
- Uptime Robot: para monitorar disponibilidade
- Alertas: erro > 5% em 1 hora

## Próximos Passos

- [ ] Configurar alerts em Slack
- [ ] Custom dashboards por métrica
- [ ] Alert para performance regressions
- [ ] Weekly reports automáticos
- [ ] On-call rotation setup