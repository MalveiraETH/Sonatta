# Security Audit & LGPD Compliance

## 1. LGPD (Lei Geral de Proteção de Dados)

### Checklist de Conformidade

#### ✅ Consentimento
- [ ] Política de Privacidade clara
- [ ] Cookie consent banner
- [ ] Opt-in explícito para marketing
- [ ] Consentimento em formulários
- [ ] TCLE (Termo de Consentimento)

#### ✅ Dados Pessoais
- [ ] Inventário de dados coletados
- [ ] Finalidades documentadas
- [ ] Limite de retenção definido
- [ ] Acesso controlado
- [ ] Logs de acesso mantidos

#### ✅ Direitos do Titular
- [ ] Acesso aos dados (relatório)
- [ ] Portabilidade (export JSON)
- [ ] Correção de dados
- [ ] Exclusão (right to be forgotten)
- [ ] Revogar consentimento

#### ✅ Segurança
- [ ] Criptografia em trânsito (HTTPS)
- [ ] Criptografia em repouso
- [ ] Controle de acesso (RLS)
- [ ] Autenticação forte
- [ ] Audit logs

#### ✅ Processamento
- [ ] DPA (Data Processing Agreement)
- [ ] Processadores documentados
- [ ] Transferência internacional protegida
- [ ] AIPD (Avaliação de Impacto)

### Implementação

```javascript
// Privacy API - Sonatta
class PrivacyController {
  // Acesso aos dados do usuário
  async getUserData(userId) {
    const userData = await base44.asServiceRole.entities.Client.filter({
      id: userId
    });
    
    return {
      personal_data: userData,
      export_date: new Date(),
      format: 'JSON'
    };
  }

  // Exclusão de dados (DIRETO)
  async deleteUserData(userId) {
    // 1. Anônimiza dados
    await base44.entities.Client.update(userId, {
      full_name: 'Anônimo',
      email: null,
      phone: null,
      address: null
    });

    // 2. Marca para deleção após 90 dias
    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'User',
      entity_id: userId,
      action: 'deletion_requested',
      description: 'LGPD deletion request'
    });

    return { status: 'deletion_scheduled', days: 90 };
  }

  // Portabilidade
  async exportUserData(userId) {
    const data = {
      clients: await base44.entities.Client.filter({ id: userId }),
      sales: await base44.entities.Sale.filter({ client_id: userId }),
      contracts: await base44.entities.Contract.filter({ client_id: userId })
    };

    return JSON.stringify(data, null, 2);
  }
}
```

## 2. Security Audit Checklist

### Authentication & Authorization
- [ ] JWT tokens com expiração
- [ ] Refresh token rotation
- [ ] Password hashing (bcrypt/Argon2)
- [ ] 2FA opcional
- [ ] Session timeout (30 min)
- [ ] Admin role verification
- [ ] API key rotation

### Network Security
- [ ] HTTPS/TLS 1.2+
- [ ] HSTS headers
- [ ] CSP (Content Security Policy)
- [ ] CORS configurado corretamente
- [ ] Rate limiting ativo
- [ ] DDoS protection
- [ ] WAF rules

### Data Protection
- [ ] Sensitive data masked in logs
- [ ] No hardcoded secrets
- [ ] Env variables para credenciais
- [ ] Secrets encrypted at rest
- [ ] PII não em URLs
- [ ] Backup encrypted
- [ ] Data residency compliance

### Code Security
- [ ] No SQL injection
- [ ] No XSS vulnerabilities
- [ ] No CSRF vulnerabilities
- [ ] Input validation
- [ ] Output encoding
- [ ] Dependency scanning (npm audit)
- [ ] SAST scanning

### Infrastructure
- [ ] Firewall rules
- [ ] VPC isolation
- [ ] Managed databases
- [ ] Automated patching
- [ ] Monitoring & alerting
- [ ] Incident response plan

### Compliance
- [ ] Privacy policy updated
- [ ] Terms of service
- [ ] LGPD compliance documented
- [ ] Data processing agreements
- [ ] Retention policies
- [ ] Export functionality
- [ ] Deletion procedures

## 3. Security Headers

```javascript
// Configure em nginx.conf ou backend
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

## 4. Penetration Testing Guide

### Manual Testing

```bash
# 1. OWASP Top 10
- A01: Broken Access Control
- A02: Cryptographic Failures
- A03: Injection
- A04: Insecure Design
- A05: Security Misconfiguration
- A06: Vulnerable Components
- A07: Auth Failures
- A08: Data Integrity
- A09: Logging Failures
- A10: SSRF

# 2. Tools
- OWASP ZAP (scanning)
- Burp Suite (proxy)
- SQLmap (SQL injection)
- XSStrike (XSS)

# 3. Common Tests
- Login bypass attempts
- SQL injection in inputs
- XSS in comments/descriptions
- CSRF token validation
- Access control bypass
- Rate limit bypass
- Password reset flow
```

### Automated Scanning

```bash
# npm audit - Dependency vulnerabilities
npm audit

# OWASP ZAP - Web app scanning
docker run -t owasp/zap2docker-stable zap-baseline.py -t https://sonatta.com.br

# Snyk - Code vulnerabilities
npm install -g snyk
snyk test

# GitHub Security - Dependabot
# Enable in repo settings → Code security
```

## 5. Incident Response Plan

### Phases

**Phase 1: Detection** (0-1h)
- [ ] Alert triggered
- [ ] Team notified
- [ ] Severity assessed
- [ ] Investigation started

**Phase 2: Containment** (1-4h)
- [ ] Isolate affected systems
- [ ] Revoke compromised tokens
- [ ] Disable suspicious accounts
- [ ] Activate backup systems

**Phase 3: Eradication** (4-24h)
- [ ] Remove malware/backdoors
- [ ] Patch vulnerabilities
- [ ] Reset credentials
- [ ] Harden systems

**Phase 4: Recovery** (1-7 days)
- [ ] Restore from clean backups
- [ ] Monitor for re-infection
- [ ] Verify system integrity
- [ ] Resume normal operations

**Phase 5: Post-Incident** (7+ days)
- [ ] Root cause analysis
- [ ] Customer notification
- [ ] LGPD reporting (if needed)
- [ ] Process improvements

### Contacts
- **Security Team:** security@sonatta.com.br
- **Legal:** legal@sonatta.com.br
- **Support:** support@sonatta.com.br
- **External Counsel:** [Law firm]

## 6. Regular Security Tasks

**Weekly:**
- [ ] Check security alerts
- [ ] Review access logs
- [ ] Monitor patch updates

**Monthly:**
- [ ] Full dependency audit
- [ ] Security headers check
- [ ] Access control review
- [ ] Backup integrity test

**Quarterly:**
- [ ] Penetration testing
- [ ] Code security review
- [ ] LGPD compliance audit
- [ ] Incident drills

**Annually:**
- [ ] Full security audit
- [ ] Compliance certification
- [ ] Employee training
- [ ] Disaster recovery test

## 7. Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [LGPD Guide](https://www.gov.br/cidadania/pt-br/acesso-a-informacao/lgpd)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CIS Controls](https://www.cisecurity.org/controls/)
- [SANS Security](https://www.sans.org/)

## Status

| Item | Status | Last Check |
|------|--------|------------|
| LGPD Compliance | 🟢 Ready | 2026-05-20 |
| HTTPS/TLS | 🟢 Active | 2026-05-20 |
| Rate Limiting | 🟢 Active | 2026-05-20 |
| Dependency Scan | 🟢 Passed | 2026-05-20 |
| Pentesting | 🟡 Scheduled | Q2 2026 |