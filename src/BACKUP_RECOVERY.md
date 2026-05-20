# Backup & Disaster Recovery - Sonatta SaaS

## Visão Geral

Sistema completo de backup automático com retenção de 30 dias e plano de recuperação.

**RTO (Recovery Time Objective):** 1 hora
**RPO (Recovery Point Objective):** 24 horas

## Arquitetura

```
Daily Schedule (02:00 UTC)
    ↓
Backup Function
    ↓
├── AWS S3 (Primary)
├── GitHub Releases (Versioning)
└── Notification (Slack)
```

## Como Funciona

### 1. Backup Automático (GitHub Actions)

**Cronograma:** Diariamente às 02:00 UTC

```yaml
# .github/workflows/backup.yml
- schedule: '0 2 * * *'  # 02:00 UTC = 23:00 BRT
```

**Processo:**
1. Invoca função `backupDatabase`
2. Exporta todas as 13 entidades principais
3. Salva em S3 + GitHub Releases
4. Notifica via Slack
5. Remove backups com > 30 dias

### 2. Backup Manual

Via UI em `/BackupRestore`:

```javascript
// Clica em "Baixar Backup Agora"
// ↓
// Exporta JSON com todos os dados
// ↓
// Download automático (backup-YYYYMMDD.json)
```

### 3. Restauração

**Manual:**
1. Navegue para `/BackupRestore`
2. Clique "Selecionar Arquivo"
3. Escolha backup .json
4. Confirme (⚠️ Substitui dados atuais)

**Automática (em caso de desastre):**
```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -F "backup_file=@backup-20260520.json" \
  https://sonatta.com.br/api/functions/restoreDatabase
```

## Entidades Cobertas

✅ Tenant
✅ Client
✅ Sale
✅ Installment
✅ Quote
✅ Contract
✅ Appointment
✅ Test
✅ Professional
✅ DeviceRepair
✅ Product
✅ Expense
✅ StockMovement

## Configuração AWS S3

```bash
# 1. Criar bucket
aws s3 mb s3://sonatta-backups

# 2. Habilitar versionamento
aws s3api put-bucket-versioning \
  --bucket sonatta-backups \
  --versioning-configuration Status=Enabled

# 3. Habilitar criptografia
aws s3api put-bucket-encryption \
  --bucket sonatta-backups \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# 4. Configurar lifecycle (deletar após 30 dias)
aws s3api put-bucket-lifecycle-configuration \
  --bucket sonatta-backups \
  --lifecycle-configuration file://lifecycle.json
```

### lifecycle.json
```json
{
  "Rules": [
    {
      "Id": "DeleteOldBackups",
      "Status": "Enabled",
      "Prefix": "backups/",
      "Expiration": {
        "Days": 30
      }
    }
  ]
}
```

## Secrets GitHub Necessários

Configure em Settings > Secrets:

```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_BACKUP_BUCKET = sonatta-backups
BACKUP_API_TOKEN
API_URL
SLACK_WEBHOOK
```

## Testando Backup

```bash
# Teste manual
npm run test:backup

# Ver status do último backup
curl -H "Authorization: Bearer $TOKEN" \
  https://sonatta.com.br/api/functions/backupDatabase
```

## Cenários de Desastre

### 1. Perda Parcial de Dados
```bash
# Restaura apenas dados críticos
curl -X POST ... -F "restore_entities=Client,Sale,Contract"
```

### 2. Corrupção de Banco
```bash
# 1. Escolha backup anterior
# 2. Gere backup atual (segurança)
# 3. Restaure backup anterior
# 4. Valide dados
# 5. Monitore por 24h
```

### 3. Servidor Inteiro Cai
```bash
# 1. Provisiona novo servidor
# 2. Instala app
# 3. Restaura dados do backup mais recente
# 4. Valida integridade
# 5. Notifica usuários
# ETA: ~1 hora
```

## Validação de Backup

Após cada restore, verificar:

```javascript
// Check record counts
const clients = await base44.entities.Client.list('-updated_date', 1);
const sales = await base44.entities.Sale.list('-updated_date', 1);
const contracts = await base44.entities.Contract.list('-updated_date', 1);

console.log(`Clients: ${clients.length}, Sales: ${sales.length}, Contracts: ${contracts.length}`);
```

## Monitoring

### Alertas Automáticos

✅ Backup falhou
✅ Backup > 5 GB
✅ Sem backup por > 24h
✅ S3 bucket inacessível

Todos com notificação Slack.

### Dashboard Backup

Visualizar em `/BackupRestore`:

- ✓ Data do último backup
- ✓ Tamanho em S3
- ✓ Status de restauração
- ✓ Histórico dos últimos 30

## Checklist Pré-Produção

- [ ] AWS S3 bucket criado
- [ ] Lifecycle policy configurado
- [ ] Secrets GitHub configurados
- [ ] Primeiro backup executado
- [ ] Restauração testada
- [ ] Slack webhook funcionando
- [ ] Page `/BackupRestore` acessível
- [ ] RTO/RPO documentados
- [ ] Runbooks criados para desastre

## Custos

| Item | Estimativa |
|------|-----------|
| S3 Storage (30 dias) | ~$1-2/mês |
| S3 Requests | ~$0.1/mês |
| Transfer | Grátis (mesmo region) |
| **Total** | **~$2/mês** |

## Próximos Passos

1. ✅ Backup automático diário
2. ⏳ Replicação multi-region
3. ⏳ Point-in-time recovery
4. ⏳ Backup encryption com KMS
5. ⏳ Audit log de backups/restores