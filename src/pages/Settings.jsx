import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageHeader from '@/components/ui/PageHeader';
import WorkingHours from '@/components/settings/WorkingHours';
import AuditLog from '@/components/settings/AuditLog';
import Billing from '@/components/settings/Billing';
import WhatsAppTemplate from '@/components/settings/WhatsAppTemplate';
import ContractTemplate from '@/components/settings/ContractTemplate';
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
        <TabsList className="bg-slate-100">
          <TabsTrigger value="hours">Horário de Atendimento</TabsTrigger>
          <TabsTrigger value="whatsapp">Mensagem WhatsApp</TabsTrigger>
          <TabsTrigger value="contract">Contrato PIX Parcelado</TabsTrigger>
          <TabsTrigger value="billing">Faturamento</TabsTrigger>
          <TabsTrigger value="audit">Auditoria</TabsTrigger>
        </TabsList>

        <TabsContent value="hours">
          <WorkingHours />
        </TabsContent>

        <TabsContent value="whatsapp">
          <WhatsAppTemplate />
        </TabsContent>

        <TabsContent value="contract">
          <ContractTemplate />
        </TabsContent>

        <TabsContent value="billing">
          <Billing />
        </TabsContent>

        <TabsContent value="audit">
          <AuditLog />
        </TabsContent>
      </Tabs>
    </div>
  );
}