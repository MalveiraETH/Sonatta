import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SerializedProductForm from '@/components/inventory/SerializedProductForm';
import NonSerializedProductForm from '@/components/inventory/NonSerializedProductForm';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Eye, 
  Trash2, 
  Plus, 
  X, 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Ear,
  Box,
  ArrowUpCircle,
  ArrowDownCircle,
  Edit3
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatLocalDate } from '@/components/utils/dateHelpers';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip
} from 'recharts';

export default function Inventory() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [filteredMovements, setFilteredMovements] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [serializedFormOpen, setSerializedFormOpen] = useState(false);
  const [nonSerializedFormOpen, setNonSerializedFormOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustmentData, setAdjustmentData] = useState({ type: 'entrada', quantity: '', reason: '', notes: '' });
  const [currentUser, setCurrentUser] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm, categoryFilter, statusFilter]);

  useEffect(() => {
    filterMovements();
  }, [movements, typeFilter]);

  const loadData = async () => {
    try {
      const [productsData, movementsData, user] = await Promise.all([
        base44.entities.Product.list('-created_date'),
        base44.entities.StockMovement.list('-created_date', 100),
        base44.auth.me()
      ]);
      setProducts(productsData);
      setMovements(movementsData);
      setCurrentUser(user);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = [...products];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.name?.toLowerCase().includes(term) ||
        p.brand?.toLowerCase().includes(term) ||
        p.model?.toLowerCase().includes(term) ||
        p.serial_number?.toLowerCase().includes(term)
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    setFilteredProducts(filtered);
  };

  const filterMovements = () => {
    let filtered = [...movements];

    if (typeFilter !== 'all') {
      filtered = filtered.filter(m => m.type === typeFilter);
    }

    setFilteredMovements(filtered);
  };

  const handleEdit = (product) => {
    setSelectedProduct(product);
    if (product.stock_type === 'serializado') {
      setSerializedFormOpen(true);
    } else {
      setNonSerializedFormOpen(true);
    }
  };

  const handleDelete = async () => {
    try {
      await base44.entities.Product.delete(selectedProduct.id);
      toast.success('Produto excluído');
      setDeleteOpen(false);
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir produto');
    }
  };

  const handleAdjustment = async () => {
    if (!adjustmentData.quantity || Number(adjustmentData.quantity) <= 0) {
      toast.error('Informe uma quantidade válida');
      return;
    }

    if (!adjustmentData.reason) {
      toast.error('Informe o motivo');
      return;
    }

    try {
      const quantity = Number(adjustmentData.quantity);
      let newQuantity = selectedProduct.quantity;

      if (adjustmentData.type === 'entrada') {
        newQuantity += quantity;
      } else if (adjustmentData.type === 'saida') {
        newQuantity -= quantity;
        if (newQuantity < 0) {
          toast.error('Quantidade insuficiente em estoque');
          return;
        }
      } else if (adjustmentData.type === 'ajuste') {
        newQuantity = quantity;
      }

      await base44.entities.Product.update(selectedProduct.id, { quantity: newQuantity });

      await base44.entities.StockMovement.create({
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        type: adjustmentData.type,
        quantity: quantity,
        reason: adjustmentData.reason + (adjustmentData.notes ? ` - ${adjustmentData.notes}` : '')
      });

      toast.success('Estoque atualizado');
      setAdjustOpen(false);
      setAdjustmentData({ type: 'entrada', quantity: '', reason: '', notes: '' });
      loadData();
    } catch (error) {
      toast.error('Erro ao ajustar estoque');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const categoryLabels = {
    aparelho_auditivo: 'Aparelho',
    carregador: 'Carregador',
    desumidificador: 'Desumidificador',
    microfone: 'Microfone',
    bateria: 'Bateria',
    receptor: 'Receptor',
    gaveta: 'Gaveta',
    cerustop: 'Cerustop',
    gancho: 'Gancho',
    tubo_molde: 'Tubo Molde',
    oliva: 'Oliva',
    molde: 'Molde',
    outros: 'Outros'
  };

  const serializedProducts = products.filter(p => p.stock_type === 'serializado');
  const nonSerializedProducts = products.filter(p => p.stock_type === 'nao_serializado');

  const stats = {
    serialized: serializedProducts.length,
    nonSerialized: nonSerializedProducts.length,
    lowStock: products.filter(p => 
      (p.stock_type === 'nao_serializado' && p.quantity <= (p.min_stock || 5)) ||
      (p.stock_type === 'serializado' && p.status === 'baixo_estoque')
    ).length,
    totalValue: products.filter(p => p.status === 'disponivel' || p.stock_type === 'nao_serializado').reduce((sum, p) => {
      if (p.stock_type === 'serializado') return sum + (p.cost_price || 0);
      return sum + ((p.quantity || 0) * (p.cost_price || 0));
    }, 0)
  };

  const categoryDistribution = Object.entries(
    products.reduce((acc, p) => {
      const cat = categoryLabels[p.category] || 'Outros';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const COLORS = ['#6B3FA0', '#A4D233', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setStatusFilter('all');
  };

  const FiltersContent = ({ activeTab }) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm">Categoria</Label>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {Object.entries(categoryLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {activeTab === 'serialized' && (
        <div className="space-y-2">
          <Label className="text-sm">Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="disponivel">Disponível</SelectItem>
              <SelectItem value="reservado">Reservado</SelectItem>
              <SelectItem value="vendido">Vendido</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={clearFilters} className="flex-1">
          Limpar
        </Button>
        <Button onClick={() => setFilterOpen(false)} className="flex-1 bg-[#6B3FA0] hover:bg-[#834CB8]">
          Aplicar
        </Button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6B3FA0]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Gestão de Estoque</h1>
        <p className="text-sm text-slate-500 mt-1">Controle completo de produtos e movimentações</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full grid grid-cols-2 sm:grid-cols-4 h-auto">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="serialized">Produto (A)</TabsTrigger>
          <TabsTrigger value="non-serialized">Produto (B)</TabsTrigger>
          <TabsTrigger value="movements">Movim.</TabsTrigger>
        </TabsList>

        {/* DASHBOARD */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-slate-500 mb-1">Estoque A</p>
                  <p className="text-lg sm:text-2xl font-bold text-[#6B3FA0]">{stats.serialized}</p>
                  <p className="text-xs text-slate-500">serializados</p>
                </div>
                <Ear className="h-5 w-5 sm:h-6 sm:w-6 text-[#6B3FA0] opacity-60" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-slate-500 mb-1">Estoque B</p>
                  <p className="text-lg sm:text-2xl font-bold text-blue-600">{stats.nonSerialized}</p>
                  <p className="text-xs text-slate-500">SKUs</p>
                </div>
                <Box className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 opacity-60" />
              </div>
            </Card>

            <Card className="p-4 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-slate-500 mb-1">Alertas</p>
                  <p className="text-lg sm:text-2xl font-bold text-amber-600">{stats.lowStock}</p>
                  <p className="text-xs text-slate-500">baixo estoque</p>
                </div>
                <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500 opacity-60" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-slate-500 mb-1">Valor Estoque</p>
                  <p className="text-base sm:text-xl font-bold text-emerald-600">{formatCurrency(stats.totalValue)}</p>
                </div>
                <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500 opacity-60" />
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Distribuição por Categoria */}
            <Card>
              <div className="p-4 sm:p-6">
                <h3 className="text-lg font-semibold mb-4">Distribuição por Categoria</h3>
                {categoryDistribution.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {categoryDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-center text-slate-500 py-12">Sem dados</p>
                )}
              </div>
            </Card>

            {/* Alertas de Estoque */}
            <Card>
              <div className="p-4 sm:p-6">
                <h3 className="text-lg font-semibold mb-4">Alertas de Estoque</h3>
                <div className="space-y-2">
                  {products
                    .filter(p => 
                      (p.stock_type === 'nao_serializado' && p.quantity <= (p.min_stock || 5)) ||
                      (p.stock_type === 'serializado' && p.status === 'baixo_estoque')
                    )
                    .slice(0, 5)
                    .map(product => (
                      <div key={product.id} className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-100">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{product.name}</p>
                          <p className="text-xs text-slate-600">
                            {product.stock_type === 'serializado' ? product.serial_number : `Qtd: ${product.quantity}`}
                          </p>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">
                          {product.stock_type === 'serializado' ? 'A' : 'B'}
                        </span>
                      </div>
                    ))}
                  {products.filter(p => 
                    (p.stock_type === 'nao_serializado' && p.quantity <= (p.min_stock || 5)) ||
                    (p.stock_type === 'serializado' && p.status === 'baixo_estoque')
                  ).length === 0 && (
                    <p className="text-center text-slate-500 py-8">Nenhum alerta</p>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Tabela de Aparelhos por Modelo */}
          <Card>
            <div className="p-4 sm:p-6">
              <h3 className="text-lg font-semibold mb-4">Aparelhos em Estoque por Modelo</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Modelo</TableHead>
                      <TableHead>Marca</TableHead>
                      <TableHead className="text-center">Quantidade</TableHead>
                      <TableHead className="text-right">Preço Venda</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const hearingAids = products.filter(p => p.category === 'aparelho_auditivo');
                      const modelGroups = hearingAids.reduce((acc, product) => {
                        const key = `${product.brand}-${product.model}`;
                        if (!acc[key]) {
                          acc[key] = {
                            brand: product.brand,
                            model: product.model,
                            quantity: 0,
                            price: product.sale_price || 0
                          };
                        }
                        acc[key].quantity += product.stock_type === 'serializado' ? 1 : (product.quantity || 0);
                        return acc;
                      }, {});

                      const sortedModels = Object.values(modelGroups).sort((a, b) => b.price - a.price);

                      if (sortedModels.length === 0) {
                        return (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                              Nenhum aparelho auditivo em estoque
                            </TableCell>
                          </TableRow>
                        );
                      }

                      return sortedModels.map((model, index) => (
                        <TableRow key={index} className="hover:bg-slate-50">
                          <TableCell className="font-medium">{model.model || '-'}</TableCell>
                          <TableCell>{model.brand || '-'}</TableCell>
                          <TableCell className="text-center font-semibold text-[#6B3FA0]">
                            {model.quantity}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(model.price)}
                          </TableCell>
                        </TableRow>
                      ));
                    })()}
                  </TableBody>
                </Table>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* PRODUTO (A) SERIALIZADO */}
        <TabsContent value="serialized" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <p className="text-sm text-slate-600">Produtos com número de série único</p>
            <Button onClick={() => { setSelectedProduct(null); setSerializedFormOpen(true); }} className="bg-[#6B3FA0] hover:bg-[#834CB8] w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Novo Produto (A)
            </Button>
          </div>

          {/* Filters - Desktop */}
          <Card className="p-4 hidden lg:block">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Label className="text-sm mb-2">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Buscar por produto, NS, marca..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                  {searchTerm && (
                    <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearchTerm('')}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="w-48">
                <Label className="text-sm mb-2">Categoria</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {Object.entries(categoryLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-40">
                <Label className="text-sm mb-2">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="disponivel">Disponível</SelectItem>
                    <SelectItem value="reservado">Reservado</SelectItem>
                    <SelectItem value="vendido">Vendido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button variant="outline" onClick={clearFilters}>Limpar</Button>
            </div>
          </Card>

          {/* Filters - Mobile */}
          <div className="lg:hidden space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
              {searchTerm && (
                <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearchTerm('')}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros
                  {(categoryFilter !== 'all' || statusFilter !== 'all') && (
                    <span className="ml-2 bg-[#6B3FA0] text-white text-xs px-2 py-0.5 rounded-full">Ativos</span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[80vh]">
                <SheetHeader><SheetTitle>Filtros</SheetTitle></SheetHeader>
                <div className="mt-6"><FiltersContent activeTab="serialized" /></div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Table - Desktop */}
          <Card className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Produto</TableHead>
                  <TableHead>NS</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Marca/Modelo</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.filter(p => p.stock_type === 'serializado').length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-slate-500">Nenhum produto encontrado</TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.filter(p => p.stock_type === 'serializado').map(product => (
                    <TableRow key={product.id} className="hover:bg-slate-50">
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-sm text-slate-600">{product.serial_number}</TableCell>
                      <TableCell>{categoryLabels[product.category]}</TableCell>
                      <TableCell className="text-sm">{product.brand} {product.model}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(product.cost_price)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                          product.status === 'disponivel' ? 'bg-emerald-100 text-emerald-700' :
                          product.status === 'reservado' ? 'bg-amber-100 text-amber-700' :
                          product.status === 'vendido' ? 'bg-slate-100 text-slate-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {product.status === 'disponivel' ? 'Disponível' :
                           product.status === 'reservado' ? 'Reservado' :
                           product.status === 'vendido' ? 'Vendido' : 'Baixo'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to={`${createPageUrl('ProductDetail')}?id=${product.id}`} className="flex items-center">
                                <Eye className="h-4 w-4 mr-2" />
                                Ver Detalhes
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(product)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            {currentUser?.role === 'admin' && (
                              <DropdownMenuItem onClick={() => { setSelectedProduct(product); setDeleteOpen(true); }} className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

          {/* Cards - Mobile */}
          <div className="lg:hidden space-y-3">
            {filteredProducts.filter(p => p.stock_type === 'serializado').length === 0 ? (
              <Card className="p-8 text-center text-slate-500">Nenhum produto encontrado</Card>
            ) : (
              filteredProducts.filter(p => p.stock_type === 'serializado').map(product => (
                <Card key={product.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-slate-900">{product.name}</span>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            product.status === 'disponivel' ? 'bg-emerald-100 text-emerald-700' :
                            product.status === 'reservado' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {product.status === 'disponivel' ? 'Disponível' : product.status === 'reservado' ? 'Reservado' : 'Vendido'}
                          </span>
                        </div>
                        <div className="text-sm text-slate-600">
                          NS: {product.serial_number} • {categoryLabels[product.category]}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`${createPageUrl('ProductDetail')}?id=${product.id}`} className="flex items-center">
                              <Eye className="h-4 w-4 mr-2" />
                              Detalhes
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(product)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          {currentUser?.role === 'admin' && (
                            <DropdownMenuItem onClick={() => { setSelectedProduct(product); setDeleteOpen(true); }} className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="text-xl font-bold text-slate-900">{formatCurrency(product.cost_price)}</div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* PRODUTO (B) QUANTIDADE */}
        <TabsContent value="non-serialized" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <p className="text-sm text-slate-600">Produtos com controle por quantidade</p>
            <Button onClick={() => { setSelectedProduct(null); setNonSerializedFormOpen(true); }} className="bg-[#6B3FA0] hover:bg-[#834CB8] w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Novo Produto (B)
            </Button>
          </div>

          {/* Filters - Desktop */}
          <Card className="p-4 hidden lg:block">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Label className="text-sm mb-2">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input placeholder="Buscar por produto..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
                  {searchTerm && (
                    <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearchTerm('')}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="w-48">
                <Label className="text-sm mb-2">Categoria</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {Object.entries(categoryLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button variant="outline" onClick={clearFilters}>Limpar</Button>
            </div>
          </Card>

          {/* Filters - Mobile */}
          <div className="lg:hidden space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
              {searchTerm && (
                <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearchTerm('')}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros
                  {categoryFilter !== 'all' && (
                    <span className="ml-2 bg-[#6B3FA0] text-white text-xs px-2 py-0.5 rounded-full">Ativos</span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[80vh]">
                <SheetHeader><SheetTitle>Filtros</SheetTitle></SheetHeader>
                <div className="mt-6"><FiltersContent activeTab="non-serialized" /></div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Table - Desktop */}
          <Card className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-center">Quantidade</TableHead>
                  <TableHead className="text-center">Mínimo</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.filter(p => p.stock_type === 'nao_serializado').length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-slate-500">Nenhum produto encontrado</TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.filter(p => p.stock_type === 'nao_serializado').map(product => (
                    <TableRow key={product.id} className="hover:bg-slate-50">
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{categoryLabels[product.category]}</TableCell>
                      <TableCell className="text-center font-semibold">{product.quantity || 0}</TableCell>
                      <TableCell className="text-center text-sm text-slate-600">{product.min_stock || 5}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(product.cost_price)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                          product.quantity > (product.min_stock || 5) ? 'bg-emerald-100 text-emerald-700' :
                          product.quantity > 0 ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {product.quantity > (product.min_stock || 5) ? 'OK' : product.quantity > 0 ? 'Baixo' : 'Zerado'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(product)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSelectedProduct(product); setAdjustmentData({ type: 'entrada', quantity: '', reason: '', notes: '' }); setAdjustOpen(true); }}>
                              <Edit3 className="h-4 w-4 mr-2" />
                              Ajustar Quantidade
                            </DropdownMenuItem>
                            {currentUser?.role === 'admin' && (
                              <DropdownMenuItem onClick={() => { setSelectedProduct(product); setDeleteOpen(true); }} className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

          {/* Cards - Mobile */}
          <div className="lg:hidden space-y-3">
            {filteredProducts.filter(p => p.stock_type === 'nao_serializado').length === 0 ? (
              <Card className="p-8 text-center text-slate-500">Nenhum produto encontrado</Card>
            ) : (
              filteredProducts.filter(p => p.stock_type === 'nao_serializado').map(product => (
                <Card key={product.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-slate-900">{product.name}</span>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            product.quantity > (product.min_stock || 5) ? 'bg-emerald-100 text-emerald-700' :
                            product.quantity > 0 ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {product.quantity > (product.min_stock || 5) ? 'OK' : product.quantity > 0 ? 'Baixo' : 'Zero'}
                          </span>
                        </div>
                        <div className="text-sm text-slate-600">
                          {categoryLabels[product.category]} • Qtd: {product.quantity || 0}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(product)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setSelectedProduct(product); setAdjustmentData({ type: 'entrada', quantity: '', reason: '', notes: '' }); setAdjustOpen(true); }}>
                            <Edit3 className="h-4 w-4 mr-2" />
                            Ajustar
                          </DropdownMenuItem>
                          {currentUser?.role === 'admin' && (
                            <DropdownMenuItem onClick={() => { setSelectedProduct(product); setDeleteOpen(true); }} className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="text-xl font-bold text-slate-900">{formatCurrency(product.cost_price)}</div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* MOVIMENTAÇÕES */}
        <TabsContent value="movements" className="space-y-4">
          {/* Filters - Desktop */}
          <Card className="p-4 hidden lg:block">
            <div className="flex items-end gap-3">
              <div className="w-48">
                <Label className="text-sm mb-2">Tipo</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="saida">Saída</SelectItem>
                    <SelectItem value="ajuste">Ajuste</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button variant="outline" onClick={() => setTypeFilter('all')}>Limpar</Button>
            </div>
          </Card>

          {/* Filters - Mobile */}
          <div className="lg:hidden">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="saida">Saída</SelectItem>
                <SelectItem value="ajuste">Ajuste</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table - Desktop */}
          <Card className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-center">Qtd</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Usuário</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-slate-500">Nenhuma movimentação encontrada</TableCell>
                  </TableRow>
                ) : (
                  filteredMovements.map(movement => (
                    <TableRow key={movement.id} className="hover:bg-slate-50">
                      <TableCell>{formatLocalDate(movement.created_date)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          movement.type === 'entrada' ? 'bg-emerald-100 text-emerald-700' :
                          movement.type === 'saida' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {movement.type === 'entrada' ? <TrendingUp className="h-3.5 w-3.5" /> : 
                           movement.type === 'saida' ? <TrendingDown className="h-3.5 w-3.5" /> : <Edit3 className="h-3.5 w-3.5" />}
                          {movement.type === 'entrada' ? 'Entrada' : movement.type === 'saida' ? 'Saída' : 'Ajuste'}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{movement.product_name}</TableCell>
                      <TableCell className="text-center font-semibold">
                        {movement.type === 'entrada' ? '+' : movement.type === 'saida' ? '-' : ''}{movement.quantity}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{movement.reason || '-'}</TableCell>
                      <TableCell className="text-sm text-slate-600">{movement.created_by || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

          {/* Cards - Mobile */}
          <div className="lg:hidden space-y-3">
            {filteredMovements.length === 0 ? (
              <Card className="p-8 text-center text-slate-500">Nenhuma movimentação encontrada</Card>
            ) : (
              filteredMovements.map(movement => (
                <Card key={movement.id} className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        movement.type === 'entrada' ? 'bg-emerald-100 text-emerald-700' :
                        movement.type === 'saida' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {movement.type === 'entrada' ? <TrendingUp className="h-3 w-3" /> : 
                         movement.type === 'saida' ? <TrendingDown className="h-3 w-3" /> : <Edit3 className="h-3 w-3" />}
                        {movement.type === 'entrada' ? 'Entrada' : movement.type === 'saida' ? 'Saída' : 'Ajuste'}
                      </span>
                      <span className="text-sm text-slate-600">{formatLocalDate(movement.created_date)}</span>
                    </div>
                    <div>
                      <p className="font-medium">{movement.product_name}</p>
                      <p className="text-sm text-slate-600">
                        Qtd: {movement.type === 'entrada' ? '+' : movement.type === 'saida' ? '-' : ''}{movement.quantity}
                      </p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Forms */}
      <SerializedProductForm open={serializedFormOpen} onOpenChange={setSerializedFormOpen} product={selectedProduct} onSuccess={loadData} />
      <NonSerializedProductForm open={nonSerializedFormOpen} onOpenChange={setNonSerializedFormOpen} product={selectedProduct} onSuccess={loadData} />

      {/* Adjustment Dialog */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar Quantidade</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo de Movimentação</Label>
              <Select value={adjustmentData.type} onValueChange={(v) => setAdjustmentData({ ...adjustmentData, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                  <SelectItem value="ajuste">Ajuste</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantidade</Label>
              <Input type="number" value={adjustmentData.quantity} onChange={(e) => setAdjustmentData({ ...adjustmentData, quantity: e.target.value })} />
            </div>
            <div>
              <Label>Motivo</Label>
              <Input value={adjustmentData.reason} onChange={(e) => setAdjustmentData({ ...adjustmentData, reason: e.target.value })} placeholder="Ex: Compra, Venda, Perda" />
            </div>
            <div>
              <Label>Observação (opcional)</Label>
              <Input value={adjustmentData.notes} onChange={(e) => setAdjustmentData({ ...adjustmentData, notes: e.target.value })} />
            </div>
            {selectedProduct && (
              <div className="bg-slate-50 p-3 rounded">
                <p className="text-sm text-slate-600">Estoque Atual: <span className="font-bold">{selectedProduct.quantity}</span></p>
                {adjustmentData.type !== 'ajuste' && adjustmentData.quantity && (
                  <p className="text-sm text-slate-600">Novo Estoque: <span className="font-bold">
                    {adjustmentData.type === 'entrada' ? selectedProduct.quantity + Number(adjustmentData.quantity) : selectedProduct.quantity - Number(adjustmentData.quantity)}
                  </span></p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>Cancelar</Button>
            <Button onClick={handleAdjustment} className="bg-[#6B3FA0] hover:bg-[#834CB8]">Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}