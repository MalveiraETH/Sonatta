import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CreditCard, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AccountsTab() {
  const [accounts, setAccounts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'banco',
    company_id: '',
    bank_name: '',
    account_number: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [accts, comps] = await Promise.all([
        base44.entities.FinancialAccount.list(),
        base44.entities.Company.list()
      ]);
      setAccounts(accts);
      setCompanies(comps);
      if (comps.length > 0 && !formData.company_id) {
        setFormData(prev => ({ ...prev, company_id: comps[0].id, company_name: comps[0].name }));
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const company = companies.find(c => c.id === formData.company_id);
      const data = { ...formData, company_name: company?.name };
      
      if (editing) {
        await base44.entities.FinancialAccount.update(editing.id, data);
        toast.success('Conta atualizada!');
      } else {
        await base44.entities.FinancialAccount.create(data);
        toast.success('Conta cadastrada!');
      }
      
      setShowForm(false);
      setEditing(null);
      setFormData({
        name: '',
        type: 'banco',
        company_id: companies[0]?.id || '',
        bank_name: '',
        account_number: ''
      });
      loadData();
    } catch (error) {
      console.error('Erro ao salvar conta:', error);
      toast.error('Erro ao salvar conta');
    }
  };

  const handleEdit = (account) => {
    setEditing(account);
    setFormData(account);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Deseja excluir esta conta?')) return;
    try {
      await base44.entities.FinancialAccount.delete(id);
      toast.success('Conta excluída!');
      loadData();
    } catch (error) {
      console.error('Erro ao excluir conta:', error);
      toast.error('Erro ao excluir conta');
    }
  };

  const typeLabels = {
    banco: 'Banco',
    caixa: 'Caixa',
    adquirente: 'Adquirente',
    cartao_corporativo: 'Cartão Corporativo'
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Contas Financeiras</CardTitle>
          <Button onClick={() => setShowForm(true)} className="bg-[#6B3FA0] hover:bg-[#834CB8]">
            <Plus className="h-4 w-4 mr-2" />
            Nova Conta
          </Button>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <CreditCard className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p>Nenhuma conta cadastrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map(account => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-slate-400" />
                    <div>
                      <div className="font-semibold">{account.name}</div>
                      <div className="text-sm text-slate-600">
                        {account.company_name} • {typeLabels[account.type]}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(account)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(account.id)}>
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
            <DialogTitle>{editing ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nome da Conta *</Label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Banco Itaú"
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
                  <SelectItem value="banco">Banco</SelectItem>
                  <SelectItem value="caixa">Caixa</SelectItem>
                  <SelectItem value="adquirente">Adquirente</SelectItem>
                  <SelectItem value="cartao_corporativo">Cartão Corporativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Empresa *</Label>
              <Select
                value={formData.company_id}
                onValueChange={(value) => setFormData({ ...formData, company_id: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {companies.map(company => (
                    <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nome do Banco</Label>
              <Input
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                placeholder="Ex: Banco Itaú"
              />
            </div>
            <div>
              <Label>Número da Conta</Label>
              <Input
                value={formData.account_number}
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                placeholder="0000-0"
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