import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, CreditCard, Tag, Users, FileText, RotateCw, Banknote } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import CompanyTab from '../components/financial/CompanyTab';
import AccountsTab from '../components/financial/AccountsTab';
import CategoriesTab from '../components/financial/CategoriesTab';
import CounterpartiesTab from '../components/financial/CounterpartiesTab';
import RecurringExpensesTab from '../components/financial/RecurringExpensesTab';
import PaymentTypesTab from '../components/registrations/PaymentTypesTab';

export default function Registrations() {
  const [activeTab, setActiveTab] = useState('empresas');

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Cadastros</h1>
        <p className="text-sm text-slate-600">Gerencie empresas, contas, categorias, contrapartes e despesas recorrentes</p>
      </div>

      {/* Tabs com melhor UX mobile */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full bg-slate-100 p-1 rounded-xl gap-1">
            <TabsTrigger 
              value="empresas" 
              className="flex-1 min-w-[90px] h-11 flex flex-col items-center justify-center gap-1 data-[state=active]:bg-[#6B3FA0] data-[state=active]:text-white rounded-lg transition-all"
            >
              <Building2 className="h-5 w-5" />
              <span className="text-xs font-medium">Empresas</span>
            </TabsTrigger>
            <TabsTrigger 
              value="contas" 
              className="flex-1 min-w-[90px] h-11 flex flex-col items-center justify-center gap-1 data-[state=active]:bg-[#6B3FA0] data-[state=active]:text-white rounded-lg transition-all"
            >
              <CreditCard className="h-5 w-5" />
              <span className="text-xs font-medium">Contas</span>
            </TabsTrigger>
            <TabsTrigger 
              value="categorias" 
              className="flex-1 min-w-[90px] h-11 flex flex-col items-center justify-center gap-1 data-[state=active]:bg-[#6B3FA0] data-[state=active]:text-white rounded-lg transition-all"
            >
              <Tag className="h-5 w-5" />
              <span className="text-xs font-medium">Categorias</span>
            </TabsTrigger>
            <TabsTrigger 
              value="contrapartes" 
              className="flex-1 min-w-[90px] h-11 flex flex-col items-center justify-center gap-1 data-[state=active]:bg-[#6B3FA0] data-[state=active]:text-white rounded-lg transition-all"
            >
              <Users className="h-5 w-5" />
              <span className="text-xs font-medium">Contrapartes</span>
            </TabsTrigger>
            <TabsTrigger 
              value="recorrentes" 
              className="flex-1 min-w-[90px] h-11 flex flex-col items-center justify-center gap-1 data-[state=active]:bg-[#6B3FA0] data-[state=active]:text-white rounded-lg transition-all"
            >
              <RotateCw className="h-5 w-5" />
              <span className="text-xs font-medium">Recorrentes</span>
            </TabsTrigger>
            <TabsTrigger 
              value="pagamentos" 
              className="flex-1 min-w-[90px] h-11 flex flex-col items-center justify-center gap-1 data-[state=active]:bg-[#6B3FA0] data-[state=active]:text-white rounded-lg transition-all"
            >
              <Banknote className="h-5 w-5" />
              <span className="text-xs font-medium">Pagamentos</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="empresas" className="mt-6">
          <CompanyTab />
        </TabsContent>

        <TabsContent value="contas" className="mt-6">
          <AccountsTab />
        </TabsContent>

        <TabsContent value="categorias" className="mt-6">
          <CategoriesTab />
        </TabsContent>

        <TabsContent value="contrapartes" className="mt-6">
          <CounterpartiesTab />
        </TabsContent>

        <TabsContent value="recorrentes" className="mt-6">
          <RecurringExpensesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}