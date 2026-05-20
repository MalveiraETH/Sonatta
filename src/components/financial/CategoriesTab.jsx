import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tag, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useTenant } from '@/lib/useTenant';

export default function CategoriesTab() {
  const { tenantId } = useTenant();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', type: 'despesa' });

  useEffect(() => {
    if (tenantId) loadCategories();
  }, [tenantId]);

  const loadCategories = async () => {
    try {
      const data = await base44.entities.ExpenseCategory.filter({ tenant_id: tenantId });
      setCategories(data);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const createDefaultCategories = async () => {
    setLoading(true);
    const defaultExpenses = [
      'Impostos e Taxas', 'Contabilidade', 'Marketing e Publicidade', 'Manutenção e Reparos',
      'Software e Assinaturas', 'Tarifas Bancárias', 'Tarifas Cartão Débito e Crédito',
      'Transporte e Combustível', 'Alimentação e Refeições', 'Seguros', 'Investimentos',
      'Distribuição de Lucros', 'Outras Despesas', 'Aluguel', 'Água e Luz', 'Internet e Telefone',
      'Material de Escritório', 'Material de Limpeza', 'Pessoal - Salários', 'Pessoal - Encargos',
      'Pessoal - Benefícios', 'Pessoal - Pró-labore'
    ];

    const defaultRevenues = ['Produto', 'Serviço'];

    try {
      for (const name of defaultExpenses) {
        await base44.entities.ExpenseCategory.create({ name, type: 'despesa', tenant_id: tenantId });
      }
      for (const name of defaultRevenues) {
        await base44.entities.ExpenseCategory.create({ name, type: 'receita', tenant_id: tenantId });
      }
      toast.success('Categorias criadas!');
      loadCategories();
    } catch (error) {
      console.error('Erro ao criar categorias:', error);
      toast.error('Erro ao criar categorias');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await base44.entities.ExpenseCategory.create({ ...formData, tenant_id: tenantId });
      toast.success('Categoria criada!');
      setShowForm(false);
      setFormData({ name: '', type: 'despesa' });
      loadCategories();
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
      toast.error('Erro ao criar categoria');
    }
  };

  const expenseCategories = categories.filter(c => c.type === 'despesa');
  const revenueCategories = categories.filter(c => c.type === 'receita');

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Categorias de Despesas</CardTitle>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-[#6B3FA0] hover:bg-[#834CB8]"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Categoria
            </Button>
          </CardHeader>
          <CardContent>
            {expenseCategories.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Tag className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p>Nenhuma categoria de despesa cadastrada</p>
                {categories.length === 0 && (
                  <Button
                    onClick={createDefaultCategories}
                    disabled={loading}
                    className="mt-4 bg-[#6B3FA0] hover:bg-[#834CB8]"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Categorias Padrão
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {expenseCategories.map(category => (
                  <div key={category.id} className="flex items-center gap-2 p-3 border rounded-lg">
                    <Tag className="h-4 w-4 text-slate-400" />
                    <span className="text-sm">{category.name}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Categorias de Receitas</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueCategories.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Tag className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p>Nenhuma categoria de receita cadastrada</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {revenueCategories.map(category => (
                  <div key={category.id} className="flex items-center gap-2 p-3 border rounded-lg">
                    <Tag className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm">{category.name}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Categoria</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome da categoria"
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
                  <SelectItem value="despesa">Despesa</SelectItem>
                  <SelectItem value="receita">Receita</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-[#6B3FA0] hover:bg-[#834CB8]">
                Salvar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}