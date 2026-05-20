# Deployment Guide - Sonatta SaaS

## CI/CD Pipeline

O projeto usa **GitHub Actions** para automatizar testes, build e deploy.

### Workflows

1. **Tests** (test.yml) - Rodado em push/PR
   - Testa em Node 18.x e 20.x
   - Executa linting
   - Roda testes unitários
   - Faz upload de cobertura para Codecov

2. **Lint** (lint.yml) - Code quality
   - Valida estilo de código
   - Verifica vulnerabilidades npm

3. **Build** (build.yml) - Build artifacts
   - Compila a aplicação
   - Faz upload do dist para artifacts

4. **Deploy Production** (deploy-production.yml) - Automático ao fazer push em `main`
   - Roda testes
   - Build
   - Deploy para GitHub Pages
   - Notifica Slack

## Ambiente Local

### Docker Compose
```bash
# Build and run
docker-compose up -d

# Acessa em http://localhost (via Nginx com SSL)
```

### Variáveis de Ambiente
Crie um `.env` na raiz:
```
VITE_API_URL=https://api.sonatta.com.br
```

## Deploy Manual

### GitHub Pages
1. Fazer push em `main` (dispara automaticamente)
2. Verificar Actions tab para status

### Docker Hub (opcional)
```bash
docker build -t sonatta:latest .
docker tag sonatta:latest seu-docker-user/sonatta:latest
docker push seu-docker-user/sonatta:latest
```

### Vercel/Netlify
1. Conectar repo ao Vercel/Netlify
2. Build command: `npm run build`
3. Publish directory: `dist`

## Secrets Necessários

Configure no GitHub Settings > Secrets:

- `VITE_API_URL` - URL da API em produção
- `SLACK_WEBHOOK` - Para notificações (opcional)
- `CODECOV_TOKEN` - Para upload de cobertura (opcional)

## Monitoramento

### Logs
```bash
# Ver logs do container
docker logs sonatta-app-1

# Com tail em tempo real
docker logs -f sonatta-app-1
```

### Health Check
```bash
curl http://localhost:3000
```

## Rollback

Se o deploy quebrou:
1. Reverter último commit em `main`
2. Push (ativa novo workflow)
3. Ou usar GitHub Deployments para revert automático

## Checklist Pré-Produção

- [ ] Testes passando (100% coverage >= 80%)
- [ ] Lint sem erros
- [ ] Build sem warnings
- [ ] Variáveis de ambiente configuradas
- [ ] SSL certificate válido
- [ ] Backup database configurado
- [ ] Monitoring (Sentry, etc) ativo
- [ ] Rate limiting testado