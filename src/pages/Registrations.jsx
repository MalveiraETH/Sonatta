import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, CreditCard, Tag, Users, FileText, RotateCw } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import CompanyTab from '@/components/financial/CompanyTab';
import AccountsTab from '@/components/financial/AccountsTab';
import CategoriesTab from '@/components/financial/CategoriesTab';
import CounterpartiesTab from '@/components/financial/CounterpartiesTab';
import RecurringExpensesTab from '@/components/financial/RecurringExpensesTab';

export default function Registrations() {
  const [activeTab, setActiveTab] = useState('empresas');

  return (
    <div>
      <PageHeader
        title="Cadastros"
        description="Gerencie empresas, contas, categorias, contrapartes e despesas recorrentes"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
          <TabsTrigger value="empresas" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Empresas</span>
          </TabsTrigger>
          <TabsTrigger value="contas" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Contas</span>
          </TabsTrigger>
          <TabsTrigger value="categorias" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            <span className="hidden sm:inline">Categorias</span>
          </TabsTrigger>
          <TabsTrigger value="contrapartes" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Contrapartes</span>
          </TabsTrigger>
          <TabsTrigger value="recorrentes" className="flex items-center gap-2">
            <RotateCw className="h-4 w-4" />
            <span className="hidden sm:inline">Recorrentes</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="empresas">
          <CompanyTab />
        </TabsContent>

        <TabsContent value="contas">
          <AccountsTab />
        </TabsContent>

        <TabsContent value="categorias">
          <CategoriesTab />
        </TabsContent>

        <TabsContent value="contrapartes">
          <CounterpartiesTab />
        </TabsContent>

        <TabsContent value="recorrentes">
          <RecurringExpensesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}