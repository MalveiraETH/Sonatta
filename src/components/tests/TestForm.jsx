import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle } from
'@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
'@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

function DeviceSearchInput({ index, device, products, onUpdate, onRemove }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const selectedProduct = products.find(p => p.id === device.product_id);
  const displayValue = selectedProduct ? `${selectedProduct.name} - NS: ${selectedProduct.serial_number}` : '';

  const filtered = products.filter(p =>
    !search ||
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.serial_number?.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (productId) => {
    onUpdate(index, productId);
    setSearch('');
    setOpen(false);
  };

  const handleInputChange = (e) => {
    setSearch(e.target.value);
    if (!open) setOpen(true);
    if (e.target.value === '' && device.product_id) {
      // clear selection on backspace
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Backspace' && search === '' && device.product_id) {
      onUpdate(index, null);
    }
  };

  return (
    <div className="flex gap-2 flex-1" ref={ref}>
      <div className="relative flex-1">
        <div
          className="flex items-center border border-input rounded-md px-3 py-2 bg-background cursor-text"
          onClick={() => { setOpen(true); }}
        >
          <input
            className="flex-1 outline-none text-sm bg-transparent"
            placeholder={displayValue || 'Selecione por NS'}
            value={open ? search : displayValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setOpen(true)}
          />
          <ChevronDown className="h-4 w-4 text-muted-foreground ml-1 shrink-0" />
        </div>
        {open && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-input rounded-md shadow-lg max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum resultado</div>
            ) : (
              filtered.map(product => (
                <div
                  key={product.id}
                  className="px-3 py-2 text-sm hover:bg-slate-100 cursor-pointer"
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(product.id); }}
                >
                  {product.name} - NS: {product.serial_number}
                </div>
              ))
            )}
          </div>
        )}
      </div>
      <button type="button" onClick={() => onRemove(index)} className="p-2 hover:bg-slate-100 rounded-md">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function TestForm({ open, onClose, test, onSuccess, extendMode = false, preselectedClientId = null }) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    client_id: '',
    start_date: '',
    end_date: '',
    devices: [],
    professional_id: '',
    referral_professional_id: '',
    status: 'em_teste',
    notes: ''
  });

  useEffect(() => {
    if (open) {
      loadData();
      if (test) {
        setFormData({
          client_id: test.client_id || '',
          start_date: test.start_date || '',
          end_date: test.end_date || '',
          devices: test.devices || [],
          professional_id: test.professional_id || '',
          referral_professional_id: test.referral_professional_id || '',
          status: test.status || 'em_teste',
          notes: test.notes || ''
        });
      } else {
        setFormData({
          client_id: preselectedClientId || '',
          start_date: format(new Date(), 'yyyy-MM-dd'),
          end_date: '',
          devices: [],
          professional_id: '',
          referral_professional_id: '',
          status: 'em_teste',
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
      base44.entities.Product.filter({ stock_type: 'serializado', status: 'disponivel' })]
      );
      setClients(clientsData);
      setProfessionals(professionalsData);
      setProducts(productsData);
    } catch (error) {
      console.error(error);
    }
  };

  const addDevice = () => {
    setFormData({
      ...formData,
      devices: [...formData.devices, { product_id: '', product_name: '', serial_number: '' }]
    });
  };

  const removeDevice = (index) => {
    setFormData({
      ...formData,
      devices: formData.devices.filter((_, i) => i !== index)
    });
  };

  const updateDevice = (index, productId) => {
    const newDevices = [...formData.devices];
    if (!productId) {
      newDevices[index] = { product_id: '', product_name: '', serial_number: '' };
    } else {
      const product = products.find((p) => p.id === productId);
      if (product) {
        newDevices[index] = {
          product_id: product.id,
          product_name: product.name,
          serial_number: product.serial_number
        };
      }
    }
    setFormData({ ...formData, devices: newDevices });
  };

  const updateClientStatus = async (clientId, testStatus) => {
    try {
      let clientStatus = 'em_teste';

      if (testStatus === 'em_teste') {
        clientStatus = 'em_teste';
      } else if (testStatus === 'teste_estendido') {
        clientStatus = 'em_teste';
      } else if (testStatus === 'teste_finalizado') {
        clientStatus = 'cliente_ativo';
      } else if (testStatus === 'teste_pendente') {
        clientStatus = 'em_teste';
      }

      await base44.entities.Client.update(clientId, { status: clientStatus });
    } catch (error) {
      console.error('Erro ao atualizar status do cliente:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.client_id || !formData.start_date || !formData.end_date) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const client = clients.find((c) => c.id === formData.client_id);
      const professional = professionals.find((p) => p.id === formData.professional_id);
      const referralProfessional = professionals.find((p) => p.id === formData.referral_professional_id);

      const testData = {
        ...formData,
        client_name: client?.full_name,
        professional_name: professional?.full_name,
        referral_professional_name: referralProfessional?.full_name,
        status: extendMode ? 'teste_estendido' : formData.status
      };

      if (test) {
        await base44.entities.Test.update(test.id, testData);

        // Atualizar status do cliente baseado no status do teste
        await updateClientStatus(formData.client_id, testData.status);

        toast.success('Teste atualizado');
      } else {
        const testsCount = await base44.entities.Test.list();
        testData.test_number = `TST-${String(testsCount.length + 1).padStart(4, '0')}`;
        await base44.entities.Test.create(testData);

        // Atualizar status do cliente baseado no status do teste
        await updateClientStatus(formData.client_id, testData.status);

        toast.success('Teste cadastrado');
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      toast.error('Erro ao salvar teste');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{extendMode ? 'Estender Teste' : test ? 'Editar Teste' : 'Novo Teste'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!extendMode &&
          <>
              <div>
                <Label>Cliente *</Label>
                <Select value={formData.client_id} onValueChange={(v) => setFormData({ ...formData, client_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) =>
                  <SelectItem key={client.id} value={client.id}>{client.full_name}</SelectItem>
                  )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data Início *</Label>
                  <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} />

                </div>
                <div>
                  <Label>Data Final *</Label>
                  <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />

                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Aparelhos</Label>
                  <Button type="button" size="sm" onClick={addDevice} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Aparelho
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.devices.map((device, index) =>
                <DeviceSearchInput
                  key={index}
                  index={index}
                  device={device}
                  products={products}
                  onUpdate={updateDevice}
                  onRemove={removeDevice}
                />
                )}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Profissional Atendimento</Label>
                <Select value={formData.professional_id} onValueChange={(v) => setFormData({ ...formData, professional_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    {professionals.map((prof) =>
                  <SelectItem key={prof.id} value={prof.id}>{prof.full_name}</SelectItem>
                  )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Profissional Indicação Teste</Label>
                <Select value={formData.referral_professional_id} onValueChange={(v) => setFormData({ ...formData, referral_professional_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o profissional de indicação" />
                  </SelectTrigger>
                  <SelectContent>
                    {professionals.map((prof) =>
                  <SelectItem key={prof.id} value={prof.id}>{prof.full_name}</SelectItem>
                  )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="em_teste">Em Teste</SelectItem>
                    <SelectItem value="teste_estendido">Teste Estendido</SelectItem>
                    <SelectItem value="teste_finalizado">Teste Finalizado</SelectItem>
                    <SelectItem value="teste_pendente">Teste Pendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3} />

              </div>
            </>
          }

          {extendMode &&
          <div>
              <Label>Nova Data Final *</Label>
              <Input
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />

            </div>
          }

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-[#6B3FA0] hover:bg-[#834CB8]">
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>);

}