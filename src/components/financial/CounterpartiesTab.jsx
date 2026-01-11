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
    cliente: 'Cliente'
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Contrapartes (Fornecedores, Pessoal e Clientes)</CardTitle>
          <Button onClick={() => setShowForm(true)} className="bg-[#6B3FA0] hover:bg-[#834CB8]">
            <Plus className="h-4 w-4 mr-2" />
            Nova Contraparte
          </Button>
        </CardHeader>
        <CardContent>
          {counterparties.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p>Nenhuma contraparte cadastrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {counterparties.map(cp => (
                <div
                  key={cp.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-slate-400" />
                    <div>
                      <div className="font-semibold">{cp.name}</div>
                      <div className="text-sm text-slate-600">
                        {typeLabels[cp.type]}
                        {cp.cpf_cnpj && ` • ${cp.cpf_cnpj}`}
                        {cp.phone && ` • ${cp.phone}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(cp)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(cp.id)}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={() => { setShowForm(false); setEditing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Contraparte' : 'Nova Contraparte'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome do fornecedor ou pessoa"
              />
            </div>
            <div>
              <Label>Tipo *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fornecedor">Fornecedor</SelectItem>
                  <SelectItem value="pessoal">Pessoal</SelectItem>
                  <SelectItem value="cliente">Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>CPF/CNPJ</Label>
              <Input
                value={formData.cpf_cnpj}
                onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
                placeholder="000.000.000-00"
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <Label>Endereço</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Endereço completo"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-[#6B3FA0] hover:bg-[#834CB8]">
                {editing ? 'Atualizar' : 'Salvar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}