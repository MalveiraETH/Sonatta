import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed
    const monthNames = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    const competencyMonth = monthNames[month];

    // Busca despesas recorrentes ativas
    const recurringExpenses = await base44.asServiceRole.entities.RecurringExpense.filter({ is_active: true });

    if (recurringExpenses.length === 0) {
      return Response.json({ message: 'Nenhuma despesa recorrente ativa', created: 0 });
    }

    // Busca lançamentos já existentes para este mês (evita duplicatas)
    const existingExpenses = await base44.asServiceRole.entities.Expense.filter({
      competency_month: competencyMonth,
      competency_year: year
    });
    const existingRecurringIds = new Set(
      existingExpenses.map((e) => e.recurring_expense_id).filter(Boolean)
    );

    const toCreate = recurringExpenses.filter((e) => !existingRecurringIds.has(e.id));

    let created = 0;
    for (const rec of toCreate) {
      // Garante que o dia não ultrapasse o último dia do mês
      const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
      const day = Math.min(rec.due_day, lastDayOfMonth);
      const dueDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      await base44.asServiceRole.entities.Expense.create({
        competency_month: competencyMonth,
        competency_year: year,
        due_date: dueDate,
        event_date: dueDate,
        amount: rec.amount,
        category_id: rec.category_id,
        category_name: rec.category_name,
        counterparty_id: rec.counterparty_id,
        counterparty_name: rec.counterparty_name,
        type: rec.type,
        payment_method: rec.payment_method,
        invoice_number: rec.invoice_number,
        notes: rec.notes,
        status: 'a_pagar',
        recurring_expense_id: rec.id
      });
      created++;
    }

    return Response.json({
      message: `Lançamentos gerados com sucesso`,
      month: `${competencyMonth}/${year}`,
      created,
      skipped: recurringExpenses.length - created
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});