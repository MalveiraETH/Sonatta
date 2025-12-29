import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import InventoryDashboard from '@/components/inventory/InventoryDashboard';
import SerializedProductForm from '@/components/inventory/SerializedProductForm';
import NonSerializedProductForm from '@/components/inventory/NonSerializedProductForm';
import StockMovementDialog from '@/components/inventory/StockMovementDialog';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  Plus,
  Minus,
  Package
} from 'lucide-react';
import { toast } from 'sonner';

export default function Inventory() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockTypeFilter, setStockTypeFilter] = useState('all');
  const [serializedFormOpen, setSerializedFormOpen] = useState(false);
  const [nonSerializedFormOpen, setNonSerializedFormOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [movementOpen, setMovementOpen] = useState(false);
  const [movementType, setMovementType] = useState('entrada');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm, categoryFilter, stockTypeFilter]);

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
      console.error('Error loading data:', error);
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

    if (stockTypeFilter !== 'all') {
      filtered = filtered.filter(p => p.stock_type === stockTypeFilter);
    }

    setFilteredProducts(filtered);
  };

  const handleEdit = (product) => {
    setSelectedProduct(product);
    if (product.stock_type === 'serializado') {
      setSerializedFormOpen(true);
    } else {
      setNonSerializedFormOpen(true);
    }
  };

  const handleDelete = async (product) => {
    if (!confirm(`Tem certeza que deseja excluir "${product.name}"?`)) return;
    
    if (currentUser?.user_role !== 'admin') {
      toast.error('Apenas administradores podem excluir produtos');
      return;
    }

    try {
      await base44.entities.Product.delete(product.id);
      toast.success('Produto excluído com sucesso');
      loadData();
    } catch (error) {
      console.error('Error:', error);
      toast.error(`Erro ao excluir: ${error.message || 'Tente novamente'}`);
    }
  };

  const openMovement = (product, type) => {
    if (product.stock_type === 'serializado') {
      toast.error('Produtos serializados não podem ter movimentações manuais de quantidade');
      return;
    }
    setSelectedProduct(product);
    setMovementType(type);
    setMovementOpen(true);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6B3FA0]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestão de Estoque"
        description="Controle completo de produtos serializados e não serializados"
      />

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="serialized">Produtos Únicos (A)</TabsTrigger>
          <TabsTrigger value="non-serialized">Produtos por Quantidade (B)</TabsTrigger>
          <TabsTrigger value="movements">Movimentações</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <InventoryDashboard products={products} sales={[]} />
        </TabsContent>

        <TabsContent value="serialized" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-600">
              Produtos com controle unitário (número de série único)
            </p>
            <Button 
              onClick={() => {
                setSelectedProduct(null);
                setSerializedFormOpen(true);
              }}
              className="bg-[#A4D233] hover:bg-[#B8E047] text-slate-900"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Produto Único
            </Button>
          </div>

          <Card className="p-4 border-0 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar por nome, marca, modelo ou série..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="aparelho_auditivo">Aparelho Auditivo</SelectItem>
                  <SelectItem value="carregador">Carregador</SelectItem>
                  <SelectItem value="umidificador">Umidificador</SelectItem>
                  <SelectItem value="microfone">Microfone</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          <Card className="border-0 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Produto / Série</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Marca/Modelo</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.filter(p => p.stock_type === 'serializado').length > 0 ? (
                    filteredProducts
                      .filter(p => p.stock_type === 'serializado')
                      .map((product) => (
                        <TableRow key={product.id} className="hover:bg-slate-50">
                          <TableCell>
                            <div>
                              <p className="font-medium text-slate-800">{product.name}</p>
                              <p className="text-xs text-slate-500">NS: {product.serial_number}</p>
                            </div>
                          </TableCell>
                          <TableCell>{categoryLabels[product.category]}</TableCell>
                          <TableCell>{product.brand} {product.model}</TableCell>
                          <TableCell className="text-right">{formatCurrency(product.sale_price)}</TableCell>
                          <TableCell><StatusBadge status={product.status} /></TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                               <DropdownMenuItem onClick={() => handleEdit(product)}>
                                 <Edit className="h-4 w-4 mr-2" />
                                 Editar
                               </DropdownMenuItem>
                               <DropdownMenuItem asChild>
                                 <Link to={`${createPageUrl('ProductDetail')}?id=${product.id}`} className="flex items-center">
                                   <Package className="h-4 w-4 mr-2" />
                                   Detalhes
                                 </Link>
                               </DropdownMenuItem>
                               {currentUser?.user_role === 'admin' && (
                                 <DropdownMenuItem
                                   onClick={() => handleDelete(product)}
                                   className="text-red-600"
                                 >
                                   <Trash2 className="h-4 w-4 mr-2" />
                                   Excluir
                                 </DropdownMenuItem>
                               )}
                              </DropdownMenuContent>
                              </DropdownMenu>
                              </TableCell>
                              </TableRow>
                              ))
                              ) : (
                              <TableRow>
                              <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                              Nenhum produto encontrado
                              </TableCell>
                              </TableRow>
                              )}
                              </TableBody>
                              </Table>
                              </div>
                              </Card>
                              </TabsContent>

                              <TabsContent value="non-serialized" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-600">
              Produtos com controle por quantidade
            </p>
            <Button 
              onClick={() => {
                setSelectedProduct(null);
                setNonSerializedFormOpen(true);
              }}
              className="bg-[#A4D233] hover:bg-[#B8E047] text-slate-900"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Produto (Quantidade)
            </Button>
          </div>

          <Card className="p-4 border-0 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar por nome, marca ou modelo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="bateria">Bateria</SelectItem>
                  <SelectItem value="receptor">Receptor</SelectItem>
                  <SelectItem value="gaveta">Gaveta</SelectItem>
                  <SelectItem value="cerustop">Cerustop</SelectItem>
                  <SelectItem value="gancho">Gancho</SelectItem>
                  <SelectItem value="tubo_molde">Tubo de Molde</SelectItem>
                  <SelectItem value="oliva">Oliva</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          <Card className="border-0 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Produto</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Marca/Modelo</TableHead>
                    <TableHead className="text-center">Quantidade</TableHead>
                    <TableHead className="text-right">Preço Unit.</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.filter(p => p.stock_type === 'nao_serializado').length > 0 ? (
                    filteredProducts
                      .filter(p => p.stock_type === 'nao_serializado')
                      .map((product) => (
                        <TableRow key={product.id} className="hover:bg-slate-50">
                          <TableCell>
                            <p className="font-medium text-slate-800">{product.name}</p>
                          </TableCell>
                          <TableCell>{categoryLabels[product.category]}</TableCell>
                          <TableCell>{product.brand} {product.model}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => openMovement(product, 'saida')}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="font-semibold min-w-[40px] text-center">
                                {product.quantity}
                              </span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => openMovement(product, 'entrada')}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(product.sale_price)}</TableCell>
                          <TableCell>
                            {product.quantity <= product.min_stock ? (
                              <StatusBadge status="baixo_estoque" />
                            ) : (
                              <StatusBadge status="disponivel" />
                            )}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(product)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link to={`${createPageUrl('ProductDetail')}?id=${product.id}`} className="flex items-center">
                                    <Package className="h-4 w-4 mr-2" />
                                    Detalhes
                                  </Link>
                                </DropdownMenuItem>
                                {currentUser?.user_role === 'admin' && (
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(product)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Excluir
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        Nenhum produto encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="movements" className="space-y-4">
          <Card className="border-0 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-center">Quantidade</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Usuário</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.length > 0 ? (
                    movements.map((movement) => (
                      <TableRow key={movement.id}>
                        <TableCell className="text-slate-500 text-sm">
                          {new Date(movement.created_date).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell className="font-medium">{movement.product_name}</TableCell>
                        <TableCell>
                          <span className={`flex items-center gap-1 ${
                            movement.type === 'entrada' ? 'text-emerald-600' : 'text-red-600'
                          }`}>
                            {movement.type === 'entrada' ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : (
                              <TrendingDown className="h-4 w-4" />
                            )}
                            {movement.type === 'entrada' ? 'Entrada' : 'Saída'}
                          </span>
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {movement.type === 'entrada' ? '+' : '-'}{movement.quantity}
                        </TableCell>
                        <TableCell className="text-sm">{movement.reason}</TableCell>
                        <TableCell className="text-sm text-slate-500">{movement.created_by}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                        Nenhuma movimentação registrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <SerializedProductForm
        open={serializedFormOpen}
        onOpenChange={setSerializedFormOpen}
        product={selectedProduct}
        onSuccess={loadData}
      />

      <NonSerializedProductForm
        open={nonSerializedFormOpen}
        onOpenChange={setNonSerializedFormOpen}
        product={selectedProduct}
        onSuccess={loadData}
      />

      <StockMovementDialog
        open={movementOpen}
        onOpenChange={setMovementOpen}
        product={selectedProduct}
        type={movementType}
        onSuccess={loadData}
      />
    </div>
  );
}