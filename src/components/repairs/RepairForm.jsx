import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const SUPPLIERS = ['Phonak', 'Widex', 'Oticon', 'Signia', 'Starkey', 'ReSound', 'Unitron', 'Outro'];

export default function RepairForm({ open, onClose, repair, onSaved }) {
  const [clients, setClients] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [serializedProducts, setSerializedProducts] = useState([]);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [snSearch, setSnSearch] = useState('');
  const [snFocused, setSnFocused] = useState(false);
  const [snError, setSnError] = useState('');

  useEffect(() => {
    base44.entities.Client.list('-full_name', 200).then(setClients);
    base44.entities.Professional.list('-full_name', 50).then(setProfessionals);
    base44.entities.Product.filter({ stock_type: 'serializado' }, '-created_date', 500).then(setSerializedProducts);
  }, []);

  useEffect(() => {
    if (repair) {
      setForm(repair);
      setSnSearch(repair.serial_number || '');
    } else {
      setForm({
        date_opened: new Date().toISOString().split('T')[0],
        status: 'aberto',
        warranty_repair: false,
        repair_cost: 0,
      });
      setSnSearch('');
    }
  }, [repair, open]);

  const handleProductSelect = (product) => {
    setForm(prev => ({
      ...prev,
      serial_number: product.serial_number || '',
      device_name: [product.brand, product.model, product.name].filter(Boolean).join(' '),
    }));
    setSnSearch(product.serial_number || '');
    setSnFocused(false);
  };

  const filteredProducts = serializedProducts.filter(p => {
    if (!snSearch) return false;
    const q = snSearch.toLowerCase();
    return (
      p.serial_number?.toLowerCase().includes(q) ||
      p.name?.toLowerCase().includes(q) ||
      p.model?.toLowerCase().includes(q) ||
      p.brand?.toLowerCase().includes(q)
    );
  });

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleClientSelect = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      set('client_id', client.id);
      set('client_name', client.full_name);
      set('client_phone', client.phone);
    }
  };

  const handleProfessionalSelect = (profId) => {
    const prof = professionals.find(p => p.id === profId);
    if (prof) {
      set('professional_id', prof.id);
      set('professional_name', prof.full_name);
    }
  };

  const handleSubmit = async () => {
    if (!form.client_id || !form.device_name || !form.serial_number || !form.supplier_name || !form.description_problem || !form.date_opened) {
      alert('Preencha todos os campos obrigatórios.');
      return;
    }
    
    // Validar se SN existe no estoque
    const productExists = serializedProducts.some(p => p.serial_number === form.serial_number);
    if (!productExists) {
      setSnError('Produto não encontrado no estoque');
      return;
    }

    setLoading(true);
    if (repair?.id) {
      await base44.entities.DeviceRepair.update(repair.id, form);
    } else {
      await base44.entities.DeviceRepair.create(form);
    }
    setLoading(false);
    onSaved();
    onClose();
  };

  const filteredClients = clients.filter(c =>
    c.full_name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.phone?.includes(clientSearch)
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{repair ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Cliente */}
          <div className="md:col-span-2 space-y-1">
            <Label>Cliente *</Label>
            <Input
              placeholder="Buscar cliente..."
              value={clientSearch || form.client_name || ''}
              onChange={e => { setClientSearch(e.target.value); set('client_id', ''); set('client_name', ''); }}
            />
            {clientSearch && !form.client_id && (
              <div className="border rounded-md max-h-40 overflow-y-auto bg-white shadow-md z-10">
                {filteredClients.slice(0, 8).map(c => (
                  <div
                    key={c.id}
                    className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm"
                    onClick={() => { handleClientSelect(c.id); setClientSearch(''); }}
                  >
                    {c.full_name} — {c.phone}
                  </div>
                ))}
                {filteredClients.length === 0 && <div className="px-3 py-2 text-sm text-slate-400">Nenhum cliente encontrado</div>}
              </div>
            )}
          </div>

          {/* Número de Série com autocomplete do estoque */}
          <div className="space-y-1 relative">
            <Label>Número de Série *</Label>
            <Input
              value={snSearch}
              onChange={e => {
                setSnSearch(e.target.value);
                set('serial_number', e.target.value);
                setSnError('');
              }}
              onFocus={() => setSnFocused(true)}
              onBlur={() => setTimeout(() => setSnFocused(false), 200)}
              placeholder="Buscar por SN, modelo ou marca..."
              autoComplete="off"
              className={snError ? 'border-red-500' : ''}
            />
            {snFocused && snSearch && filteredProducts.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 border rounded-md max-h-48 overflow-y-auto bg-white shadow-lg z-50">
                {filteredProducts.slice(0, 10).map(p => (
                  <div
                    key={p.id}
                    className="px-3 py-2 hover:bg-purple-50 cursor-pointer text-sm border-b last:border-0"
                    onMouseDown={() => handleProductSelect(p)}
                  >
                    <span className="font-medium text-slate-800">{p.serial_number}</span>
                    <span className="text-slate-500 ml-2">{[p.brand, p.model, p.name].filter(Boolean).join(' ')}</span>
                  </div>
                ))}
              </div>
            )}
            {snFocused && snSearch && filteredProducts.length === 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 border rounded-md bg-white shadow-lg z-50 px-3 py-2 text-sm text-red-500 font-medium">
                Produto não encontrado
              </div>
            )}
            {snError && <p className="text-red-500 text-sm mt-1">{snError}</p>}
          </div>

          {/* Nome do Aparelho */}
          <div className="space-y-1">
            <Label>Nome do Aparelho *</Label>
            <Input
              value={form.device_name || ''}
              onChange={e => set('device_name', e.target.value)}
              placeholder="Preenchido automaticamente ou edite manualmente"
            />
          </div>

          {/* OS e Nota */}
          <div className="space-y-1">
            <Label>Nº da Ordem de Serviço</Label>
            <Input value={form.service_order_number || ''} onChange={e => set('service_order_number', e.target.value)} placeholder="OS-001" />
          </div>
          <div className="space-y-1">
            <Label>Nº Nota de Saída</Label>
            <Input value={form.outbound_note_number || ''} onChange={e => set('outbound_note_number', e.target.value)} placeholder="NF-e de saída" />
          </div>

          {/* Fornecedor */}
          <div className="space-y-1">
            <Label>Fornecedor *</Label>
            <Select value={form.supplier_name || ''} onValueChange={v => set('supplier_name', v)}>
              <SelectTrigger><SelectValue placeholder="Selecionar fornecedor" /></SelectTrigger>
              <SelectContent>
                {SUPPLIERS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Profissional */}
          <div className="space-y-1">
            <Label>Profissional Responsável</Label>
            <Select value={form.professional_id || ''} onValueChange={handleProfessionalSelect}>
              <SelectTrigger><SelectValue placeholder="Selecionar profissional" /></SelectTrigger>
              <SelectContent>
                {professionals.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Rastreamento */}
          <div className="space-y-1">
            <Label>Código de Rastreamento Correios</Label>
            <Input value={form.shipping_tracking_code || ''} onChange={e => set('shipping_tracking_code', e.target.value)} placeholder="AA123456789BR" />
          </div>

          {/* Status */}
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={form.status || 'aberto'} onValueChange={v => set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="aberto">Aberto</SelectItem>
                <SelectItem value="enviado_ao_fornecedor">Enviado ao Fornecedor</SelectItem>
                <SelectItem value="em_reparo">Em Reparo</SelectItem>
                <SelectItem value="reparado">Reparado</SelectItem>
                <SelectItem value="aguardando_retirada">Aguardando Retirada</SelectItem>
                <SelectItem value="devolvido_ao_cliente">Devolvido ao Cliente</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Datas */}
          <div className="space-y-1">
            <Label>Data de Abertura *</Label>
            <Input type="date" value={form.date_opened || ''} onChange={e => set('date_opened', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Data de Envio ao Fornecedor</Label>
            <Input type="date" value={form.date_sent_to_supplier || ''} onChange={e => set('date_sent_to_supplier', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Data de Recebimento pelo Fornecedor</Label>
            <Input type="date" value={form.date_received_by_supplier || ''} onChange={e => set('date_received_by_supplier', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Data de Retorno do Fornecedor</Label>
            <Input type="date" value={form.date_returned_from_supplier || ''} onChange={e => set('date_returned_from_supplier', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Data de Devolução ao Cliente</Label>
            <Input type="date" value={form.date_returned_to_client || ''} onChange={e => set('date_returned_to_client', e.target.value)} />
          </div>

          {/* Custo e Garantia */}
          <div className="space-y-1">
            <Label>Custo do Reparo (R$)</Label>
            <Input type="number" value={form.repair_cost || 0} onChange={e => set('repair_cost', parseFloat(e.target.value) || 0)} />
          </div>

          <div className="flex items-center gap-3 md:col-span-2">
            <Switch checked={form.warranty_repair || false} onCheckedChange={v => set('warranty_repair', v)} />
            <Label>Reparo em garantia</Label>
          </div>

          {/* Descrições */}
          <div className="md:col-span-2 space-y-1">
            <Label>Descrição do Problema *</Label>
            <Textarea value={form.description_problem || ''} onChange={e => set('description_problem', e.target.value)} rows={3} placeholder="Descreva o problema relatado pelo cliente..." />
          </div>
          <div className="md:col-span-2 space-y-1">
            <Label>Descrição do Reparo</Label>
            <Textarea value={form.description_repair || ''} onChange={e => set('description_repair', e.target.value)} rows={3} placeholder="Descreva o reparo realizado (preencher ao receber do fornecedor)..." />
          </div>
          <div className="md:col-span-2 space-y-1">
            <Label>Observações</Label>
            <Textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Observações adicionais..." />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-[#6B3FA0] hover:bg-[#5a3490] text-white">
            {loading ? 'Salvando...' : repair ? 'Salvar Alterações' : 'Criar OS'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}