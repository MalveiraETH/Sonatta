import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { differenceInYears, differenceInDays, parseISO } from 'npm:date-fns@3.6.0';

// Categoriza cliente por idade
function categorizeByAge(birthDate) {
  if (!birthDate) return { key: 'adultos', label: 'Adultos', color: 'blue' };
  const age = differenceInYears(new Date(), parseISO(birthDate));
  if (age < 1) return { key: 'bebes', label: 'Bebês (0-1 ano)', color: 'pink' };
  if (age <= 15) return { key: 'criancas', label: 'Crianças/Adolescentes (1-15 anos)', color: 'green' };
  return { key: 'adultos', label: 'Adultos (+15 anos)', color: 'blue' };
}

// Calcula prioridade: quanto mais tempo passou desde o teste, mais urgente
function calcPriority(testEndDate) {
  if (!testEndDate) return 'baixa';
  const days = differenceInDays(new Date(), parseISO(testEndDate));
  if (days <= 7) return 'alta';
  if (days <= 30) return 'media';
  return 'baixa';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Busca todos os testes finalizados
    const allTests = await base44.asServiceRole.entities.Test.filter({ status: 'teste_finalizado' });

    if (!allTests || allTests.length === 0) {
      return Response.json({ lost_sales: [], stats: { total: 0, bebes: 0, criancas: 0, adultos: 0 } });
    }

    // Busca vendas existentes para cruzar
    const allSales = await base44.asServiceRole.entities.Sale.list('-created_date', 500);
    const clientsWithSales = new Set(allSales.map(s => s.client_id));

    // Filtra testes de clientes que NÃO compraram
    const lostTestClientIds = [...new Set(
      allTests
        .filter(t => !clientsWithSales.has(t.client_id))
        .map(t => t.client_id)
    )];

    if (lostTestClientIds.length === 0) {
      return Response.json({ lost_sales: [], stats: { total: 0, bebes: 0, criancas: 0, adultos: 0 } });
    }

    // Busca dados dos clientes
    const allClients = await base44.asServiceRole.entities.Client.list();
    const clientMap = Object.fromEntries(allClients.map(c => [c.id, c]));

    // Para cada cliente perdido, pega o teste mais recente
    const latestTestByClient = {};
    for (const test of allTests) {
      if (!lostTestClientIds.includes(test.client_id)) continue;
      const existing = latestTestByClient[test.client_id];
      if (!existing || (test.end_date && test.end_date > existing.end_date)) {
        latestTestByClient[test.client_id] = test;
      }
    }

    // Monta resultado final
    const lostSales = lostTestClientIds.map(clientId => {
      const client = clientMap[clientId];
      const lastTest = latestTestByClient[clientId];
      if (!client) return null;

      const ageGroup = categorizeByAge(client.birth_date);
      const daysSinceTest = lastTest?.end_date
        ? differenceInDays(new Date(), parseISO(lastTest.end_date))
        : null;

      return {
        client_id: clientId,
        client_name: client.full_name,
        client_phone: client.phone,
        birth_date: client.birth_date,
        age_group: ageGroup,
        last_test_id: lastTest?.id,
        last_test_end_date: lastTest?.end_date,
        last_test_devices: lastTest?.devices || [],
        days_since_test: daysSinceTest,
        priority: calcPriority(lastTest?.end_date),
        responsible_professional: client.responsible_professional,
        notes: client.notes,
        funil_status: client.funil_status || 'novo',
        funil_last_contact: client.funil_last_contact || null,
        funil_notes: client.funil_notes || '',
      };
    }).filter(Boolean);

    // Ordena: mais recentes primeiro (prioridade alta)
    lostSales.sort((a, b) => (a.days_since_test ?? 999) - (b.days_since_test ?? 999));

    const stats = {
      total: lostSales.length,
      bebes: lostSales.filter(x => x.age_group.key === 'bebes').length,
      criancas: lostSales.filter(x => x.age_group.key === 'criancas').length,
      adultos: lostSales.filter(x => x.age_group.key === 'adultos').length,
      alta_prioridade: lostSales.filter(x => x.priority === 'alta').length,
      media_prioridade: lostSales.filter(x => x.priority === 'media').length,
      baixa_prioridade: lostSales.filter(x => x.priority === 'baixa').length,
    };

    return Response.json({ lost_sales: lostSales, stats });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});