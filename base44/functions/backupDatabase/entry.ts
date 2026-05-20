import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const now = new Date().toISOString();
    const backupData = {
      timestamp: now,
      version: '1.0',
      entities: {}
    };

    // Lista de entidades críticas para backup
    const entities = [
      'Tenant', 'Client', 'Sale', 'Installment', 'Quote', 
      'Contract', 'Appointment', 'Test', 'Professional',
      'DeviceRepair', 'Product', 'Expense', 'StockMovement'
    ];

    // Exporta cada entidade
    for (const entity of entities) {
      try {
        const data = await base44.asServiceRole.entities[entity].list('-updated_date', 1000);
        backupData.entities[entity] = {
          count: data.length,
          records: data
        };
        console.log(`✓ Backed up ${entity}: ${data.length} records`);
      } catch (error) {
        console.warn(`⚠ Could not backup ${entity}:`, error.message);
      }
    }

    // Salva backup em arquivo (em produção, enviar para S3, Google Cloud Storage, etc)
    const backupJson = JSON.stringify(backupData, null, 2);
    
    // Gera arquivo para download
    const encoder = new TextEncoder();
    const data = encoder.encode(backupJson);

    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="backup-${now.split('T')[0]}.json"`
      }
    });

  } catch (error) {
    console.error('Backup failed:', error);
    return Response.json({ 
      error: 'Backup failed',
      message: error.message 
    }, { status: 500 });
  }
});