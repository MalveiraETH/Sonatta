import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StatusBadge from '@/components/ui/StatusBadge';
import {
  ArrowLeft,
  Package,
  Calendar,
  DollarSign,
  FileText,
  Trash2,
  Edit,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useTabs } from '@/lib/TabsContext';
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

export default function ProductDetail() {
  const tabsContext = useTabs();
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState(null);
  const [movements, setMovements] = useState([]);
  const [sales, setSales] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const tabParams = tabsContext?.getTabParams?.('ProductDetail') || {};
    const urlParams = new URLSearchParams(window.location.search);
    const productId = tabParams.id || urlParams.get('id');

    if (!productId) {
      setLoading(false);
      return;
    }

    try {
      const [productData, movementsData, salesData, user] = await Promise.all([
        base44.entities.Product.filter({ id: productId }),
        base44.entities.StockMovement.filter({ product_id: productId }, '-created_date'),
        base44.entities.Sale.list('-created_date'),
        base44.auth.me()
      ]);

      setProduct(productData[0] || null);
      setMovements(movementsData);
      setCurrentUser(user);

      // Filtrar vendas que contêm este produto
      const productSales = salesData.filter(sale => 
        sale.items?.some(item => item.product_id === productId)
      );
      setSales(productSales);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (currentUser?.user_role !== 'admin') {
      toast.error('Apenas administradores podem excluir produtos');
      return;
    }

    try {
      const tab = product.stock_type === 'serializado' ? 'serialized' : 'non-serialized';
      await base44.entities.Product.delete(product.id);
      toast.success('Produto excluído com sucesso');
      window.location.href = createPageUrl('Inventory') + `?tab=${tab}`;
    } catch (error) {
      console.error('Error:', error);
      toast.error(`Erro ao excluir: ${error.message || 'Tente novamente'}`);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const categoryLabels = {
    aparelho_auditivo: 'Aparelho Auditivo',
    carregador: 'Carregador',
    umidificador: 'Umidificador',
    microfone: 'Microfone',
    bateria: 'Bateria',
    receptor: 'Receptor',
    gaveta: 'Gaveta',
    cerustop: 'Cerustop',
    gancho: 'Gancho',
    tubo_molde: 'Tubo de Molde',
    oliva: 'Oliva',
    acessorio: 'Acessório',
    molde: 'Molde'
  };

  const markupLabels = {
    '90': 'Categoria 90%',
    '70': 'Categoria 70%',
    '50': 'Categoria 50%',
    '30': 'Categoria 30%',
    '10': 'Categoria 10%',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6B3FA0]"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Produto não encontrado</p>
        <Link to={createPageUrl('Inventory')}>
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Estoque
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => tabsContext?.closeTab ? tabsContext.closeTab('ProductDetail') : (window.location.href = createPageUrl('Inventory'))}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{product.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={product.status} />
              {product.serial_number && (
                <span className="text-sm text-slate-500">NS: {product.serial_number}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {currentUser?.user_role === 'admin' && (
            <Button 
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Categoria</p>
                <p className="font-medium">{categoryLabels[product.category]}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Marca/Modelo</p>
                <p className="font-medium">{product.brand} {product.model}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Preço de Venda</p>
                <p className="font-medium">{formatCurrency(product.sale_price)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Data de Entrada</p>
                <p className="font-medium">
                  {product.entry_date ? format(new Date(product.entry_date), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Informações Detalhadas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-500">Tipo de Estoque</p>
              <p className="font-medium">{product.stock_type === 'serializado' ? 'Serializado (Único)' : 'Não Serializado (Quantidade)'}</p>
            </div>
            {product.stock_type === 'nao_serializado' && (
              <>
                <div>
                  <p className="text-sm text-slate-500">Quantidade em Estoque</p>
                  <p className="font-medium text-lg">{product.quantity} unidades</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Estoque Mínimo</p>
                  <p className="font-medium">{product.min_stock} unidades</p>
                </div>
              </>
            )}
            <div>
              <p className="text-sm text-slate-500">Custo do Produto (sem impostos)</p>
              <p className="font-medium">{formatCurrency(product.product_cost)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">ICMS (R$)</p>
              <p className="font-medium">{formatCurrency(product.icms)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">IPI (R$)</p>
              <p className="font-medium">{formatCurrency(product.ipi)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Custo Total</p>
              <p className="font-medium">{formatCurrency(product.cost_price)}</p>
            </div>
            {product.markup_category && (
              <div>
                <p className="text-sm text-slate-500">Categoria de Markup</p>
                <p className="font-medium">{markupLabels[product.markup_category] || product.markup_category}</p>
              </div>
            )}
            {product.nota_fiscal_entrada && (
              <div>
                <p className="text-sm text-slate-500">Nota Fiscal de Entrada</p>
                <p className="font-medium">{product.nota_fiscal_entrada}</p>
              </div>
            )}
            {product.warranty_years && (
              <div>
                <p className="text-sm text-slate-500">Garantia</p>
                <p className="font-medium">{product.warranty_years} anos</p>
              </div>
            )}
            {product.power_type && (
              <div>
                <p className="text-sm text-slate-500">Tipo de Funcionamento</p>
                <p className="font-medium">{product.power_type === 'pilha' ? 'Pilha' : 'Bateria Recarregável'}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="movements" className="space-y-4">
        <TabsList>
          <TabsTrigger value="movements">Movimentações</TabsTrigger>
          <TabsTrigger value="sales">Vendas</TabsTrigger>
        </TabsList>

        <TabsContent value="movements">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Histórico de Movimentações</CardTitle>
            </CardHeader>
            <CardContent>
              {movements.length > 0 ? (
                <div className="space-y-3">
                  {movements.map((movement) => (
                    <div
                      key={movement.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          movement.type === 'entrada' ? 'bg-emerald-50' : 'bg-red-50'
                        }`}>
                          {movement.type === 'entrada' ? (
                            <TrendingUp className="h-5 w-5 text-emerald-600" />
                          ) : (
                            <TrendingDown className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {movement.type === 'entrada' ? 'Entrada' : 'Saída'} - {movement.quantity} unidade(s)
                          </p>
                          <p className="text-sm text-slate-500">{movement.reason}</p>
                        </div>
                      </div>
                      <p className="text-sm text-slate-500">
                        {format(new Date(movement.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-500 py-4">Nenhuma movimentação registrada</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Vendas Relacionadas</CardTitle>
            </CardHeader>
            <CardContent>
              {sales.length > 0 ? (
                <div className="space-y-3">
                  {sales.map((sale) => (
                    <div
                      key={sale.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50"
                    >
                      <div>
                        <p className="font-medium">{sale.sale_number}</p>
                        <p className="text-sm text-slate-500">Cliente: {sale.client_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(sale.total)}</p>
                        <p className="text-sm text-slate-500">
                          {format(new Date(sale.created_date), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-500 py-4">Nenhuma venda registrada</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o produto "{product.name}"? Esta ação não pode ser desfeita.
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
    </div>
  );
}