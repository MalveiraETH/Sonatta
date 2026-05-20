import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// deno-lint-ignore no-undef
// deno-lint-ignore no-undef
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    // Criar Tenant
    const tenant = await base44.asServiceRole.entities.Tenant.create({
      name: 'Empresa Teste',
      cnpj: '12.345.678/0001-99',
      phone: '+55 11 3000-0000',
      email: 'contato@empresateste.com.br',
      address: 'Rua Teste, 123',
      city: 'São Paulo',
      state: 'SP',
      plan: 'premium',
      status: 'ativo',
    });

    // Criar Profissionais
    const professionals = await Promise.all([
      base44.asServiceRole.entities.Professional.create({
        tenant_id: tenant.id,
        full_name: 'Dra. Maria Silva',
        cpf: '123.456.789-00',
        whatsapp: '+5511987654321',
        specialty: 'fonoaudiologo',
        council_number: 'CRFa 1234/SP',
      }),
      base44.asServiceRole.entities.Professional.create({
        tenant_id: tenant.id,
        full_name: 'Dr. João Santos',
        cpf: '987.654.321-00',
        whatsapp: '+5511987654322',
        specialty: 'otorrinolaringologista',
        council_number: 'CRM 54321/SP',
      }),
      base44.asServiceRole.entities.Professional.create({
        tenant_id: tenant.id,
        full_name: 'Dra. Ana Costa',
        cpf: '456.789.123-00',
        whatsapp: '+5511987654323',
        specialty: 'fonoaudiologo',
        council_number: 'CRFa 5678/SP',
      }),
    ]);

    // Criar Clientes
    const clients = await Promise.all([
      base44.asServiceRole.entities.Client.create({
        tenant_id: tenant.id,
        full_name: 'Carlos Alberto Silva',
        cpf: '111.222.333-44',
        phone: '+5511999991111',
        email: 'carlos@email.com',
        address: 'Av. Paulista, 1000',
        address_number: '1000',
        address_neighborhood: 'Bela Vista',
        address_cep: '01311-100',
        birth_date: '1965-05-15',
        responsible_professional: professionals[0].id,
        status: 'cliente_ativo',
      }),
      base44.asServiceRole.entities.Client.create({
        tenant_id: tenant.id,
        full_name: 'Mariana Oliveira',
        cpf: '222.333.444-55',
        phone: '+5511999992222',
        email: 'mariana@email.com',
        address: 'Rua Augusta, 2000',
        address_number: '2000',
        address_neighborhood: 'Centro',
        address_cep: '01305-100',
        birth_date: '1972-08-22',
        responsible_professional: professionals[0].id,
        status: 'cliente_ativo',
      }),
      base44.asServiceRole.entities.Client.create({
        tenant_id: tenant.id,
        full_name: 'Pedro Mendes',
        cpf: '333.444.555-66',
        phone: '+5511999993333',
        email: 'pedro@email.com',
        address: 'Rua Oscar Freire, 500',
        address_number: '500',
        address_neighborhood: 'Cerqueira César',
        address_cep: '01426-100',
        birth_date: '1958-12-10',
        responsible_professional: professionals[1].id,
        status: 'lead',
      }),
    ]);

    // Criar Produtos
    const products = await Promise.all([
      base44.asServiceRole.entities.Product.create({
        tenant_id: tenant.id,
        name: 'Aparelho Auditivo - Modelo Premium',
        category: 'aparelho_auditivo',
        brand: 'Phonak',
        model: 'Paradise P90-R',
        stock_type: 'serializado',
        sale_price: 5500,
        product_cost: 2200,
        cost_price: 2200,
        status: 'disponivel',
        quantity: 1,
      }),
      base44.asServiceRole.entities.Product.create({
        tenant_id: tenant.id,
        name: 'Bateria 312',
        category: 'bateria',
        brand: 'Rayovac',
        model: 'ZA312',
        stock_type: 'nao_serializado',
        sale_price: 45,
        product_cost: 15,
        cost_price: 15,
        status: 'disponivel',
        quantity: 50,
        min_stock: 10,
      }),
      base44.asServiceRole.entities.Product.create({
        tenant_id: tenant.id,
        name: 'Molde Auricular',
        category: 'molde',
        brand: 'Genérico',
        stock_type: 'nao_serializado',
        sale_price: 350,
        product_cost: 120,
        cost_price: 120,
        status: 'disponivel',
        quantity: 20,
        min_stock: 5,
      }),
    ]);

    // Criar Vendas
    const sales = await Promise.all([
      base44.asServiceRole.entities.Sale.create({
        tenant_id: tenant.id,
        client_id: clients[0].id,
        client_name: clients[0].full_name,
        client_phone: clients[0].phone,
        client_email: clients[0].email,
        client_cpf: clients[0].cpf,
        sale_number: '001',
        sale_date: new Date().toISOString().split('T')[0],
        items: [
          { product_id: products[0].id, product_name: products[0].name, quantity: 1, unit_price: 5500, total: 5500 },
          { product_id: products[1].id, product_name: products[1].name, quantity: 2, unit_price: 45, total: 90 },
        ],
        subtotal: 5590,
        discount: 0,
        total: 5590,
        total_net_amount: 5590,
        payment_details: [
          { method: 'pix_parcelado', amount: 5590, installments: 3, status: 'pago', fee_rate: 0, fee_amount: 0, net_amount: 5590 },
        ],
        status: 'pago',
      }),
      base44.asServiceRole.entities.Sale.create({
        tenant_id: tenant.id,
        client_id: clients[1].id,
        client_name: clients[1].full_name,
        client_phone: clients[1].phone,
        client_email: clients[1].email,
        client_cpf: clients[1].cpf,
        sale_number: '002',
        sale_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: [
          { product_id: products[2].id, product_name: products[2].name, quantity: 1, unit_price: 350, total: 350 },
        ],
        subtotal: 350,
        discount: 0,
        total: 350,
        total_net_amount: 350,
        payment_details: [
          { method: 'dinheiro', amount: 350, status: 'pago', fee_rate: 0, fee_amount: 0, net_amount: 350 },
        ],
        status: 'pago',
      }),
    ]);

    // Criar Agendamentos
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    await Promise.all([
      base44.asServiceRole.entities.Appointment.create({
        tenant_id: tenant.id,
        client_id: clients[0].id,
        client_name: clients[0].full_name,
        professional_id: professionals[0].id,
        professional_name: professionals[0].full_name,
        date: today.toISOString().split('T')[0],
        time: '09:30',
        type: 'ajuste',
        status: 'confirmado',
      }),
      base44.asServiceRole.entities.Appointment.create({
        tenant_id: tenant.id,
        client_id: clients[1].id,
        client_name: clients[1].full_name,
        professional_id: professionals[0].id,
        professional_name: professionals[0].full_name,
        date: tomorrow.toISOString().split('T')[0],
        time: '14:00',
        type: 'teste',
        status: 'agendado',
      }),
    ]);

    // Criar Despesas
    await base44.asServiceRole.entities.Expense.create({
      tenant_id: tenant.id,
      competency_month: 'Maio',
      competency_year: 2026,
      event_date: today.toISOString().split('T')[0],
      due_date: today.toISOString().split('T')[0],
      amount: 2500,
      category_id: 'cat_1',
      category_name: 'Aluguel',
      type: 'fixo',
      payment_method: 'transferencia',
      status: 'pago',
    });

    return Response.json({
      success: true,
      tenant: tenant.id,
      message: `Demo criado para: ${tenant.name}`,
      stats: {
        professionals: professionals.length,
        clients: clients.length,
        products: products.length,
        sales: sales.length,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});