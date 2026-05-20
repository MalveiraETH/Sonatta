import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Usuário não autenticado' }, { status: 401 });
    }

    // Promover usuário a super_admin
    await base44.auth.updateMe({ role: 'super_admin' });

    return Response.json({
      success: true,
      message: 'Você foi promovido a super_admin',
      user: { ...user, role: 'super_admin' }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});