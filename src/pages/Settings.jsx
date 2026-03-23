import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageHeader from '@/components/ui/PageHeader';
import WorkingHours from '@/components/settings/WorkingHours';
import AuditLog from '@/components/settings/AuditLog';
import Billing from '@/components/settings/Billing';
import WhatsAppTemplate from '@/components/settings/WhatsAppTemplate';
import WhatsAppSaleTemplate from '@/components/settings/WhatsAppSaleTemplate';
import WhatsAppTestTemplate from '@/components/settings/WhatsAppTestTemplate';
import WhatsAppAppointmentTemplate from '@/components/settings/WhatsAppAppointmentTemplate';
import ContractTemplate from '@/components/settings/ContractTemplate';
import ReferenceProducts from '@/components/settings/ReferenceProducts';
import ClientStatusSync from '@/components/settings/ClientStatusSync';
import QuotePDFSettings from '@/components/settings/QuotePDFSettings';
import { Settings as SettingsIcon } from 'lucide-react';

export default function Settings() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Configure as preferências do sistema"
        actionIcon={SettingsIcon}
      />

      <Tabs defaultValue="hours" className="space-y-6">
        <TabsList className="bg-slate-100 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="hours" className="text-xs sm:text-sm">Horário</TabsTrigger>
          <TabsTrigger value="whatsapp" className="text-xs sm:text-sm">WhatsApp Orçamento</TabsTrigger>
          <TabsTrigger value="whatsapp_sale" className="text-xs sm:text-sm">WhatsApp Venda</TabsTrigger>
          <TabsTrigger value="whatsapp_test" className="text-xs sm:text-sm">WhatsApp Teste</TabsTrigger>
          <TabsTrigger value="whatsapp_appointment" className="text-xs sm:text-sm">WhatsApp Agendamento</TabsTrigger>
          <TabsTrigger value="contract" className="text-xs sm:text-sm">Contrato</TabsTrigger>
          <TabsTrigger value="billing" className="text-xs sm:text-sm">Custos e Tarifas</TabsTrigger>
          <TabsTrigger value="reference_products" className="text-xs sm:text-sm">Produtos Referência</TabsTrigger>
          <TabsTrigger value="status_sync" className="text-xs sm:text-sm">Status Clientes</TabsTrigger>
          <TabsTrigger value="quote_pdf" className="text-xs sm:text-sm">PDF Orçamento</TabsTrigger>
          <TabsTrigger value="audit" className="text-xs sm:text-sm">Auditoria</TabsTrigger>
        </TabsList>

        <TabsContent value="hours">
          <WorkingHours />
        </TabsContent>

        <TabsContent value="whatsapp">
          <WhatsAppTemplate />
        </TabsContent>

        <TabsContent value="whatsapp_sale">
          <WhatsAppSaleTemplate />
        </TabsContent>

        <TabsContent value="whatsapp_test">
          <WhatsAppTestTemplate />
        </TabsContent>

        <TabsContent value="whatsapp_appointment">
          <WhatsAppAppointmentTemplate />
        </TabsContent>

        <TabsContent value="contract">
          <ContractTemplate />
        </TabsContent>

        <TabsContent value="billing">
          <Billing />
        </TabsContent>

        <TabsContent value="reference_products">
          <ReferenceProducts />
        </TabsContent>

        <TabsContent value="status_sync">
          <ClientStatusSync />
        </TabsContent>

        <TabsContent value="quote_pdf">
          <QuotePDFSettings />
        </TabsContent>

        <TabsContent value="audit">
          <AuditLog />
        </TabsContent>
      </Tabs>
    </div>
  );
}