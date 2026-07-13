import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const ciclo = body.ciclo_dias || 90;

    // Busca todas as vendas não canceladas
    const sales = await base44.asServiceRole.entities.Sale.filter({ status: ['pendente', 'pago'] }, '-sale_date', 2000);

    // Filtra vendas que contêm baterias
    const salesComBateria = sales.filter(sale =>
      sale.items?.some(item => item.product_category === 'bateria' || item.product_name?.toLowerCase().includes('bateria') || item.product_name?.toLowerCase().includes('pilha'))
    );

    // Agrupa por cliente (mantém a última compra de bateria)
    const clienteMap = {};
    for (const sale of salesComBateria) {
      const bateriaItems = sale.items.filter(item =>
        item.product_category === 'bateria' || item.product_name?.toLowerCase().includes('bateria') || item.product_name?.toLowerCase().includes('pilha')
      );
      const qtd = bateriaItems.reduce((s, i) => s + (i.quantity || 1), 0);

      if (!clienteMap[sale.client_id]) {
        clienteMap[sale.client_id] = {
          client_id: sale.client_id,
          client_name: sale.client_name,
          client_phone: sale.client_phone,
          ultima_compra: sale.sale_date || sale.created_date,
          total_compras: 1,
          total_baterias: qtd,
          ultima_venda_id: sale.id,
        };
      } else {
        clienteMap[sale.client_id].total_compras += 1;
        clienteMap[sale.client_id].total_baterias += qtd;
        // mantém a data mais recente
        const existing = clienteMap[sale.client_id].ultima_compra;
        const current = sale.sale_date || sale.created_date;
        if (current > existing) {
          clienteMap[sale.client_id].ultima_compra = current;
          clienteMap[sale.client_id].ultima_venda_id = sale.id;
        }
      }
    }

    const hoje = new Date();
    const clientes = Object.values(clienteMap).map((c) => {
      const ultima = new Date(c.ultima_compra);
      const dias = Math.floor((hoje.getTime() - ultima.getTime()) / (1000 * 60 * 60 * 24));
      let estagio = 'recente';
      if (dias >= ciclo) estagio = 'urgente';
      else if (dias >= ciclo * 0.67) estagio = 'atencao';
      return { ...c, dias_desde_compra: dias, estagio };
    });

    // Ordena por dias decrescente (mais urgentes primeiro)
    clientes.sort((a, b) => b.dias_desde_compra - a.dias_desde_compra);

    const stats = {
      total: clientes.length,
      urgente: clientes.filter(c => c.estagio === 'urgente').length,
      atencao: clientes.filter(c => c.estagio === 'atencao').length,
      recente: clientes.filter(c => c.estagio === 'recente').length,
    };

    return Response.json({ clientes, stats, ciclo_dias: ciclo });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});