# Security Audit & LGPD Compliance - Sonatta

## LGPD Checklist (Lei Geral de Proteção de Dados)

### ✅ Implementado

- [x] Política de Privacidade
- [x] Termos de Serviço
- [x] Consent para cookies
- [x] HTTPS/TLS 1.2+
- [x] Autenticação (JWT)
- [x] Rate limiting
- [x] Backup automático
- [x] Audit logging

### ⏳ A Implementar

- [ ] **Data Deletion on Request**
  ```javascript
  // DELETE /user-data/{user_id}
  // Remove all personal data in 30 days
  ```

- [ ] **Data Export (GDPR/LGPD)**
  ```javascript
  // GET /user-data/export
  // Returns all personal data in JSON/CSV
  ```

- [ ] **Consent Management**
  - [ ] Explicit consent for marketing
  - [ ] Consent audit trail
  - [ ] Cookie consent banner (melhoria)

- [ ] **Data Processing Agreement (DPA)**
  - [ ] Documento assinado com clientes
  - [ ] Cláusula de confidencialidade

### Privacy Controls

```javascript
// User can request data export
async function exportUserData(userId) {
  const user = await base44.entities.User.get(userId);
  const clients = await base44.entities.Client.filter({ created_by: user.email });
  const sales = await base44.entities.Sale.filter({ created_by: user.email });
  
  return {
    user,
    clients,
    sales,
    export_date: new Date().toISOString()
  };
}

// User can request full deletion
async function deleteUserData(userId, deletionDate = null) {
  const user = await base44.entities.User.get(userId);
  
  // Schedule deletion (LGPD requires 30-day window)
  await base44.entities.DeletionRequest.create({
    user_id: userId,
    requested_date: new Date(),
    scheduled_date: deletionDate || new Date(Date.now() + 30*24*60*60*1000),
    status: 'pending'
  });
}
```

## Security Hardening

### Authentication & Authorization

```javascript
// ✅ JWT com expiration
const token = jwt.sign(
  { userId: user.id, role: user.role },
  SECRET_KEY,
  { expiresIn: '24h' } // Expira em 24h
);

// ✅ Rate limiting por IP/User
const limit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // 100 requests
});

// ✅ CORS restritivo
cors({
  origin: ['https://sonatta.com.br', 'https://www.sonatta.com.br'],
  credentials: true
});

// ✅ CSRF protection
app.use(csrf({ cookie: false }));
```

### Input Validation

```javascript
// ✅ Sanitize & Validate
import { body, validationResult } from 'express-validator';

app.post('/client', [
  body('email').isEmail().normalizeEmail(),
  body('phone').matches(/^\d{10,11}$/),
  body('cpf').matches(/^\d{11}$/),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  // Process...
});
```

### SQL Injection Prevention

```javascript
// ✅ Use parameterized queries (já implementado com SDK)
const clients = await base44.entities.Client.filter({
  email: userInput // Automaticamente escapado
});

// ❌ Nunca fazer concatenação
// const query = `SELECT * FROM clients WHERE email = '${email}'`; // RUIM
```

### XSS Prevention

```javascript
// ✅ React auto-escapa conteúdo
<div>{userContent}</div> // Seguro

// ✅ DOMPurify para HTML
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />

// ❌ NUNCA fazer
// <div dangerouslySetInnerHTML={{ __html: userInput }} /> // RUIM
```

## Penetration Testing Plan

### 1. Teste de Autenticação
```bash
# Tente acessar sem token
curl https://api.sonatta.com.br/entities/Client

# Tente com token inválido
curl -H "Authorization: Bearer invalid" https://api.sonatta.com.br/entities/Client

# Tente escalar privilégios (user → admin)
curl -H "Authorization: Bearer USER_TOKEN" https://api.sonatta.com.br/admin
```

### 2. Teste de Autorização
```bash
# User A tenta acessar dados de User B
curl -H "Authorization: Bearer USER_A_TOKEN" \
  https://api.sonatta.com.br/entities/Client?created_by=user_b@example.com

# Tente deletar registro de outro usuário
curl -X DELETE -H "Authorization: Bearer USER_TOKEN" \
  https://api.sonatta.com.br/entities/Client/{ANOTHER_USERS_ID}
```

### 3. Teste de Injeção
```bash
# SQL Injection
curl "https://api.sonatta.com.br/entities/Client?search='; DROP TABLE clients; --"

# NoSQL Injection (se aplicável)
curl "https://api.sonatta.com.br/entities/Client?email={\$ne:null}"

# XSS
curl -X POST https://api.sonatta.com.br/entities/Client \
  -d '{"name":"<script>alert(1)</script>"}'
```

### 4. Teste de Rate Limiting
```bash
# Faça 200 requisições rápidas
for i in {1..200}; do
  curl -s https://api.sonatta.com.br/entities/Client &
done
wait

# Deve receber 429 Too Many Requests após limite
```

### 5. Teste de CORS
```bash
# De um domínio não autorizado
curl -H "Origin: https://attacker.com" \
  -H "Access-Control-Request-Method: POST" \
  https://api.sonatta.com.br/entities/Client
```

## Security Headers

```nginx
# Adicionar ao Nginx:
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload";
add_header X-Content-Type-Options "nosniff";
add_header X-Frame-Options "SAMEORIGIN";
add_header X-XSS-Protection "1; mode=block";
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'";
add_header Referrer-Policy "strict-origin-when-cross-origin";
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()";
```

## Logging & Monitoring

```javascript
// Log todas ações de usuários
await base44.entities.AuditLog.create({
  entity_type: 'Client',
  entity_id: clientId,
  action: 'create',
  user_id: user.id,
  user_email: user.email,
  ip_address: req.ip,
  timestamp: new Date(),
  details: { /* diff */ }
});

// Alertar em atividades suspeitas
if (failed_logins > 5) {
  sendAlert(`${email} - 5 tentativas de login falhadas`);
}
```

## Vulnerability Scanning

```bash
# OWASP Dependency Check
npm audit

# Snyk scanning
snyk test

# SonarQube
sonar-scanner

# NIST Security Checklist
# https://csrc.nist.gov/projects/web-security
```

## Pre-Production Security Checklist

- [ ] Penetration testing completado
- [ ] OWASP Top 10 validado
- [ ] Dependencies auditadas
- [ ] Secrets não expostos em repo
- [ ] HTTPS/TLS configurado
- [ ] Security headers configurados
- [ ] Rate limiting ativo
- [ ] Logging & monitoring ativo
- [ ] Backup & DR testado
- [ ] LGPD compliance validado
- [ ] Privacy Policy assinado
- [ ] DPA assinado com clientes
- [ ] Incident response plan criado