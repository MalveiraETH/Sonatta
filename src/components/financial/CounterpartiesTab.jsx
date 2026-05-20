import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CounterpartiesTab() {
  const [counterparties, setCounterparties] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'fornecedor',
    cpf_cnpj: '',
    phone: '',
    email: '',
    address: ''
  });

  useEffect(() => {
    loadCounterparties();
  }, []);

  const loadCounterparties = async () => {
    try {
      const data = await base44.entities.Counterparty.list();
      setCounterparties(data);
    } catch (error) {
      console.error('Erro ao carregar contrapartes:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await base44.entities.Counterparty.update(editing.id, formData);
        toast.success('Contraparte atualizada!');
      } else {
        await base44.entities.Counterparty.create(formData);
        toast.success('Contraparte cadastrada!');
      }
      
      setShowForm(false);
      setEditing(null);
      setFormData({
        name: '',
        type: 'fornecedor',
        cpf_cnpj: '',
        phone: '',
        email: '',
        address: ''
      });
      loadCounterparties();
    } catch (error) {
      console.error('Erro ao salvar contraparte:', error);
      toast.error('Erro ao salvar contraparte');
    }
  };

  const handleEdit = (counterparty) => {
    setEditing(counterparty);
    setFormData(counterparty);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Deseja excluir esta contraparte?')) return;
    try {
      await base44.entities.Counterparty.delete(id);
      toast.success('Contraparte excluída!');
      loadCounterparties();
    } catch (error) {
      console.error('Erro ao excluir contraparte:', error);
      toast.error('Erro ao excluir contraparte');
    }
  };

  const typeLabels = {
    fornecedor: 'Fornecedor',
    pessoal: 'Pessoal',
    cliente: 'Cliente',
    fisco: 'Fisco'
  };

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4 px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-lg font-semibold text-slate-900">
              Contrapartes (Fornecedores, Pessoal e Clientes)
            </CardTitle>
            <Button 
              onClick={() => setShowForm(true)} 
              className="bg-[#6B3FA0] hover:bg-[#834CB8] h-11 px-6 font-medium shadow-sm w-full sm:w-auto"
            >
              <Plus className="h-5 w-5 mr-2" />
              Nova Contraparte
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          {counterparties.length === 0 ? (
            <div className="text-center py-16">
              <Users className="h-16 w-16 mx-auto mb-4 text-slate-300" />
              <p className="text-base text-slate-500 font-medium">Nenhuma contraparte cadastrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {counterparties.map(cp => (
                <div
                  key={cp.id}
                  className="flex items-start sm:items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#6B3FA0]/10 flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
                      <Users className="h-5 w-5 text-[#6B3FA0]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 text-base mb-1 truncate">{cp.name}</div>
                      <div className="text-sm text-slate-600 space-y-0.5">
                        <div className="font-medium text-[#6B3FA0]">{typeLabels[cp.type]}</div>
                        {cp.cpf_cnpj && <div className="text-xs text-slate-500">{cp.cpf_cnpj}</div>}
                        {cp.phone && <div className="text-xs text-slate-500">{cp.phone}</div>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0 ml-3">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleEdit(cp)}
                      className="h-10 w-10 hover:bg-slate-200 rounded-lg"
                    >
                      <Pencil className="h-5 w-5 text-slate-600" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(cp.id)}
                      className="h-10 w-10 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="h-5 w-5 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={() => { setShowForm(false); setEditing(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">{editing ? 'Editar Contraparte' : 'Nova Contraparte'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label className="text-sm font-medium text-slate-900 mb-2 block">Nome *</Label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome do fornecedor ou pessoa"
                className="h-11 text-base"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-900 mb-2 block">Tipo *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger className="h-11 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fornecedor">Fornecedor</SelectItem>
                  <SelectItem value="pessoal">Pessoal</SelectItem>
                  <SelectItem value="cliente">Cliente</SelectItem>
                  <SelectItem value="fisco">Fisco</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-900 mb-2 block">CPF/CNPJ</Label>
              <Input
                value={formData.cpf_cnpj}
                onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
                placeholder="000.000.000-00"
                className="h-11 text-base"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-900 mb-2 block">Telefone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(00) 00000-0000"
                className="h-11 text-base"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-900 mb-2 block">E-mail</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
                className="h-11 text-base"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-900 mb-2 block">Endereço</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Endereço completo"
                className="h-11 text-base"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => { setShowForm(false); setEditing(null); }}
                className="flex-1 h-11 text-base font-medium"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="flex-1 h-11 text-base font-medium bg-[#6B3FA0] hover:bg-[#834CB8] shadow-sm"
              >
                {editing ? 'Atualizar' : 'Salvar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}