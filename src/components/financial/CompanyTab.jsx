import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CompanyTab() {
  const [companies, setCompanies] = useState([]);
  const [editing, setEditing] = useState(null);
  const [saved, setSaved] = useState(false);
  const [formData, setFormData] = useState({
    name: 'Sonatta - Aparelhos Auditivos Manaus',
    cnpj: '33.457.952/0001-98',
    address: 'Edifício Corporate Trade Center, Rod. Álvaro Maia, 2357 – 10º Andar, Sala 1007, Adrianópolis, Manaus – AM, 69057-035',
    phone: '(92) 99169-2102',
    email: 'contato@sonatta.com.br'
  });

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const data = await base44.entities.Company.list();
      setCompanies(data);
      if (data.length > 0) {
        setEditing(data[0]);
        setFormData(data[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await base44.entities.Company.update(editing.id, formData);
      } else {
        await base44.entities.Company.create(formData);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      loadCompanies();
    } catch (error) {
      console.error('Erro ao salvar empresa:', error);
      toast.error('Erro ao salvar empresa');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Informações da Empresa
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome da Empresa *</Label>
            <Input
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nome da empresa"
            />
          </div>
          <div>
            <Label>CNPJ *</Label>
            <Input
              required
              value={formData.cnpj}
              onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
              placeholder="00.000.000/0000-00"
            />
          </div>
          <div>
            <Label>Endereço</Label>
            <Input
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Endereço completo"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Telefone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contato@empresa.com"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-4">
            {saved && (
              <div className="flex items-center gap-2 text-green-600 animate-in fade-in slide-in-from-left-4 duration-300">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-medium">Atualizado com sucesso!</span>
              </div>
            )}
            <Button type="submit" className="bg-[#6B3FA0] hover:bg-[#834CB8]">
              {editing ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}