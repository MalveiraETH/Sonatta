import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, DollarSign, Percent, Calculator, Save, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

export default function Billing() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [billingConfig, setBillingConfig] = useState({
    fixed_cost: 0,
    markup_category_90: 0,
    markup_category_70: 0,
    markup_category_50: 0,
    markup_category_30: 0,
    markup_category_10: 0,
    credit_card_fee: 0,
    tax_percentage: 0,
    referral_percentage: 10
  });
  const [simulatorCategory, setSimulatorCategory] = useState('90');
  const [simulatorCost, setSimulatorCost] = useState(1000);

  useEffect(() => {
    loadBillingConfig();
  }, []);

  useEffect(() => {
    // Subscribe to User entity changes to sync in real-time
    const unsubscribe = base44.entities.User.subscribe((event) => {
      if (event.type === 'update' && event.data.billing_config) {
        setBillingConfig(event.data.billing_config);
        setHasChanges(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loadBillingConfig = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
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
    if (currentUser?.role !== 'admin') {
      toast.error('Apenas administradores podem alterar estas configurações');
      return;
    }
    
    setSaving(true);
    try {
      await base44.auth.updateMe({ billing_config: billingConfig });
      toast.success('Configurações salvas com sucesso!');
      setHasChanges(false);
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field, value) => {
    if (currentUser?.role !== 'admin') {
      toast.error('Apenas administradores podem alterar estas configurações');
      return;
    }
    
    const numValue = parseFloat(value) || 0;
    setBillingConfig(prev => ({
      ...prev,
      [field]: numValue
    }));
    setHasChanges(true);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const calculateSimulation = () => {
    const cost = parseFloat(simulatorCost) || 0;
    const markup = billingConfig[`markup_category_${simulatorCategory}`] || 0;
    const costWithMarkup = cost * (1 + markup / 100);
    
    const cardFee = costWithMarkup * (billingConfig.credit_card_fee / 100);
    const tax = costWithMarkup * (billingConfig.tax_percentage / 100);
    const referral = costWithMarkup * (billingConfig.referral_percentage / 100);
    
    const finalPrice = costWithMarkup + cardFee + tax + referral;
    
    return {
      cost,
      markup: cost * (markup / 100),
      markupPercent: markup,
      cardFee,
      tax,
      referral,
      finalPrice
    };
  };

  const simulation = calculateSimulation();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#6B3FA0]" />
      </div>
    );
  }

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Custos e Tarifas</h2>
          <p className="text-sm text-slate-500 mt-1">
            Configure as margens de lucro, taxas e impostos
            {!isAdmin && <span className="text-red-600 ml-2">(Somente visualização - Apenas administradores podem editar)</span>}
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="hidden lg:flex bg-[#6B3FA0] hover:bg-[#834CB8] text-white"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Configurações
              </>
            )}
          </Button>
        )}
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:grid lg:grid-cols-2 gap-6">
        {/* Seção A - Margens de Lucro */}
        <Card className="border-0 shadow-sm col-span-2">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#6B3FA0]" />
              <CardTitle className="text-lg">Margens de Lucro (Markups por Categoria)</CardTitle>
            </div>
            <p className="text-sm text-slate-500 mt-1">Defina o markup padrão aplicado sobre o custo em cada categoria</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4">
              {['90', '70', '50', '30', '10'].map((cat) => (
                <div key={cat} className="space-y-2">
                  <Label htmlFor={`markup_${cat}`} className="text-sm font-semibold text-slate-700">
                    Categoria {cat}
                  </Label>
                  <div className="relative">
                    <Input
                      id={`markup_${cat}`}
                      type="number"
                      step="0.01"
                      min="0"
                      max="1000"
                      value={billingConfig[`markup_category_${cat}`]}
                      onChange={(e) => updateField(`markup_category_${cat}`, e.target.value)}
                      className="pr-8"
                      disabled={!isAdmin}
                    />
                    <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                  <p className="text-xs text-slate-500">Markup {cat}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Seção B - Taxas e Impostos */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-lg">Taxas e Impostos</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="credit_card_fee" className="text-sm font-medium">
                Taxa de Cartão de Crédito
              </Label>
              <div className="relative">
                <Input
                  id="credit_card_fee"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={billingConfig.credit_card_fee}
                  onChange={(e) => updateField('credit_card_fee', e.target.value)}
                  className="pr-8"
                  disabled={!isAdmin}
                />
                <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
              <p className="text-xs text-slate-500">Taxa cobrada pela operadora</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax_percentage" className="text-sm font-medium">
                Percentual de Imposto
              </Label>
              <div className="relative">
                <Input
                  id="tax_percentage"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={billingConfig.tax_percentage}
                  onChange={(e) => updateField('tax_percentage', e.target.value)}
                  className="pr-8"
                  disabled={!isAdmin}
                />
                <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
              <p className="text-xs text-slate-500">Impostos sobre a venda</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="referral_percentage" className="text-sm font-medium">
                Percentual de Indicação
              </Label>
              <div className="relative">
                <Input
                  id="referral_percentage"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={billingConfig.referral_percentage}
                  onChange={(e) => updateField('referral_percentage', e.target.value)}
                  className="pr-8"
                  disabled={!isAdmin}
                />
                <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
              <p className="text-xs text-slate-500">Comissão ao profissional indicador</p>
            </div>
          </CardContent>
        </Card>

        {/* Seção C - Custo Operacional */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">Custo Operacional</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="fixed_cost" className="text-sm font-medium">
                Custo Fixo Mensal
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">R$</span>
                <Input
                  id="fixed_cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={billingConfig.fixed_cost}
                  onChange={(e) => updateField('fixed_cost', e.target.value)}
                  className="pl-10"
                  disabled={!isAdmin}
                />
              </div>
              <p className="text-xs text-slate-500">Custo fixo mensal da operação</p>
            </div>
          </CardContent>
        </Card>

        {/* Seção D - Simulador */}
        <Card className="border-0 shadow-sm bg-gradient-to-br from-[#6B3FA0]/5 to-[#A4D233]/5 col-span-2">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-[#6B3FA0]" />
              <CardTitle className="text-lg">Simulador de Cálculo</CardTitle>
            </div>
            <p className="text-sm text-slate-500 mt-1">Simule o preço final com base nos custos e taxas configurados</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Categoria do Exemplo</Label>
                <Select value={simulatorCategory} onValueChange={setSimulatorCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="90">Categoria 90</SelectItem>
                    <SelectItem value="70">Categoria 70</SelectItem>
                    <SelectItem value="50">Categoria 50</SelectItem>
                    <SelectItem value="30">Categoria 30</SelectItem>
                    <SelectItem value="10">Categoria 10</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Custo do Produto</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">R$</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={simulatorCost}
                    onChange={(e) => setSimulatorCost(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center py-2 px-3 bg-white rounded-lg">
                <span className="text-sm text-slate-600">Custo do produto</span>
                <span className="text-sm font-medium">{formatCurrency(simulation.cost)}</span>
              </div>
              <div className="flex justify-between items-center py-2 px-3 bg-white rounded-lg">
                <span className="text-sm text-slate-600">Markup ({simulation.markupPercent}%)</span>
                <span className="text-sm font-medium text-[#6B3FA0]">+ {formatCurrency(simulation.markup)}</span>
              </div>
              <div className="flex justify-between items-center py-2 px-3 bg-white rounded-lg">
                <span className="text-sm text-slate-600">Taxa cartão ({billingConfig.credit_card_fee}%)</span>
                <span className="text-sm font-medium text-amber-600">+ {formatCurrency(simulation.cardFee)}</span>
              </div>
              <div className="flex justify-between items-center py-2 px-3 bg-white rounded-lg">
                <span className="text-sm text-slate-600">Imposto ({billingConfig.tax_percentage}%)</span>
                <span className="text-sm font-medium text-red-600">+ {formatCurrency(simulation.tax)}</span>
              </div>
              <div className="flex justify-between items-center py-2 px-3 bg-white rounded-lg">
                <span className="text-sm text-slate-600">Indicação ({billingConfig.referral_percentage}%)</span>
                <span className="text-sm font-medium text-purple-600">+ {formatCurrency(simulation.referral)}</span>
              </div>
              <div className="flex justify-between items-center py-3 px-4 bg-[#A4D233]/20 rounded-lg border-2 border-[#A4D233] mt-3">
                <span className="text-sm font-semibold text-slate-800">Preço Final Sugerido</span>
                <span className="text-lg font-bold text-[#6B3FA0]">{formatCurrency(simulation.finalPrice)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden space-y-4">
        <Accordion type="multiple" defaultValue={["markups", "simulator"]} className="space-y-4">
          {/* Margens de Lucro */}
          <AccordionItem value="markups" className="border-0 shadow-sm rounded-lg bg-white">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#6B3FA0]" />
                <span className="font-semibold">Margens de Lucro</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-3">
                {['90', '70', '50', '30', '10'].map((cat) => (
                  <Card key={cat} className="border border-slate-200">
                    <CardContent className="p-3">
                      <Label className="text-sm font-medium mb-2 block">Categoria {cat}</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          value={billingConfig[`markup_category_${cat}`]}
                          onChange={(e) => updateField(`markup_category_${cat}`, e.target.value)}
                          className="pr-8"
                          disabled={!isAdmin}
                        />
                        <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Taxas e Impostos */}
          <AccordionItem value="taxes" className="border-0 shadow-sm rounded-lg bg-white">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-2">
                <Percent className="h-5 w-5 text-amber-600" />
                <span className="font-semibold">Taxas e Impostos</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 space-y-3">
              <div className="space-y-2">
                <Label className="text-sm">Taxa de Cartão</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    value={billingConfig.credit_card_fee}
                    onChange={(e) => updateField('credit_card_fee', e.target.value)}
                    className="pr-8"
                    disabled={!isAdmin}
                  />
                  <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Imposto</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    value={billingConfig.tax_percentage}
                    onChange={(e) => updateField('tax_percentage', e.target.value)}
                    className="pr-8"
                    disabled={!isAdmin}
                  />
                  <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Indicação</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    value={billingConfig.referral_percentage}
                    onChange={(e) => updateField('referral_percentage', e.target.value)}
                    className="pr-8"
                    disabled={!isAdmin}
                  />
                  <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Custo Operacional */}
          <AccordionItem value="cost" className="border-0 shadow-sm rounded-lg bg-white">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                <span className="font-semibold">Custo Operacional</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-2">
                <Label className="text-sm">Custo Fixo Mensal</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">R$</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={billingConfig.fixed_cost}
                    onChange={(e) => updateField('fixed_cost', e.target.value)}
                    className="pl-10"
                    disabled={!isAdmin}
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Simulador */}
          <AccordionItem value="simulator" className="border-0 shadow-sm rounded-lg bg-gradient-to-br from-[#6B3FA0]/5 to-[#A4D233]/5">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-[#6B3FA0]" />
                <span className="font-semibold">Simulador</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-3 mb-4">
                <div className="space-y-2">
                  <Label className="text-sm">Categoria</Label>
                  <Select value={simulatorCategory} onValueChange={setSimulatorCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="90">Categoria 90</SelectItem>
                      <SelectItem value="70">Categoria 70</SelectItem>
                      <SelectItem value="50">Categoria 50</SelectItem>
                      <SelectItem value="30">Categoria 30</SelectItem>
                      <SelectItem value="10">Categoria 10</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Custo</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">R$</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={simulatorCost}
                      onChange={(e) => setSimulatorCost(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between py-2 px-3 bg-white rounded-lg">
                  <span className="text-xs text-slate-600">Custo</span>
                  <span className="text-xs font-medium">{formatCurrency(simulation.cost)}</span>
                </div>
                <div className="flex justify-between py-2 px-3 bg-white rounded-lg">
                  <span className="text-xs text-slate-600">Markup</span>
                  <span className="text-xs font-medium text-[#6B3FA0]">+ {formatCurrency(simulation.markup)}</span>
                </div>
                <div className="flex justify-between py-2 px-3 bg-white rounded-lg">
                  <span className="text-xs text-slate-600">Taxa</span>
                  <span className="text-xs font-medium text-amber-600">+ {formatCurrency(simulation.cardFee)}</span>
                </div>
                <div className="flex justify-between py-2 px-3 bg-white rounded-lg">
                  <span className="text-xs text-slate-600">Imposto</span>
                  <span className="text-xs font-medium text-red-600">+ {formatCurrency(simulation.tax)}</span>
                </div>
                <div className="flex justify-between py-2 px-3 bg-white rounded-lg">
                  <span className="text-xs text-slate-600">Indicação</span>
                  <span className="text-xs font-medium text-purple-600">+ {formatCurrency(simulation.referral)}</span>
                </div>
                <div className="flex justify-between py-3 px-4 bg-[#A4D233]/20 rounded-lg border-2 border-[#A4D233] mt-2">
                  <span className="text-xs font-semibold">Preço Final</span>
                  <span className="text-base font-bold text-[#6B3FA0]">{formatCurrency(simulation.finalPrice)}</span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Mobile Fixed Save Button */}
      {hasChanges && isAdmin && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg z-50">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-[#6B3FA0] hover:bg-[#834CB8] text-white h-12"
          >
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Salvar Configurações
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}