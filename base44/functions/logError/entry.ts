import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    const { error, context, breadcrumbs, level = 'error' } = await req.json();

    // Log para console (visível em production logs)
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      user_id: user?.id,
      user_email: user?.email,
      error_message: error?.message,
      error_stack: error?.stack,
      context,
      breadcrumbs,
    }));

    // Opcionalmente, salva em banco de dados
    // await base44.asServiceRole.entities.ErrorLog.create({
    //   user_id: user?.id,
    //   error_message: error?.message,
    //   error_stack: error?.stack,
    //   context,
    //   level,
    // });

    return Response.json({ 
      success: true,
      message: 'Error logged successfully'
    });
  } catch (error) {
    console.error('Error logging failed:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});