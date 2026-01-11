import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tag, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function CategoriesTab() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

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
    const defaultCategories = [
      'Impostos e Taxas',
      'Contabilidade',
      'Marketing e Publicidade',
      'Manutenção e Reparos',
      'Software e Assinaturas',
      'Tarifas Bancárias',
      'Tarifas Cartão Débito e Crédito',
      'Transporte e Combustível',
      'Alimentação e Refeições',
      'Seguros',
      'Investimentos',
      'Distribuição de Lucros',
      'Outras Despesas',
      'Aluguel',
      'Água e Luz',
      'Internet e Telefone',
      'Material de Escritório',
      'Material de Limpeza',
      'Pessoal - Salários',
      'Pessoal - Encargos',
      'Pessoal - Benefícios',
      'Pessoal - Pró-labore'
    ];

    try {
      for (const name of defaultCategories) {
        await base44.entities.ExpenseCategory.create({ name });
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Categorias de Despesas</CardTitle>
        {categories.length === 0 && (
          <Button
            onClick={createDefaultCategories}
            disabled={loading}
            className="bg-[#6B3FA0] hover:bg-[#834CB8]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Criar Categorias Padrão
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Tag className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <p>Nenhuma categoria cadastrada</p>
            <p className="text-sm mt-2">Clique em "Criar Categorias Padrão" para começar</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map(category => (
              <div
                key={category.id}
                className="flex items-center gap-2 p-3 border rounded-lg"
              >
                <Tag className="h-4 w-4 text-slate-400" />
                <span className="text-sm">{category.name}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}