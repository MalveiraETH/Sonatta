import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Wrench, Package, Truck, CheckCircle2, Clock, AlertCircle, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import RepairForm from '@/components/repairs/RepairForm';
import RepairTimeline from '@/components/repairs/RepairTimeline';

const STATUS_CONFIG = {
  aberto: { label: 'Aberto', color: 'bg-blue-100 text-blue-700', icon: Clock },
  enviado_ao_fornecedor: { label: 'Enviado ao Fornecedor', color: 'bg-orange-100 text-orange-700', icon: Truck },
  em_reparo: { label: 'Em Reparo', color: 'bg-yellow-100 text-yellow-700', icon: Wrench },
  reparado: { label: 'Reparado', color: 'bg-teal-100 text-teal-700', icon: Package },
  aguardando_retirada: { label: 'Aguardando Retirada', color: 'bg-purple-100 text-purple-700', icon: AlertCircle },
  devolvido_ao_cliente: { label: 'Devolvido ao Cliente', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  cancelado: { label: 'Cancelado', color: 'bg-slate-100 text-slate-500', icon: AlertCircle },
};

export default function DeviceRepairs() {
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [formOpen, setFormOpen] = useState(false);
  const [editingRepair, setEditingRepair] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const loadRepairs = async () => {
    setLoading(true);
    const data = await base44.entities.DeviceRepair.list('-created_date', 200);
    setRepairs(data);
    setLoading(false);
  };

  useEffect(() => { loadRepairs(); }, []);

  const handleEdit = (repair) => { setEditingRepair(repair); setFormOpen(true); };
  const handleNew = () => { setEditingRepair(null); setFormOpen(true); };
  const handleDelete = async (id) => {
    if (!confirm('Excluir esta ordem de serviço?')) return;
    await base44.entities.DeviceRepair.delete(id);
    loadRepairs();
  };

  const openTracking = (code) => {
    window.open(`https://rastreamento.correios.com.br/app/index.php?objetos=${code}`, '_blank');
  };

  const filtered = repairs.filter(r => {
    const matchStatus = statusFilter === 'todos' || r.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || r.client_name?.toLowerCase().includes(q) || r.serial_number?.toLowerCase().includes(q) || r.device_name?.toLowerCase().includes(q) || r.service_order_number?.toLowerCase().includes(q) || r.shipping_tracking_code?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  // KPIs
  const kpis = {
    abertos: repairs.filter(r => r.status === 'aberto').length,
    em_andamento: repairs.filter(r => ['enviado_ao_fornecedor', 'em_reparo', 'reparado', 'aguardando_retirada'].includes(r.status)).length,
    devolvidos: repairs.filter(r => r.status === 'devolvido_ao_cliente').length,
    total: repairs.length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Consertos</h1>
          <p className="text-slate-500 text-sm mt-0.5">Controle de aparelhos enviados para reparo</p>
        </div>
        <Button onClick={handleNew} className="bg-[#6B3FA0] hover:bg-[#5a3490] text-white gap-2">
          <Plus className="w-4 h-4" />
          Nova OS
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'OS Abertas', value: kpis.abertos, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Em Andamento', value: kpis.em_andamento, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Devolvidos', value: kpis.devolvidos, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Total', value: kpis.total, color: 'text-slate-700', bg: 'bg-slate-50' },
        ].map(k => (
          <Card key={k.label} className={`${k.bg} border-0`}>
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">{k.label}</p>
              <p className={`text-3xl font-bold ${k.color}`}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="pl-9" placeholder="Buscar por cliente, série, OS..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Wrench className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Nenhuma ordem de serviço encontrada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(repair => {
            const cfg = STATUS_CONFIG[repair.status] || STATUS_CONFIG.aberto;
            const Icon = cfg.icon;
            const isExpanded = expandedId === repair.id;

            return (
              <Card key={repair.id} className="border border-slate-200 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : repair.id)}
                  >
                    {/* Left */}
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-800">{repair.client_name}</span>
                          {repair.warranty_repair && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Garantia</span>
                          )}
                          <Badge className={`text-xs ${cfg.color} border-0`}>{cfg.label}</Badge>
                        </div>
                        <p className="text-sm text-slate-600 mt-0.5">
                          {repair.device_name} {repair.serial_number ? `· SN: ${repair.serial_number}` : ''}
                        </p>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-400">
                          {repair.service_order_number && <span>OS: {repair.service_order_number}</span>}
                          {repair.supplier_name && <span>Fornecedor: {repair.supplier_name}</span>}
                          {repair.date_opened && <span>Abertura: {new Date(repair.date_opened + 'T00:00:00').toLocaleDateString('pt-BR')}</span>}
                          {repair.professional_name && <span>Fono: {repair.professional_name}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      {repair.shipping_tracking_code && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-xs"
                          onClick={() => openTracking(repair.shipping_tracking_code)}
                        >
                          <ExternalLink className="w-3 h-3" />
                          Rastrear
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => handleEdit(repair)}>
                        <Pencil className="w-4 h-4 text-slate-500" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => handleDelete(repair.id)}>
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    </div>
                  </div>

                  {/* Expanded: Timeline + Detalhes */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Timeline</p>
                        <RepairTimeline repair={repair} />
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Problema Relatado</p>
                          <p className="text-sm text-slate-700 bg-slate-50 rounded p-2">{repair.description_problem || '—'}</p>
                        </div>
                        {repair.description_repair && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Reparo Realizado</p>
                            <p className="text-sm text-slate-700 bg-slate-50 rounded p-2">{repair.description_repair}</p>
                          </div>
                        )}
                        {repair.notes && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Observações</p>
                            <p className="text-sm text-slate-700 bg-slate-50 rounded p-2">{repair.notes}</p>
                          </div>
                        )}
                        {repair.outbound_note_number && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Nota de Saída</p>
                            <p className="text-sm text-slate-700">{repair.outbound_note_number}</p>
                          </div>
                        )}
                        {repair.repair_cost > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Custo do Reparo</p>
                            <p className="text-sm font-semibold text-slate-800">
                              {repair.repair_cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <RepairForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        repair={editingRepair}
        onSaved={loadRepairs}
      />
    </div>
  );
}