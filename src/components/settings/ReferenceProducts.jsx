import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, Plus, Pencil, Trash2, Package, Download } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export default function ReferenceProducts() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [billingConfig, setBillingConfig] = useState(null);
  const [formData, setFormData] = useState({
    reference: '',
    name: '',
    category: '',
    cost: '',
    include_fixed_cost: true
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Subscribe to AppSettings changes to sync billing config in real-time
    const unsubscribe = base44.entities.AppSettings.subscribe((event) => {
      if (event.data?.setting_key === 'billing_config' && event.data?.setting_value) {
        setBillingConfig(event.data.setting_value);
      }
    });

    return () => unsubscribe();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsData, settingsData] = await Promise.all([
        base44.entities.ReferenceProduct.list('-created_date'),
        base44.entities.AppSettings.filter({ setting_key: 'billing_config' })
      ]);
      setProducts(productsData);
      
      // Buscar configurações globais
      if (settingsData.length > 0 && settingsData[0].setting_value) {
        setBillingConfig(settingsData[0].setting_value);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        cost: parseFloat(formData.cost) || 0
      };

      if (editingProduct) {
        await base44.entities.ReferenceProduct.update(editingProduct.id, data);
        toast.success('Produto atualizado com sucesso!');
      } else {
        await base44.entities.ReferenceProduct.create(data);
        toast.success('Produto cadastrado com sucesso!');
      }
      
      setIsFormOpen(false);
      setFormData({ reference: '', name: '', category: '', cost: '', include_fixed_cost: true });
      setEditingProduct(null);
      loadData();
    } catch (error) {
      toast.error('Erro ao salvar produto');
      console.error(error);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      reference: product.reference,
      name: product.name,
      category: product.category,
      cost: product.cost.toString(),
      include_fixed_cost: product.include_fixed_cost !== false
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Deseja realmente excluir este produto?')) return;
    try {
      await base44.entities.ReferenceProduct.delete(id);
      toast.success('Produto excluído com sucesso!');
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir produto');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const calculateTotalCost = (cost, includeFixedCost = true) => {
    if (!billingConfig || !includeFixedCost) return cost;
    const fixedCost = billingConfig.fixed_cost || 0;
    return cost + fixedCost;
  };

  const calculateFinalPrice = (cost, category, includeFixedCost = true) => {
    if (!billingConfig) return cost;

    const totalCost = calculateTotalCost(cost, includeFixedCost);
    const markup = billingConfig[`markup_category_${category}`] || 0;
    const markupValue = totalCost * (markup / 100);
    const finalPrice = totalCost + markupValue;
    
    return finalPrice;
  };

  const calculateDiscounts = (cost, category, includeFixedCost = true) => {
    if (!billingConfig) return 0;

    const finalPrice = calculateFinalPrice(cost, category, includeFixedCost);
    const creditCardFee = billingConfig.credit_card_fee || 0;
    const tax = billingConfig.tax_percentage || 0;
    const referral = billingConfig.referral_percentage || 0;

    const discounts = finalPrice * (creditCardFee / 100 + tax / 100 + referral / 100);
    
    return discounts;
  };

  const calculateNetRevenue = (cost, category, includeFixedCost = true) => {
    if (!billingConfig) return 0;

    const finalPrice = calculateFinalPrice(cost, category, includeFixedCost);
    const totalCost = calculateTotalCost(cost, includeFixedCost);
    const discounts = calculateDiscounts(cost, category, includeFixedCost);
    const netRevenue = finalPrice - (totalCost + discounts);
    
    return netRevenue;
  };

  const getCategoryLabel = (category) => {
    const labels = {
      '90': 'Categoria 90',
      '70': 'Categoria 70',
      '50': 'Categoria 50',
      '30': 'Categoria 30',
      '10': 'Categoria 10',
      '5': 'Categoria 5'
    };
    return labels[category] || category;
  };

  const getCategoryColor = (category) => {
    const colors = {
      '90': 'bg-purple-100 text-purple-800',
      '70': 'bg-blue-100 text-blue-800',
      '50': 'bg-emerald-100 text-emerald-800',
      '30': 'bg-amber-100 text-amber-800',
      '10': 'bg-slate-100 text-slate-700',
      '5': 'bg-rose-100 text-rose-700',
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  const CATEGORY_ORDER = { '90': 1, '70': 2, '50': 3, '30': 4, '10': 5, '5': 6 };
  const sortedProducts = [...products].sort((a, b) => {
    const catDiff = (CATEGORY_ORDER[a.category] || 99) - (CATEGORY_ORDER[b.category] || 99);
    if (catDiff !== 0) return catDiff;
    const aFinal = calculateFinalPrice(a.cost, a.category, a.include_fixed_cost !== false);
    const bFinal = calculateFinalPrice(b.cost, b.category, b.include_fixed_cost !== false);
    return bFinal - aFinal;
  });

  const exportToExcel = () => {
    try {
      const exportData = products.map(product => ({
        'Referência': product.reference,
        'Nome do Aparelho': product.name,
        'Categoria': getCategoryLabel(product.category),
        'Custo Aparelho': product.cost,
        'Incluir Custo Fixo': product.include_fixed_cost !== false ? 'Sim' : 'Não',
        'Custo Total': calculateTotalCost(product.cost, product.include_fixed_cost !== false),
        'Valor Final': calculateFinalPrice(product.cost, product.category, product.include_fixed_cost !== false),
        'Descontos': calculateDiscounts(product.cost, product.category, product.include_fixed_cost !== false),
        'Receita Líquida': calculateNetRevenue(product.cost, product.category, product.include_fixed_cost !== false)
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Produtos Referência');

      const date = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `produtos-referencia-${date}.xlsx`);
      
      toast.success('Relatório exportado com sucesso!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao exportar relatório');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#6B3FA0]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-[#6B3FA0]" />
              <CardTitle>Produtos Referência</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={exportToExcel}
                variant="outline"
                disabled={products.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar Excel
              </Button>
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => {
                      setEditingProduct(null);
                      setFormData({ reference: '', name: '', category: '', cost: '', include_fixed_cost: true });
                    }}
                    className="bg-[#6B3FA0] hover:bg-[#834CB8]"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Produto
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>
                      {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reference">Referência *</Label>
                      <Input
                        id="reference"
                        value={formData.reference}
                        onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                        placeholder="Ex: REF-001"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="name">Nome do Aparelho *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ex: Aparelho Auditivo X"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">Categoria *</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData({ ...formData, category: value })}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="90">Categoria 90</SelectItem>
                          <SelectItem value="70">Categoria 70</SelectItem>
                          <SelectItem value="50">Categoria 50</SelectItem>
                          <SelectItem value="30">Categoria 30</SelectItem>
                          <SelectItem value="10">Categoria 10</SelectItem>
                          <SelectItem value="5">Categoria 5</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cost">Custo do Aparelho (R$) *</Label>
                      <Input
                        id="cost"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.cost}
                        onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                        placeholder="0.00"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="include_fixed_cost">Incluir Custo Fixo Mensal? *</Label>
                      <Select
                        value={formData.include_fixed_cost ? 'sim' : 'nao'}
                        onValueChange={(value) => setFormData({ ...formData, include_fixed_cost: value === 'sim' })}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sim">Sim</SelectItem>
                          <SelectItem value="nao">Não</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsFormOpen(false);
                          setFormData({ reference: '', name: '', category: '', cost: '', include_fixed_cost: true });
                          setEditingProduct(null);
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" className="bg-[#6B3FA0] hover:bg-[#834CB8]">
                        {editingProduct ? 'Atualizar' : 'Cadastrar'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Referência</TableHead>
                  <TableHead>Nome do Aparelho</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-center">Custo Fixo?</TableHead>
                  <TableHead className="text-right">Custo Aparelho</TableHead>
                  <TableHead className="text-right">Custo Total</TableHead>
                  <TableHead className="text-right">Valor Final</TableHead>
                  <TableHead className="text-right">Descontos</TableHead>
                  <TableHead className="text-right">Receita Líquida</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-slate-500 py-8">
                      Nenhum produto cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedProducts.map((product) => {
                    const includeFixedCost = product.include_fixed_cost !== false;
                    return (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.reference}</TableCell>
                        <TableCell>{product.name}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(product.category)}`}>
                            {getCategoryLabel(product.category)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            includeFixedCost 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {includeFixedCost ? 'Sim' : 'Não'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(product.cost)}</TableCell>
                        <TableCell className="text-right text-slate-600">
                          {formatCurrency(calculateTotalCost(product.cost, includeFixedCost))}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-[#A4D233]">
                          {formatCurrency(calculateFinalPrice(product.cost, product.category, includeFixedCost))}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {formatCurrency(calculateDiscounts(product.cost, product.category, includeFixedCost))}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-blue-600">
                          {formatCurrency(calculateNetRevenue(product.cost, product.category, includeFixedCost))}
                        </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(product)}
                            className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(product.id)}
                            className="h-8 w-8 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {!billingConfig && (
        <Card className="border-0 shadow-sm bg-amber-50 border-l-4 border-amber-500">
          <CardContent className="pt-6">
            <p className="text-sm text-amber-800">
              <strong>Atenção:</strong> Configure os custos e tarifas na aba "Custos e Tarifas" para visualizar o valor final calculado dos produtos.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}