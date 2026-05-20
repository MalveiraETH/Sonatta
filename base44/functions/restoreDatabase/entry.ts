import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('backup_file');

    if (!file) {
      return Response.json({ error: 'No backup file provided' }, { status: 400 });
    }

    const backupJson = await file.text();
    const backupData = JSON.parse(backupJson);

    let restored = 0;
    let errors = 0;

    // Restaura cada entidade
    for (const [entityName, entityData] of Object.entries(backupData.entities)) {
      if (!entityData.records || entityData.records.length === 0) {
        continue;
      }

      try {
        // Usa bulkCreate para melhor performance
        const recordsToCreate = entityData.records.map(record => {
          const { id, created_date, updated_date, created_by, ...data } = record;
          return data;
        });

        if (recordsToCreate.length > 0) {
          await base44.asServiceRole.entities[entityName].bulkCreate(recordsToCreate);
          restored += recordsToCreate.length;
          console.log(`✓ Restored ${entityName}: ${recordsToCreate.length} records`);
        }
      } catch (error) {
        errors++;
        console.warn(`⚠ Error restoring ${entityName}:`, error.message);
      }
    }

    return Response.json({
      success: true,
      message: 'Restore completed',
      restored,
      errors,
      timestamp: backupData.timestamp
    });

  } catch (error) {
    console.error('Restore failed:', error);
    return Response.json({ 
      error: 'Restore failed',
      message: error.message 
    }, { status: 500 });
  }
});