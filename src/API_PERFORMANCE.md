# Performance Optimization Guide - Sonatta

## Caching Strategy

### 1. Frontend Cache (localStorage + IndexedDB)

```javascript
// Cache cliente list por 5 minutos
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getCachedClients() {
  const cached = localStorage.getItem('clients_cache');
  const timestamp = localStorage.getItem('clients_cache_time');
  
  if (cached && timestamp && Date.now() - parseInt(timestamp) < CACHE_TTL) {
    return JSON.parse(cached);
  }
  
  const clients = await base44.entities.Client.list();
  localStorage.setItem('clients_cache', JSON.stringify(clients));
  localStorage.setItem('clients_cache_time', Date.now().toString());
  return clients;
}

// Invalidar cache quando necessário
function invalidateClientsCache() {
  localStorage.removeItem('clients_cache');
  localStorage.removeItem('clients_cache_time');
}
```

### 2. Query Optimization

```javascript
// ❌ Ruim: Busca TODOS os clientes
const allClients = await base44.entities.Client.list();

// ✅ Bom: Paginação + Filtro
const clients = await base44.entities.Client.list('-updated_date', 20);
const filtered = await base44.entities.Client.filter({ status: 'cliente_ativo' }, '-updated_date', 20);

// ✅ Bom: Busca específica
const client = await base44.entities.Client.get(clientId);
```

### 3. Lazy Loading

```javascript
// Carrega apenas o que é visível
import { useInView } from 'react-intersection-observer';

export function LazyList({ items }) {
  const { ref, inView } = useInView({ threshold: 0.1 });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (inView && !loaded) {
      // Carrega dados
      setLoaded(true);
    }
  }, [inView]);

  return <div ref={ref}>{loaded ? <Items /> : <Skeleton />}</div>;
}
```

### 4. Image Optimization

```javascript
// Usar srcset para images responsivas
<img 
  src="logo-500.webp" 
  srcSet="logo-300.webp 300w, logo-500.webp 500w, logo-1000.webp 1000w"
  sizes="(max-width: 600px) 300px, 500px"
  alt="Logo"
/>

// Ou usar picture tag
<picture>
  <source srcSet="logo.webp" type="image/webp" />
  <source srcSet="logo.png" type="image/png" />
  <img src="logo.png" alt="Logo" />
</picture>
```

### 5. React Query Cache

```javascript
import { useQuery } from '@tanstack/react-query';

// Automático com cache de 5 minutos
const { data: clients } = useQuery({
  queryKey: ['clients'],
  queryFn: () => base44.entities.Client.list(),
  staleTime: 5 * 60 * 1000, // 5 minutos
  cacheTime: 10 * 60 * 1000, // 10 minutos
});
```

## Web Vitals Target

| Métrica | Target | Atual |
|---------|--------|-------|
| LCP (Largest Contentful Paint) | < 2.5s | ? |
| FID (First Input Delay) | < 100ms | ? |
| CLS (Cumulative Layout Shift) | < 0.1 | ? |
| FCP (First Contentful Paint) | < 1.8s | ? |

## Performance Checklist

- [ ] Lazy load images
- [ ] Code splitting por rota
- [ ] Minify JS/CSS
- [ ] Gzip compression
- [ ] Cache headers corretos
- [ ] Defer non-critical JS
- [ ] Preload critical resources
- [ ] Remove unused CSS
- [ ] Optimize fonts
- [ ] Usar HTTP/2

## Monitoring

```javascript
// Medir Web Vitals
import { onCLS, onFID, onLCP } from 'web-vitals';

onLCP(metric => console.log('LCP:', metric.value));
onFID(metric => console.log('FID:', metric.value));
onCLS(metric => console.log('CLS:', metric.value));

// Enviar para Sentry
onLCP(metric => Sentry.captureMessage(`LCP: ${metric.value}ms`));
```

## Redis Cache (Próximo)

```javascript
// Futuro: Cache server-side com Redis
async function getCachedSales() {
  // Check Redis primeiro
  const cached = await redis.get('sales:latest');
  if (cached) return JSON.parse(cached);
  
  // Senão, query DB e cache
  const sales = await base44.entities.Sale.list('-updated_date', 100);
  await redis.set('sales:latest', JSON.stringify(sales), 'EX', 300);
  return sales;
}
``