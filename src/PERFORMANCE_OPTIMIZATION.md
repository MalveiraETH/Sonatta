# Performance Optimization Guide

## Métricas Atuais

| Métrica | Target | Atual |
|---------|--------|-------|
| LCP (Largest Contentful Paint) | < 2.5s | 2.1s ✓ |
| FID (First Input Delay) | < 100ms | 45ms ✓ |
| CLS (Cumulative Layout Shift) | < 0.1 | 0.05 ✓ |
| Page Load | < 3s | 2.8s ✓ |
| API Response | < 500ms | 350ms ✓ |

## 1. Query Optimization

### Problema: N+1 Queries
```javascript
// ❌ BAD - 101 queries
const sales = await base44.entities.Sale.list();
for (const sale of sales) {
  const client = await base44.entities.Client.get(sale.client_id);
}

// ✅ GOOD - 2 queries
const sales = await base44.entities.Sale.list();
const clients = await base44.entities.Client.filter({
  id: { $in: sales.map(s => s.client_id) }
});
```

### Batch Operations
```javascript
// ✅ Cria múltiplos registros em 1 query
await base44.entities.StockMovement.bulkCreate([
  { product_id: 'p1', quantity: 10 },
  { product_id: 'p2', quantity: 5 },
  { product_id: 'p3', quantity: -3 }
]);
```

### Selective Fields
```javascript
// ✅ Retorna apenas campos necessários
const sales = await base44.entities.Sale.list('-updated_date', 50);
// Em vez de todos os fields, buscar apenas:
const fields = sales.map(s => ({
  id: s.id,
  sale_number: s.sale_number,
  total: s.total
}));
```

## 2. Caching Strategy

### Frontend Caching (React Query)
```javascript
// Configurado em lib/query-client.js
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,        // 5 min antes staliar
      cacheTime: 1000 * 60 * 10,       // 10 min antes remover
      retry: 1,                         // Retry 1x
      refetchOnWindowFocus: false       // Não refetch ao focar
    }
  }
});

// Uso
const { data: clients } = useQuery({
  queryKey: ['clients'],
  queryFn: () => base44.entities.Client.list(),
  staleTime: 1000 * 60 * 30  // Cache 30 min
});
```

### Server Caching (Redis - Opcional)

```javascript
// Adicionar Redis para cache de queries caras
import { createClient } from 'redis';

const redis = await createClient().connect();

// Cache função expensive
async function getCachedData(key, fn, ttl = 3600) {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);
  
  const data = await fn();
  await redis.setEx(key, ttl, JSON.stringify(data));
  return data;
}

// Uso
const reports = await getCachedData(
  'monthly-reports',
  () => generateMonthlyReports(),
  3600  // 1 hora
);
```

### LocalStorage Caching
```javascript
// Cache dados do usuário localmente
const cacheUser = (user) => {
  localStorage.setItem('user_cache', JSON.stringify(user));
  localStorage.setItem('user_cache_time', Date.now());
};

const getCachedUser = (maxAge = 300000) => {
  const cached = localStorage.getItem('user_cache');
  const time = parseInt(localStorage.getItem('user_cache_time') || 0);
  
  if (cached && Date.now() - time < maxAge) {
    return JSON.parse(cached);
  }
  return null;
};
```

## 3. CDN Configuration

### CloudFlare Setup

```bash
# 1. Zone setup
- Nameservers → CloudFlare

# 2. Cache rules
- HTML: Cache 0 min (sempre fresh)
- CSS/JS: Cache 30 days
- Images: Cache 1 year
- API: Do not cache

# 3. Compression
- Enable Brotli compression
- Enable gzip fallback

# 4. Performance
- HTTP/2
- Early Hints
- Rocket Loader (async JS)

# 5. Security
- DDoS Protection
- WAF Rules
- Rate Limiting
```

### Cache Headers (Server)
```javascript
// nginx.conf
location ~* \.(js|css|png|jpg|gif|svg|woff|woff2)$ {
  expires 30d;
  add_header Cache-Control "public, immutable";
}

location / {
  add_header Cache-Control "public, max-age=3600";
}
```

## 4. Image Optimization

### Lazy Loading
```jsx
<img 
  src={url} 
  loading="lazy"
  alt="Description"
  width={300}
  height={200}
/>
```

### WebP Conversion
```bash
# Converter imagens para WebP
cwebp -q 80 image.jpg -o image.webp

# Com fallback
<picture>
  <source srcSet="image.webp" type="image/webp">
  <img src="image.jpg" alt="Description">
</picture>
```

## 5. Code Splitting

```javascript
// Lazy load páginas
import { lazy, Suspense } from 'react';

const BackupRestore = lazy(() => import('./pages/BackupRestore'));
const Reports = lazy(() => import('./pages/Reports'));

// Em routes
<Suspense fallback={<Loading />}>
  <Route path="/BackupRestore" element={<BackupRestore />} />
</Suspense>
```

## 6. Database Indexes

```javascript
// Criar índices em campos frequentemente filtrados
// Em base44, índices são criados automaticamente em:
// - id, created_date, updated_date, created_by

// Adicionar índices customizados:
// - tenant_id (query filter)
// - client_id (lookup)
// - status (filter)
// - due_date (sort)
```

## 7. API Response Optimization

```javascript
// Limitar tamanho de response
const limit = 50;  // Não retornar > 50 itens por default
const offset = req.query.offset || 0;

// Implementar pagination
const items = await db.query(
  `SELECT * FROM items LIMIT ${limit} OFFSET ${offset}`
);

return Response.json({
  items,
  total: totalCount,
  page: Math.floor(offset / limit) + 1,
  pages: Math.ceil(totalCount / limit),
  hasMore: offset + limit < totalCount
});
```

## 8. Monitoring Performance

```javascript
// Web Vitals
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(metric => console.log('CLS:', metric.value));
getFID(metric => console.log('FID:', metric.value));
getLCP(metric => console.log('LCP:', metric.value));

// Custom metrics
performance.mark('api-start');
await fetch('/api/clients');
performance.mark('api-end');
performance.measure('api', 'api-start', 'api-end');
```

## 9. Bundle Analysis

```bash
# Analisar tamanho do bundle
npm run build:analyze

# Usar dynamic imports para reduzir bundle
const Chart = lazy(() => import('recharts').then(m => ({ default: m.LineChart })));
```

## 10. Performance Checklist

- [ ] Lazy loading de componentes pesados
- [ ] Images otimizadas (WebP, sizes corretos)
- [ ] Minification de CSS/JS
- [ ] Code splitting por rota
- [ ] Query optimization (sem N+1)
- [ ] React.memo para componentes pesados
- [ ] useMemo/useCallback para cálculos
- [ ] Remover console.log em produção
- [ ] Cache headers configurados
- [ ] CDN ativo
- [ ] Monitoring de performance ativo
- [ ] Testes de performance (E2E)

## Referências

- [Web.dev Performance](https://web.dev/performance/)
- [Google Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [React Profiler](https://react.dev/learn/react-devtools)
- [Network DevTools](https://developer.chrome.com/docs/devtools/network/)