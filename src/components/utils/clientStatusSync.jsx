import { base44 } from '@/api/base44Client';

/**
 * Mapeia o status de teste para o status de cliente
 * Teste é o status mestre, Cliente é o escravo
 */
export const mapTestStatusToClientStatus = (testStatus) => {
  const statusMap = {
    'teste_agendado': 'teste_agendado',
    'em_teste': 'em_teste',
    'teste_estendido': 'teste_estendido',
    'teste_finalizado': 'teste_finalizado',
    'teste_pendente': 'teste_pendente'
  };
  
  return statusMap[testStatus] || 'em_teste';
};

/**
 * Sincroniza o status do cliente com base no status do teste
 * Esta função é chamada sempre que um teste é criado ou atualizado
 */
export const syncClientStatusFromTest = async (clientId, testStatus) => {
  if (!clientId || !testStatus) {
    console.warn('Client ID ou Test Status ausente');
    return;
  }
  
  try {
    const clientStatus = mapTestStatusToClientStatus(testStatus);
    await base44.entities.Client.update(clientId, { status: clientStatus });
    console.log(`Status do cliente sincronizado: ${clientStatus}`);
  } catch (error) {
    console.error('Erro ao sincronizar status do cliente:', error);
    throw error;
  }
};

/**
 * Recalcula o status do cliente com base nas vendas válidas (pago ou pendente).
 * - Sem vendas válidas → lead
 * - Com vendas válidas e era lead → cliente_ativo
 * - Com vendas válidas e já era cliente_ativo/pos_venda → mantém
 * Esta função deve ser chamada após criar, cancelar ou excluir vendas.
 */
export const recalculateClientStatus = async (clientId) => {
  if (!clientId) return;
  try {
    const [paidSales, pendingSales] = await Promise.all([
      base44.entities.Sale.filter({ client_id: clientId, status: 'pago' }),
      base44.entities.Sale.filter({ client_id: clientId, status: 'pendente' })
    ]);
    const validSales = [...paidSales, ...pendingSales];

    if (validSales.length === 0) {
      await base44.entities.Client.update(clientId, { status: 'lead' });
    } else {
      const client = await base44.entities.Client.get(clientId);
      if (client && client.status === 'lead') {
        await base44.entities.Client.update(clientId, { status: 'cliente_ativo' });
      }
    }
  } catch (error) {
    console.error('Erro ao recalcular status do cliente:', error);
  }
};

/**
 * Sincroniza o status do cliente após uma venda — agora usa recalculateClientStatus
 */
export const syncClientStatusFromSale = async (clientId) => {
  if (!clientId) {
    console.warn('Client ID ausente');
    return;
  }
  await recalculateClientStatus(clientId);
};