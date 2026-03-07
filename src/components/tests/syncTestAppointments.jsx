import { base44 } from '@/api/base44Client';

/**
 * Mapeia status do Teste para status do Agendamento
 */
export function getAppointmentStatus(testStatus) {
  const map = {
    teste_agendado: 'agendado',
    em_teste: 'realizado',
    teste_finalizado: 'realizado',
    teste_pendente: 'faltou',
    teste_estendido: 'agendado'
  };
  return map[testStatus] || 'agendado';
}

/**
 * Cria os 2 agendamentos vinculados ao teste (início e término)
 */
export async function createTestAppointments(testId, testData) {
  const appointmentStatus = getAppointmentStatus(testData.status);

  const base = {
    client_id: testData.client_id,
    client_name: testData.client_name,
    professional_id: testData.professional_id || '',
    professional_name: testData.professional_name || '',
    type: 'teste',
    notes: testData.notes || '',
    test_id: testId
  };

  const appointments = [];

  // Agendamento de Início (sempre cria se tiver data início)
  if (testData.start_date) {
    appointments.push(
      base44.entities.Appointment.create({
        ...base,
        date: testData.start_date,
        time: testData.start_time || '08:00',
        status: appointmentStatus,
        test_appointment_type: 'inicio'
      })
    );
  }

  // Agendamento de Término (só cria se tiver data final)
  if (testData.end_date) {
    appointments.push(
      base44.entities.Appointment.create({
        ...base,
        date: testData.end_date,
        time: testData.end_time || '08:00',
        status: appointmentStatus,
        test_appointment_type: 'termino'
      })
    );
  }

  await Promise.all(appointments);
}

/**
 * Sincroniza os agendamentos existentes de um teste após edição
 */
export async function syncTestAppointments(testId, testData) {
  const appointmentStatus = getAppointmentStatus(testData.status);

  // Busca agendamentos vinculados a este teste
  const existing = await base44.entities.Appointment.filter({ test_id: testId });

  const inicioAppt = existing.find(a => a.test_appointment_type === 'inicio');
  const terminoAppt = existing.find(a => a.test_appointment_type === 'termino');

  const base = {
    client_id: testData.client_id,
    client_name: testData.client_name,
    professional_id: testData.professional_id || '',
    professional_name: testData.professional_name || '',
    type: 'teste',
    notes: testData.notes || '',
    test_id: testId,
    status: appointmentStatus
  };

  const ops = [];

  // Atualiza ou cria agendamento de início
  if (testData.start_date) {
    const inicioData = {
      ...base,
      date: testData.start_date,
      time: testData.start_time || '08:00',
      test_appointment_type: 'inicio'
    };
    if (inicioAppt) {
      ops.push(base44.entities.Appointment.update(inicioAppt.id, inicioData));
    } else {
      ops.push(base44.entities.Appointment.create(inicioData));
    }
  }

  // Atualiza ou cria agendamento de término
  if (testData.end_date) {
    const terminoData = {
      ...base,
      date: testData.end_date,
      time: testData.end_time || '08:00',
      test_appointment_type: 'termino'
    };
    if (terminoAppt) {
      ops.push(base44.entities.Appointment.update(terminoAppt.id, terminoData));
    } else {
      ops.push(base44.entities.Appointment.create(terminoData));
    }
  } else if (terminoAppt) {
    // Se removeu a data final, cancela o agendamento de término
    ops.push(base44.entities.Appointment.update(terminoAppt.id, { status: 'cancelado' }));
  }

  await Promise.all(ops);
}