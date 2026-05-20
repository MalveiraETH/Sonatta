import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { jsPDF } from 'npm:jspdf@4.0.0';
import * as XLSX from 'npm:xlsx@0.18.5';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.tenant_id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { format } = await req.json();
    if (!['csv', 'pdf'].includes(format)) return Response.json({ error: 'Invalid format' }, { status: 400 });

    // Fetch all tenant data
    const [clients, sales, appointments, products, expenses] = await Promise.all([
      base44.entities.Client.filter({ tenant_id: user.tenant_id }),
      base44.entities.Sale.filter({ tenant_id: user.tenant_id }),
      base44.entities.Appointment.filter({ tenant_id: user.tenant_id }),
      base44.entities.Product.filter({ tenant_id: user.tenant_id }),
      base44.entities.Expense.filter({ tenant_id: user.tenant_id }),
    ]);

    if (format === 'csv') {
      const workbook = XLSX.utils.book_new();
      
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(clients.map(c => ({
        nome: c.full_name, cpf: c.cpf, telefone: c.phone, email: c.email, status: c.status
      }))), 'Clientes');
      
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(sales.map(s => ({
        numero: s.sale_number, data: s.sale_date, cliente: s.client_name, total: s.total, status: s.status
      }))), 'Vendas');
      
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(appointments.map(a => ({
        data: a.date, hora: a.time, cliente: a.client_name, tipo: a.type, status: a.status
      }))), 'Agendamentos');
      
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(products.map(p => ({
        nome: p.name, categoria: p.category, estoque: p.quantity || 1, preco: p.sale_price
      }))), 'Produtos');

      const csvBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      return new Response(csvBuffer, {
        headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename=backup.xlsx' }
      });
    }

    if (format === 'pdf') {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Backup de Dados - Sonatta', 20, 20);
      doc.setFontSize(10);
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 20, 30);

      let yPos = 40;
      const addSection = (title, data) => {
        if (yPos > 250) doc.addPage();
        doc.setFontSize(12);
        doc.text(title, 20, yPos);
        yPos += 8;
        doc.setFontSize(9);
        doc.text(`Total: ${data.length} registros`, 20, yPos);
        yPos += 8;
      };

      addSection(`Clientes (${clients.length})`, clients);
      addSection(`Vendas (${sales.length})`, sales);
      addSection(`Agendamentos (${appointments.length})`, appointments);
      addSection(`Produtos (${products.length})`, products);
      addSection(`Despesas (${expenses.length})`, expenses);

      const pdfBuffer = doc.output('arraybuffer');
      return new Response(pdfBuffer, {
        headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename=backup.pdf' }
      });
    }
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});