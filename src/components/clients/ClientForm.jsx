import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ClientForm({ open, onOpenChange, client, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    cpf: '',
    phone: '',
    email: '',
    address_cep: '',
    address_number: '',
    address_neighborhood: '',
    birth_date: '',
    payer_name: '',
    payer_document: '',
    status: 'lead',
    notes: ''
  });

  useEffect(() => {
    if (client) {
      setFormData({
        full_name: client.full_name || '',
        cpf: client.cpf || '',
        phone: client.phone || '',
        email: client.email || '',
        address_cep: client.address_cep || '',
        address_number: client.address_number || '',
        address_neighborhood: client.address_neighborhood || '',
        birth_date: client.birth_date || '',
        payer_name: client.payer_name || '',
        payer_document: client.payer_document || '',
        status: client.status || 'lead',
        notes: client.notes || ''
      });
    } else {
      setFormData({
        full_name: '',
        cpf: '',
        phone: '',
        email: '',
        address_cep: '',
        address_number: '',
        address_neighborhood: '',
        birth_date: '',
        payer_name: '',
        payer_document: '',
        status: 'lead',
        notes: ''
      });
    }
  }, [client, open]);

  const formatCPF = (value) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const formatPhone = (value) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const formatCNPJ = (value) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const formatDocument = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return formatCPF(value);
    } else {
      return formatCNPJ(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name || !formData.phone) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      if (client) {
        await base44.entities.Client.update(client.id, formData);
        toast.success('Cliente atualizado com sucesso!');
      } else {
        await base44.entities.Client.create(formData);
        toast.success('Cliente cadastrado com sucesso!');
      }
      await onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving client:', error);
      toast.error(`Erro ao salvar cliente: ${error.message || 'Tente novamente'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800">
            {client ? 'Editar Cliente' : 'Novo Cliente'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="full_name">Nome Completo *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value.toUpperCase() })}
                placeholder="Nome completo do cliente"
                className="uppercase"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone (WhatsApp) *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="birth_date">Data de Nascimento</Label>
              <Input
                id="birth_date"
                type="date"
                value={formData.birth_date}
                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_cep">CEP</Label>
              <Input
                id="address_cep"
                value={formData.address_cep}
                onChange={(e) => setFormData({ ...formData, address_cep: e.target.value.replace(/\D/g, '').slice(0, 8) })}
                placeholder="00000-000"
                maxLength={8}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_number">Número</Label>
              <Input
                id="address_number"
                value={formData.address_number}
                onChange={(e) => setFormData({ ...formData, address_number: e.target.value })}
                placeholder="123"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_neighborhood">Bairro</Label>
              <Input
                id="address_neighborhood"
                value={formData.address_neighborhood}
                onChange={(e) => setFormData({ ...formData, address_neighborhood: e.target.value.toUpperCase() })}
                placeholder="Nome do bairro"
                className="uppercase"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="font-semibold text-slate-700">Responsável pelo Pagamento (se diferente do cliente)</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payer_name">Nome do Responsável</Label>
              <Input
                id="payer_name"
                value={formData.payer_name}
                onChange={(e) => setFormData({ ...formData, payer_name: e.target.value.toUpperCase() })}
                placeholder="Nome do responsável pelo pagamento"
                className="uppercase"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payer_document">CPF ou CNPJ do Responsável</Label>
              <Input
                id="payer_document"
                value={formData.payer_document}
                onChange={(e) => setFormData({ ...formData, payer_document: formatDocument(e.target.value) })}
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                maxLength={18}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="cliente_ativo">Cliente Ativo</SelectItem>
                  <SelectItem value="pos_venda">Pós-Venda</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Observações gerais sobre o cliente"
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {client ? 'Salvar Alterações' : 'Cadastrar Cliente'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}