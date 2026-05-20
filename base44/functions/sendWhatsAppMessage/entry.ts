import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { phone, message, template_name, template_data } = await req.json();

    if (!phone || (!message && !template_name)) {
      return Response.json(
        { error: 'Missing phone or message/template_name' },
        { status: 400 }
      );
    }

    // Get WhatsApp connection (app-user connector or shared)
    const connection = await base44.asServiceRole.connectors.getConnection('whatsapp');
    if (!connection?.accessToken) {
      return Response.json(
        { error: 'WhatsApp not configured' },
        { status: 400 }
      );
    }

    const messageBody = message || formatTemplate(template_name, template_data);
    
    // Send via WhatsApp Cloud API
    const response = await fetch('https://graph.instagram.com/v18.0/YOUR_PHONE_NUMBER_ID/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${connection.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone.replace(/\D/g, ''),
        type: 'text',
        text: {
          preview_url: true,
          body: messageBody,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'WhatsApp API error');
    }

    const data = await response.json();

    // Log enviado
    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'WhatsAppMessage',
      action: 'whatsapp',
      description: `WhatsApp enviado para ${phone}`,
      details: {
        phone,
        template: template_name,
        message_id: data.messages?.[0]?.id,
      },
    });

    return Response.json({
      success: true,
      message_id: data.messages?.[0]?.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'WhatsAppMessage',
      action: 'whatsapp',
      description: `Erro ao enviar WhatsApp: ${error.message}`,
      details: { error: error.message },
    });

    return Response.json({ error: error.message }, { status: 500 });
  }
});

function formatTemplate(templateName, data) {
  const templates = {
    sale_confirmation: `Olá ${data?.client_name}! Sua venda foi confirmada. Número: ${data?.sale_number}. Total: R$ ${data?.total}. Obrigado!`,
    appointment_reminder: `Lembrete: Você tem um agendamento ${data?.date} às ${data?.time} com ${data?.professional}. Confirme sua presença!`,
    payment_reminder: `Oi ${data?.client_name}, você tem um pagamento vencendo em ${data?.due_date}. Valor: R$ ${data?.amount}. Realize seu PIX!`,
    appointment_confirmation: `Seu agendamento foi confirmado para ${data?.date} às ${data?.time}. Local: ${data?.location}`,
    repair_status: `Oi ${data?.client_name}, seu aparelho está ${data?.status}. Número OS: ${data?.order_number}`,
  };

  return templates[templateName] || `Sonatta: ${templateName}`;
}