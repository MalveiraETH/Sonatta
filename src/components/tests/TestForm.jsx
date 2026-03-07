import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { createTestAppointments, syncTestAppointments } from './syncTestAppointments';

// Componente de busca/autocomplete reutilizável
function SearchableSelect({ value, onChange, options, placeholder }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const selectedOption = options.find(o => o.value === value);
  const filtered = options.filter(o =>
    o.label?.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setOpen(false);
    setSearch('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setSearch('');
  };

  return (
    <div className="relative" ref={ref}>
      <div
        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm cursor-pointer"
        onClick={() => { setOpen(!open); if (!open) setSearch(''); }}
      >
        {open ? (
          <input
            autoFocus
            className="flex-1 outline-none bg-transparent text-sm"
            placeholder={placeholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={selectedOption ? 'text-foreground' : 'text-muted-foreground'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        )}
        <div className="flex items-center gap-1">
          {value && !open && (
            <button type="button" onClick={handleClear} className="text-slate-400 hover:text-slate-600 p-0.5">
              <X className="h-3 w-3" />
            </button>
          )}
          <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
        </div>
      </div>
      {open && (
        <div className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md">
          {filtered.length === 0 ? (
            <div className="py-2 px-3 text-sm text-slate-500">Nenhum resultado</div>
          ) : (
            filtered.map(option => (
              <div
                key={option.value}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground ${value === option.value ? 'bg-accent' : ''}`}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(option.value); }}
              >
                {option.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function TestForm({ open, onClose, test, onSuccess, extendMode = false, preselectedClientId = null, preselectedAppointmentData = null }) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    client_id: '',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    devices: [],
    professional_id: '',
    referral_professional_id: '',
    status: 'teste_agendado',
    notes: ''
  });

  useEffect(() => {
    if (open) {
      loadData();
      if (test) {
        setFormData({
          client_id: test.client_id || '',
          start_date: test.start_date || '',
          start_time: test.start_time || '',
          end_date: test.end_date || '',
          end_time: test.end_time || '',
          devices: test.devices || [],
          professional_id: test.professional_id || '',
          referral_professional_id: test.referral_professional_id || '',
          status: test.status || 'teste_agendado',
          notes: test.notes || ''
        });
      } else {
        setFormData({
          client_id: preselectedClientId || preselectedAppointmentData?.client_id || '',
          start_date: format(new Date(), 'yyyy-MM-dd'),
          start_time: '',
          end_date: '',
          end_time: '',
          devices: [],
          professional_id: preselectedAppointmentData?.professional_id || '',
          referral_professional_id: preselectedAppointmentData?.test_referral_id || '',
          status: 'teste_agendado',
          notes: ''
        });
      }
    }
  }, [open, test]);

  const loadData = async () => {
    try {
      const [clientsData, professionalsData, productsData] = await Promise.all([
        base44.entities.Client.list(),
        base44.entities.Professional.list(),
        base44.entities.Product.filter({ stock_type: 'serializado', status: 'disponivel' })
      ]);
      setClients(clientsData);
      setProfessionals(professionalsData);
      setProducts(productsData);
    } catch (error) {
      console.error(error);
    }
  };

  const addDevice = () => {
    setFormData({ ...formData, devices: [...formData.devices, { product_id: '', product_name: '', serial_number: '' }] });
  };

  const removeDevice = (index) => {
    setFormData({ ...formData, devices: formData.devices.filter((_, i) => i !== index) });
  };

  const updateDevice = (index, productId) => {
    const product = products.find(p => p.id === productId);
    const newDevices = [...formData.devices];
    newDevices[index] = product
      ? { product_id: product.id, product_name: product.name, serial_number: product.serial_number }
      : { product_id: '', product_name: '', serial_number: '' };
    setFormData({ ...formData, devices: newDevices });
  };

  const updateClientStatus = async (clientId, testStatus) => {
    try {
      let clientStatus = 'em_teste';
      if (testStatus === 'teste_finalizado') clientStatus = 'cliente_ativo';
      await base44.entities.Client.update(clientId, { status: clientStatus });
    } catch (error) {
      console.error('Erro ao atualizar status do cliente:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.client_id || !formData.start_date) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const client = clients.find(c => c.id === formData.client_id);
      const professional = professionals.find(p => p.id === formData.professional_id);
      const referralProfessional = professionals.find(p => p.id === formData.referral_professional_id);

      // Novo teste sempre começa como teste_agendado
      const statusToSave = extendMode ? 'teste_estendido' : (test ? formData.status : 'teste_agendado');

      const testData = {
        ...formData,
        client_name: client?.full_name,
        professional_name: professional?.full_name,
        referral_professional_name: referralProfessional?.full_name,
        status: statusToSave
      };

      if (test) {
        // Edição
        await base44.entities.Test.update(test.id, testData);
        await Promise.all([
          updateClientStatus(formData.client_id, testData.status),
          syncTestAppointments(test.id, testData)
        ]);
        toast.success('Teste atualizado');
      } else {
        // Criação
        const testsCount = await base44.entities.Test.list();
        testData.test_number = `TST-${String(testsCount.length + 1).padStart(4, '0')}`;
        const created = await base44.entities.Test.create(testData);
        await Promise.all([
          updateClientStatus(formData.client_id, testData.status),
          createTestAppointments(created.id, testData)
        ]);
        toast.success('Teste agendado com sucesso');
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      toast.error('Erro ao salvar teste');
    } finally {
      setLoading(false);
    }
  };

  const clientOptions = clients.map(c => ({ value: c.id, label: c.full_name }));
  const professionalOptions = professionals.map(p => ({ value: p.id, label: p.full_name }));
  const productOptions = products.map(p => ({ value: p.id, label: `${p.name} - NS: ${p.serial_number}` }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{extendMode ? 'Estender Teste' : test ? 'Editar Teste' : 'Novo Teste'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!extendMode && (
            <>
              <div>
                <Label>Cliente *</Label>
                <SearchableSelect
                  value={formData.client_id}
                  onChange={(v) => setFormData({ ...formData, client_id: v })}
                  options={clientOptions}
                  placeholder="Buscar cliente..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data Início *</Label>
                  <Input type="date" value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} />
                </div>
                <div>
                  <Label>Horário Início</Label>
                  <Input type="time" value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data Final</Label>
                  <Input type="date" value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
                </div>
                <div>
                  <Label>Horário Final</Label>
                  <Input type="time" value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Aparelhos</Label>
                  <Button type="button" size="sm" onClick={addDevice} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />Adicionar Aparelho
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.devices.map((device, index) => (
                    <div key={index} className="flex gap-2">
                      <div className="flex-1">
                        <SearchableSelect
                          value={device.product_id}
                          onChange={(v) => updateDevice(index, v)}
                          options={productOptions}
                          placeholder="Buscar por nome ou NS..."
                        />
                      </div>
                      <Button type="button" size="icon" variant="ghost" onClick={() => removeDevice(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Profissional Atendimento</Label>
                <SearchableSelect
                  value={formData.professional_id}
                  onChange={(v) => setFormData({ ...formData, professional_id: v })}
                  options={professionalOptions}
                  placeholder="Buscar profissional..."
                />
              </div>

              <div>
                <Label>Profissional Indicação Teste</Label>
                <SearchableSelect
                  value={formData.referral_professional_id}
                  onChange={(v) => setFormData({ ...formData, referral_professional_id: v })}
                  options={professionalOptions}
                  placeholder="Buscar profissional de indicação..."
                />
              </div>

              {/* Status só aparece na edição */}
              {test && (
                <div>
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="teste_agendado">Teste Agendado</SelectItem>
                      <SelectItem value="em_teste">Em Teste</SelectItem>
                      <SelectItem value="teste_estendido">Teste Estendido</SelectItem>
                      <SelectItem value="teste_finalizado">Teste Finalizado</SelectItem>
                      <SelectItem value="teste_pendente">Teste Pendente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label>Observações</Label>
                <Textarea value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3} />
              </div>
            </>
          )}

          {extendMode && (
            <div>
              <Label>Nova Data Final *</Label>
              <Input type="date" value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading} className="bg-[#6B3FA0] hover:bg-[#834CB8]">
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}