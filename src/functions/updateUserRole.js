import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// eslint-disable-next-line no-undef
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();

    // Apenas super_admin pode atualizar roles
    if (currentUser?.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden: Only super admins can update roles' }, { status: 403 });
    }

    const { userId, newRole } = await req.json();

    if (!userId || !newRole) {
      return Response.json({ error: 'Missing userId or newRole' }, { status: 400 });
    }

    // Validar role
    const validRoles = ['super_admin', 'admin', 'fonoaudiologo', 'comercial', 'recepcao', 'financeiro'];
    if (!validRoles.includes(newRole)) {
      return Response.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Atualizar usuário
    const updatedUser = await base44.asServiceRole.entities.User.update(userId, { role: newRole });

    return Response.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Error updating user role:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});