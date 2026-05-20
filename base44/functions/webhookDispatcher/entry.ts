import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, timestamp } = await req.json();

    if (!event || !data) {
      return Response.json({ error: 'Missing event or data' }, { status: 400 });
    }

    // Get all active webhooks for this event
    const webhooks = await base44.asServiceRole.entities.Webhook.filter({
      event_type: event,
      is_active: true
    });

    const results = [];
    const errors = [];

    // Dispatch to all registered webhooks
    for (const webhook of webhooks) {
      try {
        const signature = await generateSignature(webhook.secret, JSON.stringify(data));
        
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': event,
            'X-Webhook-Timestamp': timestamp || new Date().toISOString()
          },
          body: JSON.stringify(data)
        });

        results.push({
          webhook_id: webhook.id,
          url: webhook.url,
          status: response.status,
          success: response.ok
        });

        // Log webhook call
        await base44.asServiceRole.entities.WebhookLog.create({
          webhook_id: webhook.id,
          event: event,
          status: response.status,
          success: response.ok,
          timestamp: new Date()
        });
      } catch (error) {
        errors.push({
          webhook_id: webhook.id,
          error: error.message
        });

        // Log failed webhook
        await base44.asServiceRole.entities.WebhookLog.create({
          webhook_id: webhook.id,
          event: event,
          status: 0,
          success: false,
          error: error.message,
          timestamp: new Date()
        });
      }
    }

    return Response.json({
      event,
      timestamp: new Date().toISOString(),
      dispatched: results.length,
      errors: errors.length,
      results,
      errors
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function generateSignature(secret, payload) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const hex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return `sha256=${hex}`;
}