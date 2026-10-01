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
import { maskCPF, maskPhone, maskDocument, documentError, onlyDigits } from '@/lib/masks';
import FieldError from '@/components/ui/FieldError';
import CepInput from '@/components/ui/CepInput';

const emptyForm = {
  full_name: '',
  cpf: '',
  phone: '',
  email: '',
  address: '',
  address_cep: '',
  address_number: '',
  address_neighborhood: '',
  address_city: '',
  address_state: '',
  birth_date: '',
  payer_name: '',
  payer_document: '',
  status: 'lead',
  uso_aparelhos: 'unilateral',
  notes: ''
};

export default function ClientForm({ open, onOpenChange, client, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [cepFilled, setCepFilled] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    if (client) {
      setFormData({
        full_name: client.full_name || '',
        cpf: client.cpf || '',
        phone: client.phone || '',
        email: client.email || '',
        address: client.address || '',
        address_cep: client.address_cep || '',
        address_number: client.address_number || '',
        address_neighborhood: client.address_neighborhood || '',
        address_city: client.address_city || '',
        address_state: client.address_state || '',
        birth_date: client.birth_date || '',
        payer_name: client.payer_name || '',
        payer_document: client.payer_document || '',
        status: client.status || 'lead',
        uso_aparelhos: client.uso_aparelhos || 'unilateral',
        notes: client.notes || ''
      });
    } else {
      setFormData(emptyForm);
    }
    setErrors({});
    setCepFilled(false);
  }, [client, open]);

  const setField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => (prev[field] ? { ...prev, [field]: null } : prev));
  };

  const setAddressField = (field, value) => {
    setCepFilled(false);
    setField(field, value);
  };

  const cpfError = () => documentError(formData.cpf, { kind: 'cpf', original: client?.cpf });
  const payerError = () => documentError(formData.payer_document, { kind: 'document', original: client?.payer_document });

  const handleCepResolved = (data) => {
    setFormData(prev => ({
      ...prev,
      address: data.street || prev.address,
      address_neighborhood: (data.neighborhood || prev.address_neighborhood || '').toUpperCase(),
      address_city: (data.city || prev.address_city || '').toUpperCase(),
      address_state: (data.state || prev.address_state || '').toUpperCase()
    }));
    setCepFilled(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name || !formData.phone) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    // Documentos inválidos bloqueiam o salvamento. Cadastros legados (valor já salvo
    // e não alterado) continuam editáveis.
    const docErrors = { cpf: cpfError(), payer_document: payerError() };
    setErrors(docErrors);

    const cepDigits = onlyDigits(formData.address_cep);
    const cepIncomplete = cepDigits.length > 0
      && cepDigits.length < 8
      && cepDigits !== onlyDigits(client?.address_cep);

    if (docErrors.cpf || docErrors.payer_document || cepIncomplete) {
      toast.error('Confira os campos destacados antes de salvar.');
      return;
    }

    // Validação de CPF duplicado
    const cpfNormalized = onlyDigits(formData.cpf);
    if (cpfNormalized) {
      try {
        const existing = await base44.entities.Client.list('-created_date', 500);
        const duplicate = existing.find(c =>
          onlyDigits(c.cpf) === cpfNormalized && c.id !== client?.id
        );
        if (duplicate) {
          toast.error(`Já existe um cliente com este CPF: ${duplicate.full_name}`);
          return;
        }
      } catch (error) {
        console.error('Error checking duplicate CPF:', error);
      }
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

  const filledClass = cepFilled ? 'border-emerald-300 bg-emerald-50/50' : '';

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
                onChange={(e) => setField('full_name', e.target.value.toUpperCase())}
                placeholder="Nome completo do cliente"
                className="uppercase"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                value={formData.cpf}
                onChange={(e) => setField('cpf', maskCPF(e.target.value))}
                onBlur={() => setErrors(prev => ({ ...prev, cpf: cpfError() }))}
                placeholder="000.000.000-00"
                maxLength={14}
                inputMode="numeric"
                className={errors.cpf ? 'border-red-400' : ''}
              />
              <FieldError message={errors.cpf} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone (WhatsApp) *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setField('phone', maskPhone(e.target.value))}
                placeholder="(00) 00000-0000"
                maxLength={15}
                inputMode="numeric"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setField('email', e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="birth_date">Data de Nascimento</Label>
              <Input
                id="birth_date"
                type="date"
                value={formData.birth_date}
                onChange={(e) => setField('birth_date', e.target.value)}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Rua / Logradouro</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setAddressField('address', e.target.value)}
                placeholder="Preenchido automaticamente pelo CEP"
                className={filledClass}
              />
            </div>

            <CepInput
              value={formData.address_cep}
              onChange={(value) => setField('address_cep', value)}
              onResolved={handleCepResolved}
              savedValue={client?.address_cep}
            />

            <div className="space-y-2">
              <Label htmlFor="address_number">Número</Label>
              <Input
                id="address_number"
                value={formData.address_number}
                onChange={(e) => setField('address_number', e.target.value)}
                placeholder="123"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_neighborhood">Bairro</Label>
              <Input
                id="address_neighborhood"
                value={formData.address_neighborhood}
                onChange={(e) => setAddressField('address_neighborhood', e.target.value.toUpperCase())}
                placeholder="Nome do bairro"
                className={`uppercase ${filledClass}`}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_city">Cidade / UF</Label>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  id="address_city"
                  value={formData.address_city}
                  onChange={(e) => setAddressField('address_city', e.target.value.toUpperCase())}
                  placeholder="Cidade"
                  className={`col-span-2 uppercase ${filledClass}`}
                />
                <Input
                  id="address_state"
                  value={formData.address_state}
                  onChange={(e) => setAddressField('address_state', e.target.value.toUpperCase().slice(0, 2))}
                  placeholder="UF"
                  maxLength={2}
                  className={`uppercase ${filledClass}`}
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="font-semibold text-slate-700">Responsável pelo Pagamento (se diferente do cliente)</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payer_name">Nome do Responsável</Label>
              <Input
                id="payer_name"
                value={formData.payer_name}
                onChange={(e) => setField('payer_name', e.target.value.toUpperCase())}
                placeholder="Nome do responsável pelo pagamento"
                className="uppercase"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payer_document">CPF ou CNPJ do Responsável</Label>
              <Input
                id="payer_document"
                value={formData.payer_document}
                onChange={(e) => setField('payer_document', maskDocument(e.target.value))}
                onBlur={() => setErrors(prev => ({ ...prev, payer_document: payerError() }))}
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                maxLength={18}
                inputMode="numeric"
                className={errors.payer_document ? 'border-red-400' : ''}
              />
              <FieldError message={errors.payer_document} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setField('status', value)}
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

            <div className="space-y-2">
              <Label htmlFor="uso_aparelhos">Uso de Aparelhos</Label>
              <Select
                value={formData.uso_aparelhos}
                onValueChange={(value) => setField('uso_aparelhos', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unilateral">🦻 Unilateral (1 aparelho)</SelectItem>
                  <SelectItem value="bilateral">🦻🦻 Bilateral (par de aparelhos)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setField('notes', e.target.value)}
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