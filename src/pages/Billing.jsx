import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useTenant } from '@/lib/useTenant';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const PLANS = {
  basico: { price: 'R$ 99/mês', features: ['Até 5 usuários', '10GB armazenamento', 'Suporte por email', 'Relatórios básicos'] },
  premium: { price: 'R$ 299/mês', features: ['Usuários ilimitados', '100GB armazenamento', 'Suporte prioritário', 'Relatórios avançados', 'Integrações customizadas'] },
  gratuito: { price: 'Grátis', features: ['1 usuário', '1GB armazenamento', 'Funcionalidades básicas'] },
};

export default function Billing() {
  const { tenantId, loading: tenantLoading } = useTenant();
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(null);

  useEffect(() => {
    if (!tenantLoading && tenantId) loadTenant();
  }, [tenantLoading, tenantId]);

  const loadTenant = async () => {
    try {
      const data = await base44.entities.Tenant.filter({ id: tenantId });
      if (data.length > 0) setTenant(data[0]);
    } catch (e) {
      toast.error('Erro ao carregar dados de billing');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (plan) => {
    if (tenant?.plan === plan) {
      toast.info('Você já está neste plano');
      return;
    }

    setCheckoutLoading(plan);
    try {
      const res = await base44.functions.invoke('createStripeCheckout', { plan });
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        toast.error('Erro ao gerar checkout');
      }
    } catch (error) {
      toast.error('Erro ao iniciar checkout');
    } finally {
      setCheckoutLoading(null);
    }
  };

  if (loading || tenantLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#6B3FA0]" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
          <CreditCard className="h-8 w-8 text-[#6B3FA0]" />
          Planos e Faturamento
        </h1>
        <p className="text-slate-600 mt-2">Gerencie sua assinatura e plano</p>
      </div>

      {/* Current Plan */}
      {tenant && (
        <Card className="border-[#6B3FA0] bg-gradient-to-r from-[#6B3FA0]/5 to-[#A4D233]/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Plano Atual</span>
              <Badge className="bg-[#6B3FA0] text-white capitalize">{tenant.plan || 'gratuito'}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-slate-600"><strong>Clínica:</strong> {tenant.name}</p>
            {tenant.stripe_subscription_id && (
              <p className="text-sm text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                Assinatura ativa
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {['gratuito', 'basico', 'premium'].map((planKey) => {
          const plan = PLANS[planKey];
          const isCurrentPlan = tenant?.plan === planKey;
          const isGratuito = planKey === 'gratuito';

          return (
            <Card
              key={planKey}
              className={`flex flex-col transition-all ${
                isCurrentPlan
                  ? 'border-[#6B3FA0] shadow-lg ring-2 ring-[#6B3FA0]/20'
                  : 'hover:shadow-md'
              }`}
            >
              <CardHeader>
                <CardTitle className="capitalize text-xl mb-2">{planKey}</CardTitle>
                <div className="text-2xl font-bold text-[#6B3FA0]">{plan.price}</div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-6">
                <ul className="space-y-2 flex-1">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {isCurrentPlan ? (
                  <Button disabled className="w-full bg-slate-300">
                    Plano Atual
                  </Button>
                ) : isGratuito ? (
                  <Button variant="outline" disabled className="w-full">
                    Plano Padrão
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleCheckout(planKey)}
                    disabled={checkoutLoading === planKey}
                    className="w-full bg-[#6B3FA0] hover:bg-[#5a3388]"
                  >
                    {checkoutLoading === planKey ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Escolher Plano
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Invoice History */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Faturas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-500 text-center py-8">
            Nenhuma fatura disponível no momento
          </p>
        </CardContent>
      </Card>
    </div>
  );
}