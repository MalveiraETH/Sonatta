import React, { useState, useEffect } from 'react';
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
import { Plus, X, ChevronsUpDown, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';

function DeviceCombobox({ device, products, onSelect, onRemove }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="flex-1 justify-between font-normal">
            {device.product_id
              ? products.find(p => p.id === device.product_id)
                ? `${products.find(p => p.id === device.product_id).name} - NS: ${products.find(p => p.id === device.product_id).serial_number}`
                : 'Selecione por NS'
              : 'Selecione por NS'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0" style={{ width: 'var(--radix-popover-trigger-width)' }}>
          <Command>
            <CommandInput placeholder="Buscar por nome ou NS..." />
            <CommandList>
              <CommandEmpty>Nenhum aparelho encontrado.</CommandEmpty>
              <CommandGroup>
                {products.map(product => (
                  <CommandItem
                    key={product.id}
                    value={`${product.name} ${product.serial_number}`}
                    onSelect={() => { onSelect(product.id); setOpen(false); }}
                  >
                    <Check className={cn('mr-2 h-4 w-4', device.product_id === product.id ? 'opacity-100' : 'opacity-0')} />
                    {product.name} - NS: {product.serial_number}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Button type="button" size="icon" variant="ghost" onClick={onRemove}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function TestForm({ open, onClose, test, onSuccess, extendMode = false, preselectedClientId = null, preselectedAppointmentData = null }) {
  const [loading, setLoading] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);
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
          client_id: preselectedClientId || preselectedAppointmentData?.client_id || '',
          start_date: format(new Date(), 'yyyy-MM-dd'),
          end_date: '',
          devices: [],
          professional_id: preselectedAppointmentData?.professional_id || '',
          referral_professional_id: preselectedAppointmentData?.test_referral_id || '',
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
    const product = products.find((p) => p.id === productId);
    if (product) {
      const newDevices = [...formData.devices];
      newDevices[index] = {
        product_id: product.id,
        product_name: product.name,
        serial_number: product.serial_number
      };
      setFormData({ ...formData, devices: newDevices });
    }
  };

  const updateClientStatus = async (clientId, testStatus) => {
    try {
      // Status do cliente é independente do teste: só altera para cliente_ativo ao finalizar
      // Nos demais casos, mantém o status atual (não toca no status lead/cliente_ativo/pos_venda)
      if (testStatus === 'teste_finalizado') {
        await base44.entities.Client.update(clientId, { status: 'cliente_ativo' });
      }
      // Para outros status de teste (em_teste, teste_estendido, teste_pendente), não altera o status do cliente
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
                <Popover open={clientOpen} onOpenChange={setClientOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between font-normal"
                    >
                      {formData.client_id
                        ? clients.find(c => c.id === formData.client_id)?.full_name
                        : 'Selecione o cliente'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                    <Command>
                      <CommandInput placeholder="Buscar cliente..." />
                      <CommandList>
                        <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                        <CommandGroup>
                          {clients.map(client => (
                            <CommandItem
                              key={client.id}
                              value={client.full_name}
                              onSelect={() => {
                                setFormData({ ...formData, client_id: client.id });
                                setClientOpen(false);
                              }}
                            >
                              <Check className={cn('mr-2 h-4 w-4', formData.client_id === client.id ? 'opacity-100' : 'opacity-0')} />
                              {client.full_name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
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
                  {formData.devices.map((device, index) => (
                    <DeviceCombobox
                      key={index}
                      device={device}
                      products={products}
                      onSelect={(v) => updateDevice(index, v)}
                      onRemove={() => removeDevice(index)}
                    />
                  ))}
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