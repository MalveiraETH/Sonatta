import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Palavras que EXCLUEM um item de ser considerado bateria
const EXCLUDE_KEYWORDS = ['cerustop', 'protetor de cera', 'cera', 'molde', 'receptor', 'gancho', 'oliva', 'tubo', 'carregador', 'desumidificador'];

// Palavras que CONFIRMAM que é bateria/pilha
const BATERIA_KEYWORDS = ['bateria', 'pilha', 'zinc air', 'pr41', 'pr44', 'pr48', 'pr70', 'size 10', 'size 13', 'size 312', 'size 675'];

const PILHAS_POR_CARTELA = 6;
const DIAS_POR_PILHA = 6; // duração média de 1 pilha em dias

function isBateriaItem(item) {
  const name = (item.product_name || '').toLowerCase();
  const cat = (item.product_category || '').toLowerCase();
  if (EXCLUDE_KEYWORDS.some(kw => name.includes(kw))) return false;
  const nameMatch = BATERIA_KEYWORDS.some(kw => name.includes(kw));
  const catMatch = cat === 'bateria' || cat === 'pilha';
  return nameMatch || catMatch;
}

// Calcula duração total em dias com base nas cartelas compradas e se usa par
function calcularDuracaoDias(totalCartelas, bilateral) {
  const totalPilhas = totalCartelas * PILHAS_POR_CARTELA;
  const fator = bilateral ? 2 : 1; // par consome o dobro
  return Math.floor((totalPilhas * DIAS_POR_PILHA) / fator);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Busca todas as vendas não canceladas
    const sales = await base44.asServiceRole.entities.Sale.filter({ status: ['pendente', 'pago'] }, '-sale_date', 2000);

    // Filtra vendas que contêm baterias
    const salesComBateria = sales.filter(sale =>
      sale.items?.some(item => isBateriaItem(item))
    );

    // Busca dados dos clientes para obter birth_date e uso_aparelhos
    const clienteIds = [...new Set(salesComBateria.map(s => s.client_id).filter(Boolean))];
    const clienteDataMap = {};
    for (let i = 0; i < clienteIds.length; i += 50) {
      const batch = clienteIds.slice(i, i + 50);
      const found = await base44.asServiceRole.entities.Client.filter({ id: { $in: batch } }, null, 50);
      found.forEach(c => { clienteDataMap[c.id] = c; });
    }

    // Agrupa por cliente — soma TODAS as cartelas da última compra e acumula histórico
    const clienteMap = {};
    for (const sale of salesComBateria) {
      const bateriaItems = sale.items.filter(item => isBateriaItem(item));
      // quantity = número de cartelas vendidas neste item
      const cartelasNaVenda = bateriaItems.reduce((s, i) => s + (i.quantity || 1), 0);

      if (!clienteMap[sale.client_id]) {
        const clienteData = clienteDataMap[sale.client_id];
        clienteMap[sale.client_id] = {
          client_id: sale.client_id,
          client_name: sale.client_name,
          client_phone: sale.client_phone,
          birth_date: clienteData?.birth_date || null,
          uso_aparelhos: clienteData?.uso_aparelhos || 'unilateral',
          ultima_compra: sale.sale_date || sale.created_date,
          total_compras: 1,
          total_baterias: cartelasNaVenda,       // total de cartelas (histórico)
          cartelas_ultima_compra: cartelasNaVenda, // cartelas da compra mais recente
          ultima_venda_id: sale.id,
        };
      } else {
        clienteMap[sale.client_id].total_compras += 1;
        clienteMap[sale.client_id].total_baterias += cartelasNaVenda;
        const existing = clienteMap[sale.client_id].ultima_compra;
        const current = sale.sale_date || sale.created_date;
        if (current > existing) {
          clienteMap[sale.client_id].ultima_compra = current;
          clienteMap[sale.client_id].ultima_venda_id = sale.id;
          clienteMap[sale.client_id].cartelas_ultima_compra = cartelasNaVenda;
        }
      }
    }

    const hoje = new Date();
    const clientes = Object.values(clienteMap).map((c) => {
      const ultima = new Date(c.ultima_compra);
      const diasDesdeCompra = Math.floor((hoje.getTime() - ultima.getTime()) / (1000 * 60 * 60 * 24));
      const bilateral = c.uso_aparelhos === 'bilateral';

      // Duração prevista com base nas cartelas da última compra
      const duracaoPrevistaDias = calcularDuracaoDias(c.cartelas_ultima_compra, bilateral);

      // Dias restantes (pode ser negativo = já acabou)
      const diasRestantes = duracaoPrevistaDias - diasDesdeCompra;

      // Data prevista de término
      const dataTermino = new Date(ultima.getTime() + duracaoPrevistaDias * 86400000);

      // Estágio baseado nos dias restantes
      let estagio;
      if (diasRestantes <= 0) {
        estagio = 'urgente'; // pilhas já esgotadas
      } else if (diasRestantes <= 15) {
        estagio = 'atencao'; // menos de 15 dias restantes
      } else {
        estagio = 'recente'; // ainda tem estoque
      }

      return {
        ...c,
        dias_desde_compra: diasDesdeCompra,
        duracao_prevista_dias: duracaoPrevistaDias,
        dias_restantes: diasRestantes,
        data_termino_prevista: dataTermino.toISOString().split('T')[0],
        estagio,
      };
    });

    clientes.sort((a, b) => a.dias_restantes - b.dias_restantes); // mais urgente primeiro

    const stats = {
      total: clientes.length,
      urgente: clientes.filter(c => c.estagio === 'urgente').length,
      atencao: clientes.filter(c => c.estagio === 'atencao').length,
      recente: clientes.filter(c => c.estagio === 'recente').length,
    };

    return Response.json({ clientes, stats });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});