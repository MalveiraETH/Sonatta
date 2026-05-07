import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AccountsReceivable from './AccountsReceivable';
import AccountsPayable from './AccountsPayable';
import PixReport from './PixReport';

export default function Financeiro() {
  const [activeTab, setActiveTab] = useState('contas_receber');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab) setActiveTab(tab);
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Financeiro</h1>
        <p className="text-sm text-slate-500 mt-1">Gerencie recebíveis, despesas e PIX Parcelado</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full grid grid-cols-3 h-auto">
          <TabsTrigger value="contas_receber">Contas a Receber</TabsTrigger>
          <TabsTrigger value="contas_pagar">Contas a Pagar</TabsTrigger>
          <TabsTrigger value="pix_parcelado">PIX Parcelado</TabsTrigger>
        </TabsList>

        <TabsContent value="contas_receber">
          <AccountsReceivable />
        </TabsContent>

        <TabsContent value="contas_pagar">
          <AccountsPayable />
        </TabsContent>

        <TabsContent value="pix_parcelado">
          <PixReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}