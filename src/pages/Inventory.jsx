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
import ProductForm from '@/components/inventory/ProductForm';
import {
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Plus,
  Minus
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function Inventory() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [movementOpen, setMovementOpen] = useState(false);
  const [movementData, setMovementData] = useState({
    product_id: '',
    type: 'entrada',
    quantity: 1,
    reason: ''
  });
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm, categoryFilter]);

  const loadData = async () => {
    try {
      const [productsData, movementsData, user] = await Promise.all([
        base44.entities.Product.list(),
        base44.entities.StockMovement.list('-created_date', 50),
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

    setFilteredProducts(filtered);
  };

  const handleEdit = (product) => {
    setSelectedProduct(product);
    setFormOpen(true);
  };

  const handleDelete = async (product) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    
    if (currentUser?.user_role !== 'admin') {
      toast.error('Apenas administradores podem excluir registros');
      return;
    }

    try {
      await base44.entities.Product.delete(product.id);
      toast.success('Produto excluído');
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir produto');
    }
  };

  const openMovement = (product, type) => {
    setMovementData({
      product_id: product.id,
      type,
      quantity: 1,
      reason: ''
    });
    setSelectedProduct(product);
    setMovementOpen(true);
  };

  const handleMovement = async () => {
    if (!movementData.quantity || movementData.quantity <= 0) {
      toast.error('Informe uma quantidade válida');
      return;
    }

    try {
      const product = selectedProduct;
      let newQuantity = product.quantity;

      if (movementData.type === 'entrada') {
        newQuantity += movementData.quantity;
      } else {
        if (movementData.quantity > product.quantity) {
          toast.error('Quantidade insuficiente em estoque');
          return;
        }
        newQuantity -= movementData.quantity;
      }

      // Atualizar estoque
      await base44.entities.Product.update(product.id, {
        quantity: newQuantity,
        status: newQuantity <= 0 ? 'esgotado' : 'disponivel'
      });

      // Registrar movimentação
      await base44.entities.StockMovement.create({
        product_id: product.id,
        product_name: product.name,
        type: movementData.type,
        quantity: movementData.quantity,
        reason: movementData.reason || (movementData.type === 'entrada' ? 'Entrada manual' : 'Saída manual')
      });

      toast.success('Movimentação registrada');
      setMovementOpen(false);
      loadData();
    } catch (error) {
      toast.error('Erro ao registrar movimentação');
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
    acessorio: 'Acessório',
    molde: 'Molde',
    bateria: 'Bateria'
  };

  const availableCount = products.filter(p => p.status === 'disponivel').length;
  const soldCount = products.filter(p => p.status === 'vendido').length;
  const reservedCount = products.filter(p => p.status === 'reservado').length;
  const totalValue = products.reduce((sum, p) => sum + ((p.quantity || 0) * (p.cost_price || 0)), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a5f]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estoque"
        description={`${products.length} produtos cadastrados`}
        action={() => {
          setSelectedProduct(null);
          setFormOpen(true);
        }}
        actionLabel="Novo Produto"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 border-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total de Produtos</p>
              <p className="text-xl font-bold">{products.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
              <Package className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Disponíveis</p>
              <p className="text-xl font-bold text-emerald-600">{availableCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Reservados</p>
              <p className="text-xl font-bold text-amber-600">{reservedCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
              <Package className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Vendidos</p>
              <p className="text-xl font-bold text-red-600">{soldCount}</p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">Produtos</TabsTrigger>
          <TabsTrigger value="movements">Movimentações</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-4 space-y-4">
          {/* Filters */}
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
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Table */}
          <Card className="border-0 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Produto / Série</TableHead>
                    <TableHead className="hidden md:table-cell">Categoria</TableHead>
                    <TableHead className="hidden lg:table-cell">Marca/Modelo</TableHead>
                    <TableHead className="hidden md:table-cell text-right">Preço Venda</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((product) => (
                      <TableRow key={product.id} className="hover:bg-slate-50">
                        <TableCell>
                          <div>
                            <p className="font-medium text-slate-800">{product.name}</p>
                            {product.serial_number && (
                              <p className="text-xs text-slate-500">Série: {product.serial_number}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {categoryLabels[product.category]}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {product.brand} {product.model}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-right">
                          {formatCurrency(product.sale_price)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={product.status} />
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

        <TabsContent value="movements" className="mt-4">
          <Card className="border-0 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Produto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-center">Quantidade</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.length > 0 ? (
                    movements.map((movement) => (
                      <TableRow key={movement.id}>
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
                        <TableCell className="text-center font-medium">
                          {movement.type === 'entrada' ? '+' : '-'}{movement.quantity}
                        </TableCell>
                        <TableCell>{movement.reason}</TableCell>
                        <TableCell className="text-slate-500">
                          {new Date(movement.created_date).toLocaleDateString('pt-BR')}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-500">
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

      <ProductForm
        open={formOpen}
        onOpenChange={setFormOpen}
        product={selectedProduct}
        onSuccess={loadData}
      />

      {/* Movement Dialog */}
      <Dialog open={movementOpen} onOpenChange={setMovementOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {movementData.type === 'entrada' ? 'Entrada de Estoque' : 'Saída de Estoque'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <p className="font-medium">{selectedProduct?.name}</p>
              <p className="text-sm text-slate-500">Estoque atual: {selectedProduct?.quantity}</p>
            </div>
            <div className="space-y-2">
              <Label>Quantidade</Label>
              <Input
                type="number"
                min="1"
                value={movementData.quantity}
                onChange={(e) => setMovementData({ ...movementData, quantity: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Input
                value={movementData.reason}
                onChange={(e) => setMovementData({ ...movementData, reason: e.target.value })}
                placeholder="Motivo da movimentação"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setMovementOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleMovement}
                className={movementData.type === 'entrada' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}