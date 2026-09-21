import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Search, UserPlus, Check, Loader2, User } from 'lucide-react';
import { maskPhone, maskCPF, onlyDigits, isValidCPF } from '@/lib/masks';
import { toast } from 'sonner';

export default function AssociateProductDialog({ open, onOpenChange, product, onAssociated }) {
  const [mode, setMode] = useState('existing');
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Campos novo cliente
  const [newClient, setNewClient] = useState({ full_name: '', phone: '', cpf: '', email: '' });

  useEffect(() => {
    if (open) {
      setMode('existing');
      setSearchTerm('');
      setSelectedClient(null);
      setNewClient({ full_name: '', phone: '', cpf: '', email: '' });
      loadClients('');
    }
  }, [open]);

  const loadClients = async (term) => {
    setLoadingClients(true);
    try {
      const all = await base44.entities.Client.list('full_name', 500);
      const t = (term || '').toLowerCase().trim();
      const filtered = t
        ? all.filter(c =>
            (c.full_name || '').toLowerCase().includes(t) ||
            (c.cpf || '').includes(t) ||
            (c.phone || '').includes(t)
          )
        : all;
      setClients(filtered.slice(0, 50));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingClients(false);
    }
  };

  const handleSearchChange = (val) => {
    setSearchTerm(val);
    loadClients(val);
  };

  const handleAssociate = async () => {
    if (mode === 'existing') {
      if (!selectedClient) {
        toast.error('Selecione um cliente');
        return;
      }
      setSubmitting(true);
      try {
        const res = await base44.functions.invoke('associarProdutoVendido', {
          product_id: product.id,
          client_id: selectedClient.id
        });
        toast.success(`Produto associado a ${res.client_name}`);
        onAssociated?.(res);
        onOpenChange(false);
      } catch (e) {
        toast.error(e.message || 'Erro ao associar produto');
      } finally {
        setSubmitting(false);
      }
    } else {
      // Novo cliente
      if (!newClient.full_name.trim() || !newClient.phone.trim()) {
        toast.error('Nome e telefone são obrigatórios');
        return;
      }
      if (newClient.cpf && !isValidCPF(newClient.cpf)) {
        toast.error('CPF inválido');
        return;
      }
      setSubmitting(true);
      try {
        const res = await base44.functions.invoke('associarProdutoVendido', {
          product_id: product.id,
          new_client_data: {
            full_name: newClient.full_name.trim(),
            phone: newClient.phone,
            cpf: newClient.cpf,
            email: newClient.email.trim()
          }
        });
        toast.success(`Cliente ${res.client_name} criado e produto associado`);
        onAssociated?.(res);
        onOpenChange(false);
      } catch (e) {
        toast.error(e.message || 'Erro ao associar produto');
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-[#6B3FA0]" />
            Associar Produto
          </DialogTitle>
          <DialogDescription>
            Vincule o produto "{product?.name}" (NS: {product?.serial_number || '-'}) a um cliente.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={setMode}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing" className="gap-1.5">
              <Search className="h-4 w-4" /> Cliente Existente
            </TabsTrigger>
            <TabsTrigger value="new" className="gap-1.5">
              <UserPlus className="h-4 w-4" /> Novo Cliente
            </TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="space-y-3 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por nome, CPF ou telefone..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1.5 border rounded-lg p-1.5 bg-slate-50/50">
              {loadingClients ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                </div>
              ) : clients.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-6">Nenhum cliente encontrado</p>
              ) : (
                clients.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedClient(c)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors flex items-center justify-between ${
                      selectedClient?.id === c.id
                        ? 'border-[#6B3FA0] bg-[#6B3FA0]/5'
                        : 'border-transparent hover:bg-white'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{c.full_name}</p>
                      <p className="text-xs text-slate-500">
                        {c.phone && <span>{c.phone}</span>}
                        {c.cpf && <span> · CPF: {c.cpf}</span>}
                      </p>
                    </div>
                    {selectedClient?.id === c.id && (
                      <Check className="h-4 w-4 text-[#6B3FA0] flex-shrink-0 ml-2" />
                    )}
                  </button>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="new" className="space-y-3 mt-4">
            <div>
              <Label htmlFor="np-name">Nome Completo *</Label>
              <Input
                id="np-name"
                value={newClient.full_name}
                onChange={(e) => setNewClient({ ...newClient, full_name: e.target.value })}
                placeholder="Nome do cliente"
              />
            </div>
            <div>
              <Label htmlFor="np-phone">Telefone / WhatsApp *</Label>
              <Input
                id="np-phone"
                value={newClient.phone}
                onChange={(e) => setNewClient({ ...newClient, phone: maskPhone(e.target.value) })}
                placeholder="(00) 00000-0000"
                inputMode="tel"
              />
            </div>
            <div>
              <Label htmlFor="np-cpf">CPF (opcional)</Label>
              <Input
                id="np-cpf"
                value={newClient.cpf}
                onChange={(e) => setNewClient({ ...newClient, cpf: maskCPF(e.target.value) })}
                placeholder="000.000.000-00"
                inputMode="numeric"
              />
            </div>
            <div>
              <Label htmlFor="np-email">E-mail (opcional)</Label>
              <Input
                id="np-email"
                type="email"
                value={newClient.email}
                onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleAssociate}
            disabled={submitting || (mode === 'existing' && !selectedClient)}
            className="bg-[#6B3FA0] hover:bg-[#5a2f8a] text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Associando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" /> Confirmar Associação
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}