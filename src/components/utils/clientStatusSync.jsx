import { base44 } from '@/api/base44Client';

/**
 * Mapeia o status de teste para o status de cliente
 * Teste é o status mestre, Cliente é o escravo
 */
export const mapTestStatusToClientStatus = (testStatus) => {
  const statusMap = {
    'teste_agendado': 'em_teste',
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
 * Atualiza o status do cliente para "cliente_ativo" após uma venda
 * Esta função é chamada sempre que uma venda é criada
 */
export const syncClientStatusFromSale = async (clientId) => {
  if (!clientId) {
    console.warn('Client ID ausente');
    return;
  }
  
  try {
    await base44.entities.Client.update(clientId, { status: 'cliente_ativo' });
    console.log('Status do cliente atualizado para: cliente_ativo');
  } catch (error) {
    console.error('Erro ao atualizar status do cliente após venda:', error);
    throw error;
  }
};