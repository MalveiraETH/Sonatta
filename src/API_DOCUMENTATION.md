# Sonatta API Documentation

## Visão Geral

API REST completa para gerenciar clínicas auditivas multi-tenant com suporte para:

- **Clientes** - Gestão de dados dos pacientes
- **Vendas** - Processar pedidos e pagamentos
- **Agendamentos** - Agendar consultas e testes
- **Estoque** - Gerenciar produtos e dispositivos
- **Financeiro** - Controlar receitas e despesas
- **Backup** - Backup e restauração de dados

## Autenticação

Todas as requisições requerem um JWT token no header:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://api.sonatta.com.br/api/functions/checkPlanLimits
```

## Endpoints Principais

### Backup & Restore

#### Criar Backup
```http
POST /api/functions/backupDatabase
Authorization: Bearer {token}

Response:
{
  "timestamp": "2026-05-20T10:30:00Z",
  "entities": {
    "Client": { "count": 150, "records": [...] },
    "Sale": { "count": 300, "records": [...] }
  }
}
```

#### Restaurar Backup
```http
POST /api/functions/restoreDatabase
Authorization: Bearer {token}
Content-Type: application/json

{
  "backup_file": "backup-20260520.json"
}

Response:
{
  "success": true,
  "restored": 2500,
  "errors": 0,
  "timestamp": "2026-05-20T10:35:00Z"
}
```

### Planos & Limites

#### Verificar Limites do Plano
```http
POST /api/functions/checkPlanLimits
Authorization: Bearer {token}

Response:
{
  "plan": "premium",
  "limits": {
    "clients": 5000,
    "monthly_transactions": 10000,
    "users": 20
  },
  "usage": {
    "clients": 1240,
    "monthly_transactions": 3500,
    "users": 8
  },
  "percentUsed": {
    "clients": 24.8,
    "monthly_transactions": 35,
    "users": 40
  }
}
```

### Notificações por Email

#### Enviar Email
```http
POST /api/functions/sendNotificationEmail
Authorization: Bearer {token}
Content-Type: application/json

{
  "to": "client@example.com",
  "subject": "Confirmação de Venda",
  "template": "sale_confirmation",
  "data": {
    "sale_number": "SAL-2026-001",
    "total": 5000,
    "client_name": "João Silva"
  }
}

Response:
{
  "success": true,
  "message_id": "msg-123456"
}
```

### Entities (CRUD)

Todas as entidades seguem o mesmo padrão:

#### Listar
```javascript
const clients = await base44.entities.Client.list('-updated_date', 50);
```

#### Criar
```javascript
const newClient = await base44.entities.Client.create({
  full_name: 'João Silva',
  phone: '92991234567',
  email: 'joao@example.com'
});
```

#### Atualizar
```javascript
await base44.entities.Client.update(clientId, {
  phone: '92999999999'
});
```

#### Deletar
```javascript
await base44.entities.Client.delete(clientId);
```

#### Filtrar
```javascript
const activeSales = await base44.entities.Sale.filter({
  status: 'pago',
  created_date: { $gte: '2026-05-01' }
});
```

## Rate Limiting

API tem rate limiting automático:

- **Free Plan:** 100 requisições/minuto
- **Basic Plan:** 500 requisições/minuto
- **Premium Plan:** 2000 requisições/minuto

Headers de resposta:
```
X-RateLimit-Limit: 500
X-RateLimit-Remaining: 487
X-RateLimit-Reset: 1663001234
```

Se limite excedido: `HTTP 429 Too Many Requests`

## Erros

Todas as respostas de erro seguem este formato:

```json
{
  "error": "Invalid request",
  "message": "Field 'email' is required",
  "code": "VALIDATION_ERROR",
  "details": {
    "field": "email",
    "rule": "required"
  }
}
```

## Paginação

```javascript
// Listar com limite e offset
const clients = await base44.entities.Client.list('-updated_date', 50);
// Retorna primeiros 50 registros

// Para próxima página
const nextPage = await base44.entities.Client.filter({}, '-updated_date', 50, 50);
// Retorna registros 50-100
```

## Webhooks (Em Desenvolvimento)

Eventos que disparam webhooks:

- `sale.created` - Nova venda
- `sale.updated` - Venda atualizada
- `client.created` - Novo cliente
- `payment.received` - Pagamento recebido
- `backup.completed` - Backup concluído

## SDKs

### JavaScript/TypeScript
```javascript
import { base44 } from '@/api/base44Client';

const clients = await base44.entities.Client.list();
```

### cURL
```bash
curl -X GET \
  -H "Authorization: Bearer TOKEN" \
  https://api.sonatta.com.br/api/functions/checkPlanLimits
```

### Postman

[Importar Collection](./postman-collection.json)

## Versionamento

API usa versionamento semântico (MAJOR.MINOR.PATCH):

- **v1.0.0** - Release inicial
- **v1.1.0** - Novos endpoints (backward compatible)
- **v2.0.0** - Breaking changes

Headers da resposta indicam versão:
```
API-Version: 1.0.0
```

## Support

Dúvidas? Entre em contato:
- Email: api-support@sonatta.com.br
- Docs: https://docs.sonatta.com.br
- Status: https://status.sonatta.com.br