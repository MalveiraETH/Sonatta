import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function OnboardingTenant() {
  const [currentUser, setCurrentUser] = useState(null);
  const [step, setStep] = useState(1); // 1: check, 2: create, 3: success
  const [loading, setLoading] = useState(true);

  const [tenantData, setTenantData] = useState({
    name: '',
    cnpj: '',
    phone: '',
    email: '',
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
      
      // Se usuário já tem tenant, nada a fazer
      if (user?.tenant_id) {
        setStep(3); // Skip to success (already has tenant)
      } else {
        setStep(2); // Show form
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = async (e) => {
    e.preventDefault();
    if (!tenantData.name) {
      toast.error('Nome da clínica é obrigatório');
      return;
    }

    setSaving(true);
    try {
      // Create tenant
      const tenant = await base44.entities.Tenant.create({
        name: tenantData.name,
        cnpj: tenantData.cnpj,
        phone: tenantData.phone,
        email: tenantData.email,
        status: 'ativo',
        plan: 'basico',
      });

      // Assign tenant to current user
      await base44.entities.User.update(currentUser.id, { tenant_id: tenant.id });

      // Update local user state
      setCurrentUser({ ...currentUser, tenant_id: tenant.id });
      setStep(3);
      toast.success('Tenant criado com sucesso!');
    } catch (error) {
      toast.error('Erro ao criar tenant');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-[#6B3FA0]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#6B3FA0]/10 to-[#A4D233]/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Building2 className="h-10 w-10 text-[#6B3FA0]" />
          </div>
          <CardTitle className="text-2xl">Bem-vindo!</CardTitle>
          <p className="text-sm text-slate-500 mt-2">Configure sua clínica no Sonatta</p>
        </CardHeader>
        <CardContent>
          {step === 2 ? (
            <form onSubmit={handleCreateTenant} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">Nome da Clínica *</Label>
                <Input
                  placeholder="Ex: Sonatta Manaus"
                  value={tenantData.name}
                  onChange={(e) => setTenantData({ ...tenantData, name: e.target.value })}
                  required
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">CNPJ</Label>
                <Input
                  placeholder="00.000.000/0000-00"
                  value={tenantData.cnpj}
                  onChange={(e) => setTenantData({ ...tenantData, cnpj: e.target.value })}
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Telefone</Label>
                <Input
                  placeholder="(92) 99999-9999"
                  value={tenantData.phone}
                  onChange={(e) => setTenantData({ ...tenantData, phone: e.target.value })}
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">E-mail</Label>
                <Input
                  type="email"
                  placeholder="contato@clinica.com"
                  value={tenantData.email}
                  onChange={(e) => setTenantData({ ...tenantData, email: e.target.value })}
                  disabled={saving}
                />
              </div>

              <Button
                type="submit"
                disabled={saving}
                className="w-full bg-[#6B3FA0] hover:bg-[#5a3388] mt-6"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Criando...
                  </>
                ) : (
                  'Criar Clínica'
                )}
              </Button>
            </form>
          ) : (
            <div className="text-center space-y-4 py-6">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <h2 className="text-lg font-semibold">Tudo Pronto!</h2>
              <p className="text-sm text-slate-600">
                Sua clínica <strong>{currentUser?.tenant_id ? 'foi' : 'está sendo'}</strong> configurada no sistema.
              </p>
              <Button
                onClick={() => window.location.href = '/Dashboard'}
                className="w-full bg-[#6B3FA0] hover:bg-[#5a3388] mt-6"
              >
                Ir para Dashboard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}