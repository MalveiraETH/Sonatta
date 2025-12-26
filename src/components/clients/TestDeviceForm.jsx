import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Loader2, Ear, Battery, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function TestDeviceForm({ open, onOpenChange, client, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    serial_device_1: '',
    serial_device_2: '',
    serial_charger: '',
    observations: ''
  });
  const [foundProducts, setFoundProducts] = useState({
    device_1: null,
    device_2: null,
    charger: null
  });

  useEffect(() => {
    if (open) {
      loadProducts();
      // Reset form
      setFormData({
        serial_device_1: '',
        serial_device_2: '',
        serial_charger: '',
        observations: ''
      });
      setFoundProducts({
        device_1: null,
        device_2: null,
        charger: null
      });
    }
  }, [open]);

  const loadProducts = async () => {
    try {
      const productsData = await base44.entities.Product.list();
      setProducts(productsData);
    } catch (error) {
      console.error(error);
    }
  };

  const findProductBySerial = (serial, key) => {
    if (!serial) {
      setFoundProducts(prev => ({ ...prev, [key]: null }));
      return;
    }

    const product = products.find(p => 
      p.serial_number && p.serial_number.toLowerCase() === serial.toLowerCase()
    );

    setFoundProducts(prev => ({ ...prev, [key]: product || 'not_found' }));
  };

  const handleSerialChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (value.length >= 3) {
      findProductBySerial(value, key === 'serial_device_1' ? 'device_1' : key === 'serial_device_2' ? 'device_2' : 'charger');
    } else {
      setFoundProducts(prev => ({ ...prev, [key === 'serial_device_1' ? 'device_1' : key === 'serial_device_2' ? 'device_2' : 'charger']: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar se pelo menos um aparelho foi informado
    if (!formData.serial_device_1 && !formData.serial_device_2) {
      toast.error('Informe pelo menos um número de série de aparelho');
      return;
    }

    // Validar se os produtos foram encontrados
    if (formData.serial_device_1 && foundProducts.device_1 === 'not_found') {
      toast.error('Aparelho 1 não encontrado no estoque');
      return;
    }
    if (formData.serial_device_2 && foundProducts.device_2 === 'not_found') {
      toast.error('Aparelho 2 não encontrado no estoque');
      return;
    }
    if (formData.serial_charger && foundProducts.charger === 'not_found') {
      toast.error('Carregador não encontrado no estoque');
      return;
    }

    setLoading(true);
    try {
      const testedProducts = [];
      
      if (foundProducts.device_1) {
        testedProducts.push({
          product_name: foundProducts.device_1.name,
          serial_number: foundProducts.device_1.serial_number
        });
      }
      
      if (foundProducts.device_2) {
        testedProducts.push({
          product_name: foundProducts.device_2.name,
          serial_number: foundProducts.device_2.serial_number
        });
      }
      
      if (foundProducts.charger) {
        testedProducts.push({
          product_name: foundProducts.charger.name,
          serial_number: foundProducts.charger.serial_number
        });
      }

      // Criar descrição do teste
      let description = 'Teste de aparelhos auditivos:\n';
      if (foundProducts.device_1) {
        description += `- Aparelho 1: ${foundProducts.device_1.name} (${foundProducts.device_1.serial_number})\n`;
      }
      if (foundProducts.device_2) {
        description += `- Aparelho 2: ${foundProducts.device_2.name} (${foundProducts.device_2.serial_number})\n`;
      }
      if (foundProducts.charger) {
        description += `- Carregador: ${foundProducts.charger.name} (${foundProducts.charger.serial_number})\n`;
      }

      // Criar registro no histórico
      const currentUser = await base44.auth.me();
      await base44.entities.ServiceHistory.create({
        client_id: client.id,
        client_name: client.full_name,
        professional_id: currentUser.id,
        professional_name: currentUser.full_name,
        type: 'teste',
        description: description.trim(),
        products_tested: testedProducts,
        observations: formData.observations,
        next_steps: ''
      });

      toast.success('Teste registrado com sucesso!');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao registrar teste');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const ProductStatus = ({ product, icon: Icon, label }) => {
    if (!product) return null;
    
    if (product === 'not_found') {
      return (
        <Card className="p-3 bg-red-50 border-red-200">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm font-medium">Produto não encontrado no estoque</span>
          </div>
        </Card>
      );
    }

    return (
      <Card className="p-3 bg-emerald-50 border-emerald-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
            <Icon className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <span className="font-semibold text-emerald-900">{product.name}</span>
            </div>
            <p className="text-sm text-emerald-700">{product.brand} {product.model}</p>
            <p className="text-xs text-emerald-600">Série: {product.serial_number}</p>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Ear className="h-6 w-6 text-[#1e3a5f]" />
            Registrar Teste de Aparelho
          </DialogTitle>
        </DialogHeader>

        {client && (
          <div className="bg-slate-50 p-3 rounded-lg mb-4">
            <p className="text-sm text-slate-500">Cliente</p>
            <p className="font-semibold text-slate-800">{client.full_name}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          {/* Aparelho 1 */}
          <div className="space-y-2">
            <Label htmlFor="serial_device_1" className="flex items-center gap-2">
              <Ear className="h-4 w-4" />
              Número de Série - Aparelho 1
            </Label>
            <Input
              id="serial_device_1"
              value={formData.serial_device_1}
              onChange={(e) => handleSerialChange('serial_device_1', e.target.value)}
              placeholder="Digite o número de série do primeiro aparelho"
            />
            <ProductStatus product={foundProducts.device_1} icon={Ear} label="Aparelho 1" />
          </div>

          {/* Aparelho 2 */}
          <div className="space-y-2">
            <Label htmlFor="serial_device_2" className="flex items-center gap-2">
              <Ear className="h-4 w-4" />
              Número de Série - Aparelho 2
            </Label>
            <Input
              id="serial_device_2"
              value={formData.serial_device_2}
              onChange={(e) => handleSerialChange('serial_device_2', e.target.value)}
              placeholder="Digite o número de série do segundo aparelho"
            />
            <ProductStatus product={foundProducts.device_2} icon={Ear} label="Aparelho 2" />
          </div>

          {/* Carregador */}
          <div className="space-y-2">
            <Label htmlFor="serial_charger" className="flex items-center gap-2">
              <Battery className="h-4 w-4" />
              Número de Série - Carregador
            </Label>
            <Input
              id="serial_charger"
              value={formData.serial_charger}
              onChange={(e) => handleSerialChange('serial_charger', e.target.value)}
              placeholder="Digite o número de série do carregador (opcional)"
            />
            <ProductStatus product={foundProducts.charger} icon={Battery} label="Carregador" />
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="observations">Observações do Teste</Label>
            <Textarea
              id="observations"
              value={formData.observations}
              onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
              placeholder="Impressões do teste, adaptação do cliente, próximos passos..."
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Registrar Teste
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}