import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ADMIN_EMAIL = 'malveira.fabio@gmail.com';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { alert_key } = await req.json();

    const MENSAGENS = {
      teste_pendente: {
        title: 'Teste Pendente',
        msg: `⚠️ *TESTE PENDENTE — MENSAGEM DE TESTE*\n\nEsta é uma mensagem de teste do alerta **Teste Pendente**.\n\nQuando ativado, este alerta notifica sempre que um teste entra em status *Pendente*, informando o cliente, número do teste e data prevista de término.\n\n✅ Alerta configurado corretamente!`,
      },
      teste_estendido: {
        title: 'Teste Estendido',
        msg: `📅 *TESTE ESTENDIDO — MENSAGEM DE TESTE*\n\nEsta é uma mensagem de teste do alerta **Teste Estendido**.\n\nQuando ativado, notifica sempre que a data de um teste em andamento é prorrogada.\n\n✅ Alerta configurado corretamente!`,
      },
      teste_finalizado_sem_orcamento: {
        title: 'Teste Finalizado sem Orçamento',
        msg: `📋 *TESTE FINALIZADO SEM ORÇAMENTO — MENSAGEM DE TESTE*\n\nEsta é uma mensagem de teste do alerta **Teste Finalizado sem Orçamento**.\n\nQuando ativado, notifica 2 dias após a finalização de um teste se nenhum orçamento foi criado para o cliente.\n\n✅ Alerta configurado corretamente!`,
      },
      aparelho_em_teste_longo: {
        title: 'Aparelho em Teste Longo',
        msg: `⏳ *APARELHO EM TESTE LONGO — MENSAGEM DE TESTE*\n\nEsta é uma mensagem de teste do alerta **Aparelho em Teste Longo**.\n\nQuando ativado, notifica nos marcos de 21, 30, 45 e 60 dias de teste sem conversão em venda.\n\n✅ Alerta configurado corretamente!`,
      },
      lead_sem_movimentacao: {
        title: 'Lead sem Movimentação',
        msg: `🕐 *LEAD SEM MOVIMENTAÇÃO — MENSAGEM DE TESTE*\n\nEsta é uma mensagem de teste do alerta **Lead sem Movimentação**.\n\nQuando ativado, notifica nos marcos de 7, 15 e 30 dias sem agendamento, teste ou orçamento para leads cadastrados.\n\n✅ Alerta configurado corretamente!`,
      },
      orcamento_sem_venda: {
        title: 'Orçamento sem Venda',
        msg: `💼 *ORÇAMENTO SEM VENDA — MENSAGEM DE TESTE*\n\nEsta é uma mensagem de teste do alerta **Orçamento sem Venda**.\n\nQuando ativado, notifica aos 10, 20 e 30 dias após criação de um orçamento sem conversão em venda.\n\n✅ Alerta configurado corretamente!`,
      },
      cliente_pos_venda: {
        title: 'Cliente em Pós-Venda',
        msg: `🎉 *CLIENTE EM PÓS-VENDA — MENSAGEM DE TESTE*\n\nEsta é uma mensagem de teste do alerta **Cliente em Pós-Venda**.\n\nQuando ativado, notifica sempre que um cliente passa para o status pós-venda.\n\n✅ Alerta configurado corretamente!`,
      },
      parcela_atrasada: {
        title: 'Parcela em Atraso',
        msg: `💳 *PARCELA EM ATRASO — MENSAGEM DE TESTE*\n\nEsta é uma mensagem de teste do alerta **Parcela em Atraso**.\n\nQuando ativado, notifica diariamente sobre parcelas de PIX Parcelado ou Cartão em atraso.\n\n✅ Alerta configurado corretamente!`,
      },
      conserto_parado: {
        title: 'Conserto sem Atualização',
        msg: `🔧 *CONSERTO SEM ATUALIZAÇÃO — MENSAGEM DE TESTE*\n\nEsta é uma mensagem de teste do alerta **Conserto sem Atualização**.\n\nQuando ativado, notifica nos marcos de 7, 15 e 30 dias sem alteração de status em consertos ativos.\n\n✅ Alerta configurado corretamente!`,
      },
      conserto_concluido: {
        title: 'Conserto Concluído',
        msg: `✅ *CONSERTO CONCLUÍDO — MENSAGEM DE TESTE*\n\nEsta é uma mensagem de teste do alerta **Conserto Concluído**.\n\nQuando ativado, notifica sempre que um conserto é finalizado e está pronto para entrega ao cliente.\n\n✅ Alerta configurado corretamente!`,
      },
      estoque_baixo: {
        title: 'Estoque Baixo',
        msg: `📦 *ESTOQUE BAIXO — MENSAGEM DE TESTE*\n\nEsta é uma mensagem de teste do alerta **Estoque Baixo**.\n\nQuando ativado, notifica sempre que um produto atinge o limite mínimo de estoque configurado.\n\n✅ Alerta configurado corretamente!`,
      },
      garantia_vencendo: {
        title: 'Garantia Próxima do Vencimento',
        msg: `🛡️ *GARANTIA PRÓXIMA DO VENCIMENTO — MENSAGEM DE TESTE*\n\nEsta é uma mensagem de teste do alerta **Garantia Próxima do Vencimento**.\n\nQuando ativado, notifica 30 e 7 dias antes do vencimento da garantia de um aparelho vendido.\n\n✅ Alerta configurado corretamente!`,
      },
    };

    const alerta = MENSAGENS[alert_key];
    if (!alerta) return Response.json({ error: 'Alerta inválido' }, { status: 400 });

    // Busca o ID do usuário admin para vincular a conversa a ele
    const adminUsers = await base44.asServiceRole.entities.User.filter({ email: ADMIN_EMAIL });
    const adminUserId = adminUsers[0]?.id;

    const conv = await base44.asServiceRole.agents.createConversation({
      agent_name: 'assistente_sonatta',
      app_user_id: adminUserId,
      metadata: { name: `[TESTE] Alerta: ${alerta.title}` }
    });
    await base44.asServiceRole.agents.addMessage(conv, { role: 'user', content: alerta.msg });

    return Response.json({ ok: true, title: alerta.title });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});