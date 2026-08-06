import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tag, Plus, Pencil, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export default function CategoriesTab() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formData, setFormData] = useState({ name: '', type: 'despesa' });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await base44.entities.ExpenseCategory.list();
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
        await base44.entities.ExpenseCategory.create({ name, type: 'despesa' });
      }
      for (const name of defaultRevenues) {
        await base44.entities.ExpenseCategory.create({ name, type: 'receita' });
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
      if (editingCategory) {
        await base44.entities.ExpenseCategory.update(editingCategory.id, formData);
        toast.success('Categoria atualizada!');
      } else {
        await base44.entities.ExpenseCategory.create(formData);
        toast.success('Categoria criada!');
      }
      setShowForm(false);
      setEditingCategory(null);
      setFormData({ name: '', type: 'despesa' });
      loadCategories();
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
      toast.error('Erro ao salvar categoria');
    }
  };

  const openEdit = (category) => {
    setEditingCategory(category);
    setFormData({ name: category.name, type: category.type });
    setShowForm(true);
  };

  const openNew = () => {
    setEditingCategory(null);
    setFormData({ name: '', type: 'despesa' });
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await base44.entities.ExpenseCategory.delete(deleteTarget.id);
      toast.success('Categoria excluída!');
      setDeleteTarget(null);
      loadCategories();
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
      toast.error('Erro ao excluir categoria');
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
              onClick={openNew}
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
                  <div key={category.id} className="flex items-center justify-between gap-2 p-3 border rounded-lg group">
                    <div className="flex items-center gap-2 min-w-0">
                      <Tag className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <span className="text-sm truncate">{category.name}</span>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(category)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => setDeleteTarget(category)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
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
                  <div key={category.id} className="flex items-center justify-between gap-2 p-3 border rounded-lg group">
                    <div className="flex items-center gap-2 min-w-0">
                      <Tag className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                      <span className="text-sm truncate">{category.name}</span>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(category)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => setDeleteTarget(category)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) setEditingCategory(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a categoria <strong>{deleteTarget?.name}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}