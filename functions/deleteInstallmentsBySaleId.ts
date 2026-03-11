import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Validar autenticação
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { sale_id } = await req.json();

    if (!sale_id) {
      return Response.json({ error: 'sale_id é obrigatório' }, { status: 400 });
    }

    // Buscar todas as parcelas da venda usando service role
    const allInstallments = await base44.asServiceRole.entities.Installment.list();
    const installmentsToDelete = allInstallments.filter(inst => inst.sale_id === sale_id);

    // Excluir todas as parcelas vinculadas
    let deletedCount = 0;
    for (const inst of installmentsToDelete) {
      await base44.asServiceRole.entities.Installment.delete(inst.id);
      deletedCount++;
    }

    return Response.json({ 
      success: true, 
      deleted_count: deletedCount,
      message: `${deletedCount} parcela(s) excluída(s) com sucesso`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});