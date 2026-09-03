import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Download, Wrench } from 'lucide-react';
import { formatLocalDate } from '@/components/utils/dateHelpers';

const REPAIR_STATUS_CONFIG = {
  aberto: { label: 'Aberto', color: 'bg-blue-100 text-blue-700' },
  enviado_ao_fornecedor: { label: 'Enviado ao Fornecedor', color: 'bg-orange-100 text-orange-700' },
  em_reparo: { label: 'Em Reparo', color: 'bg-yellow-100 text-yellow-700' },
  reparado: { label: 'Reparado', color: 'bg-teal-100 text-teal-700' },
  aguardando_retirada: { label: 'Aguardando Retirada', color: 'bg-purple-100 text-purple-700' },
  devolvido_ao_cliente: { label: 'Devolvido ao Cliente', color: 'bg-green-100 text-green-700' },
  cancelado: { label: 'Cancelado', color: 'bg-slate-100 text-slate-500' },
};

const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const toExcelNum = (v) => Number((v || 0).toFixed(2));
const toExcelDate = (d) => {
  if (!d) return '';
  const str = typeof d === 'string' ? d : String(d);
  const date = new Date(str.includes('T') ? str : `${str}T00:00:00`);
  return isNaN(date.getTime()) ? '' : date;
};

export default function RepairsReportTab({ repairs }) {
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [supplierFilter, setSupplierFilter] = useState('todos');

  const suppliers = useMemo(
    () => [...new Set(repairs.map(r => r.supplier_name).filter(Boolean))].sort(),
    [repairs]
  );

  const filtered = useMemo(() => {
    return repairs.filter(r => {
      if (statusFilter !== 'todos' && r.status !== statusFilter) return false;
      if (supplierFilter !== 'todos' && r.supplier_name !== supplierFilter) return false;
      if (dateStart || dateEnd) {
        const opened = r.date_opened ? toExcelDate(r.date_opened) : null;
        if (!opened) return false;
        if (dateStart && opened < new Date(dateStart)) return false;
        if (dateEnd && opened > new Date(dateEnd)) return false;
      }
      return true;
    }).sort((a, b) => (a.date_opened || '').localeCompare(b.date_opened || ''));
  }, [repairs, statusFilter, supplierFilter, dateStart, dateEnd]);

  const kpis = {
    total: filtered.length,
    abertos: filtered.filter(r => r.status === 'aberto').length,
    emAndamento: filtered.filter(r => ['enviado_ao_fornecedor', 'em_reparo', 'reparado', 'aguardando_retirada'].includes(r.status)).length,
    devolvidos: filtered.filter(r => r.status === 'devolvido_ao_cliente').length,
    garantia: filtered.filter(r => r.warranty_repair).length,
    custoTotal: filtered.reduce((s, r) => s + (r.repair_cost || 0), 0),
  };

  const exportToExcel = async (data, filename) => {
    if (data.length === 0) return;
    const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs');
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Consertos');
    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExport = () => {
    const data = filtered.map(r => ({
      'OS': r.service_order_number || '',
      'Cliente': r.client_name || '',
      'Aparelhos': (r.products && r.products.length > 0
        ? r.products
        : [{ serial_number: r.serial_number, device_name: r.device_name }])
        .map(p => [p.device_name, p.serial_number && `SN: ${p.serial_number}`].filter(Boolean).join(' '))
        .filter(Boolean).join(' | '),
      'Fornecedor': r.supplier_name || '',
      'Profissional': r.professional_name || '',
      'Abertura': toExcelDate(r.date_opened),
      'Envio Fornecedor': toExcelDate(r.date_sent_to_supplier),
      'Retorno Fornecedor': toExcelDate(r.date_returned_from_supplier),
      'Devolução Cliente': toExcelDate(r.date_returned_to_client),
      'Garantia': r.warranty_repair ? 'Sim' : 'Não',
      'Custo Reparo': toExcelNum(r.repair_cost),
      'Status': REPAIR_STATUS_CONFIG[r.status]?.label || r.status,
      'Problema': r.description_problem || '',
      'Reparo Realizado': r.description_repair || '',
    }));
    exportToExcel(data, 'relatorio_consertos');
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card className="p-4 border-0 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="space-y-2">
            <Label>Abertura Início</Label>
            <Input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Abertura Fim</Label>
            <Input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {Object.entries(REPAIR_STATUS_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Fornecedor</Label>
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {suppliers.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button variant="outline" className="w-full" onClick={() => { setDateStart(''); setDateEnd(''); setStatusFilter('todos'); setSupplierFilter('todos'); }}>
              Limpar Filtros
            </Button>
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="p-4 border-0 shadow-sm">
          <p className="text-sm text-slate-500">Total OS</p>
          <p className="text-2xl font-bold text-slate-700 mt-1">{kpis.total}</p>
        </Card>
        <Card className="p-4 border-0 shadow-sm">
          <p className="text-sm text-slate-500">Abertas</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{kpis.abertos}</p>
        </Card>
        <Card className="p-4 border-0 shadow-sm">
          <p className="text-sm text-slate-500">Em Andamento</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">{kpis.emAndamento}</p>
        </Card>
        <Card className="p-4 border-0 shadow-sm">
          <p className="text-sm text-slate-500">Devolvidos</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{kpis.devolvidos}</p>
        </Card>
        <Card className="p-4 border-0 shadow-sm">
          <p className="text-sm text-slate-500">Em Garantia</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">{kpis.garantia}</p>
        </Card>
        <Card className="p-4 border-0 shadow-sm">
          <p className="text-sm text-slate-500">Custo Total</p>
          <p className="text-xl font-bold text-red-600 mt-1">{formatCurrency(kpis.custoTotal)}</p>
        </Card>
      </div>

      {/* Tabela */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Ordens de Serviço</CardTitle>
          <Button onClick={handleExport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Wrench className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Nenhuma ordem de serviço encontrada para os filtros.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>OS</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Aparelho(s)</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Abertura</TableHead>
                    <TableHead>Devolução</TableHead>
                    <TableHead className="text-right">Custo</TableHead>
                    <TableHead>Garantia</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(r => {
                    const cfg = REPAIR_STATUS_CONFIG[r.status] || REPAIR_STATUS_CONFIG.aberto;
                    const aparelhos = (r.products && r.products.length > 0
                      ? r.products
                      : [{ serial_number: r.serial_number, device_name: r.device_name }]);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.service_order_number || '-'}</TableCell>
                        <TableCell>{r.client_name || '-'}</TableCell>
                        <TableCell className="text-sm">
                          {aparelhos.map((p, i) => (
                            <div key={i}>
                              {p.device_name || '-'}
                              {p.serial_number && <span className="text-slate-400"> · SN: {p.serial_number}</span>}
                            </div>
                          ))}
                        </TableCell>
                        <TableCell>{r.supplier_name || '-'}</TableCell>
                        <TableCell>{formatLocalDate(r.date_opened)}</TableCell>
                        <TableCell>{formatLocalDate(r.date_returned_to_client)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(r.repair_cost)}</TableCell>
                        <TableCell>
                          {r.warranty_repair
                            ? <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Sim</span>
                            : <span className="text-xs text-slate-400">Não</span>}
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-1 rounded-full ${cfg.color}`}>{cfg.label}</span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}