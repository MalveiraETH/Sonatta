import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, DollarSign, Percent } from 'lucide-react';
import { toast } from 'sonner';

export default function Billing() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [billingConfig, setBillingConfig] = useState({
    fixed_cost: 0,
    markup_category_90: 0,
    markup_category_70: 0,
    markup_category_50: 0,
    markup_category_30: 0,
    credit_card_fee: 0,
    tax_percentage: 0,
    referral_percentage: 10
  });

  useEffect(() => {
    loadBillingConfig();
  }, []);

  const loadBillingConfig = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      if (user.billing_config) {
        setBillingConfig(user.billing_config);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({ billing_config: billingConfig });
      toast.success('Configurações de faturamento salvas!');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field, value) => {
    setBillingConfig(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0
    }));
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
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
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-[#6B3FA0]" />
            <CardTitle>Custos e Tarifas</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Coluna Esquerda - Markups e Custo Fixo */}
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-[#6B3FA0]/10 to-[#834CB8]/5 rounded-lg p-4 border-2 border-[#6B3FA0]/20">
                <h3 className="font-semibold text-[#6B3FA0] mb-4 flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  Margens de Lucro (Markups)
                </h3>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="markup_category_90" className="text-[#6B3FA0] font-medium">
                      Markup Categoria 90 (%)
                    </Label>
                    <Input
                      id="markup_category_90"
                      type="number"
                      step="0.01"
                      min="0"
                      max="1000"
                      value={billingConfig.markup_category_90}
                      onChange={(e) => updateField('markup_category_90', e.target.value)}
                      placeholder="0.00"
                      className="border-[#6B3FA0]/30 focus:border-[#6B3FA0]"
                    />
                    <p className="text-xs text-slate-500">Margem de lucro para categoria 90</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="markup_category_70" className="text-[#6B3FA0] font-medium">
                      Markup Categoria 70 (%)
                    </Label>
                    <Input
                      id="markup_category_70"
                      type="number"
                      step="0.01"
                      min="0"
                      max="1000"
                      value={billingConfig.markup_category_70}
                      onChange={(e) => updateField('markup_category_70', e.target.value)}
                      placeholder="0.00"
                      className="border-[#6B3FA0]/30 focus:border-[#6B3FA0]"
                    />
                    <p className="text-xs text-slate-500">Margem de lucro para categoria 70</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="markup_category_50" className="text-[#6B3FA0] font-medium">
                      Markup Categoria 50 (%)
                    </Label>
                    <Input
                      id="markup_category_50"
                      type="number"
                      step="0.01"
                      min="0"
                      max="1000"
                      value={billingConfig.markup_category_50}
                      onChange={(e) => updateField('markup_category_50', e.target.value)}
                      placeholder="0.00"
                      className="border-[#6B3FA0]/30 focus:border-[#6B3FA0]"
                    />
                    <p className="text-xs text-slate-500">Margem de lucro para categoria 50</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="markup_category_30" className="text-[#6B3FA0] font-medium">
                      Markup Categoria 30 (%)
                    </Label>
                    <Input
                      id="markup_category_30"
                      type="number"
                      step="0.01"
                      min="0"
                      max="1000"
                      value={billingConfig.markup_category_30}
                      onChange={(e) => updateField('markup_category_30', e.target.value)}
                      placeholder="0.00"
                      className="border-[#6B3FA0]/30 focus:border-[#6B3FA0]"
                    />
                    <p className="text-xs text-slate-500">Margem de lucro para categoria 30</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg p-4 border-2 border-blue-200">
                <h3 className="font-semibold text-blue-700 mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Custo Operacional
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="fixed_cost" className="text-blue-700 font-medium">
                    Custo Fixo (R$)
                  </Label>
                  <Input
                    id="fixed_cost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={billingConfig.fixed_cost}
                    onChange={(e) => updateField('fixed_cost', e.target.value)}
                    placeholder="0.00"
                    className="border-blue-300 focus:border-blue-500"
                  />
                  <p className="text-xs text-slate-500">Custo fixo mensal da operação</p>
                </div>
              </div>
            </div>

            {/* Coluna Direita - Taxas e Impostos */}
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-4 border-2 border-amber-200">
                <h3 className="font-semibold text-amber-700 mb-4 flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  Taxas e Impostos
                </h3>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="credit_card_fee" className="text-amber-700 font-medium">
                      Taxa de Cartão de Crédito (%)
                    </Label>
                    <Input
                      id="credit_card_fee"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={billingConfig.credit_card_fee}
                      onChange={(e) => updateField('credit_card_fee', e.target.value)}
                      placeholder="0.00"
                      className="border-amber-300 focus:border-amber-500"
                    />
                    <p className="text-xs text-slate-500">Taxa cobrada pela operadora de cartão</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tax_percentage" className="text-amber-700 font-medium">
                      Percentual de Imposto (%)
                    </Label>
                    <Input
                      id="tax_percentage"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={billingConfig.tax_percentage}
                      onChange={(e) => updateField('tax_percentage', e.target.value)}
                      placeholder="0.00"
                      className="border-amber-300 focus:border-amber-500"
                    />
                    <p className="text-xs text-slate-500">Impostos sobre a venda</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="referral_percentage" className="text-amber-700 font-medium">
                      Percentual de Indicação (%)
                    </Label>
                    <Input
                      id="referral_percentage"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={billingConfig.referral_percentage}
                      onChange={(e) => updateField('referral_percentage', e.target.value)}
                      placeholder="10.00"
                      className="border-amber-300 focus:border-amber-500"
                    />
                    <p className="text-xs text-slate-500">Comissão paga ao profissional que indicou</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#6B3FA0] hover:bg-[#834CB8]"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar Configurações
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Card */}
      <Card className="border-0 shadow-sm bg-gradient-to-br from-[#6B3FA0]/5 to-[#A4D233]/5">
        <CardHeader>
          <CardTitle className="text-lg">Exemplo de Cálculo - Categoria 90</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center p-3 bg-white rounded-lg">
              <span className="text-slate-600">Custo do Produto:</span>
              <span className="font-semibold">{formatCurrency(1000)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white rounded-lg">
              <span className="text-slate-600">Markup Cat. 90 ({billingConfig.markup_category_90}%):</span>
              <span className="font-semibold text-[#6B3FA0]">
                + {formatCurrency(1000 * (billingConfig.markup_category_90 / 100))}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white rounded-lg">
              <span className="text-slate-600">Taxa Cartão ({billingConfig.credit_card_fee}%):</span>
              <span className="font-semibold text-amber-600">
                + {formatCurrency((1000 * (1 + billingConfig.markup_category_90 / 100)) * (billingConfig.credit_card_fee / 100))}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white rounded-lg">
              <span className="text-slate-600">Imposto ({billingConfig.tax_percentage}%):</span>
              <span className="font-semibold text-red-600">
                + {formatCurrency((1000 * (1 + billingConfig.markup_category_90 / 100)) * (billingConfig.tax_percentage / 100))}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white rounded-lg">
              <span className="text-slate-600">Indicação ({billingConfig.referral_percentage}%):</span>
              <span className="font-semibold text-purple-600">
                + {formatCurrency((1000 * (1 + billingConfig.markup_category_90 / 100)) * (billingConfig.referral_percentage / 100))}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-[#A4D233]/20 rounded-lg border-2 border-[#A4D233]">
              <span className="font-semibold text-slate-800">Preço Final Sugerido:</span>
              <span className="font-bold text-lg text-[#6B3FA0]">
                {formatCurrency(
                  1000 * (1 + billingConfig.markup_category_90 / 100) * 
                  (1 + billingConfig.credit_card_fee / 100) * 
                  (1 + billingConfig.tax_percentage / 100) *
                  (1 + billingConfig.referral_percentage / 100)
                )}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}