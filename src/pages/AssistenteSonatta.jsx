import React from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, Settings, Link } from 'lucide-react';

const AGENT_NAME = 'assistente_sonatta';

// ── Config Tab ────────────────────────────────────────────────────────────────
function ConfigTab() {
  const whatsappURL = base44.agents.getWhatsAppConnectURL(AGENT_NAME);

  const permissions = [
    { entity: 'Clientes', ops: 'Ler, Editar' },
    { entity: 'Agendamentos', ops: 'Ler, Criar, Editar' },
    { entity: 'Testes', ops: 'Ler, Editar' },
    { entity: 'Produtos / Estoque', ops: 'Ler' },
    { entity: 'Movimentações de Estoque', ops: 'Ler' },
    { entity: 'Orçamentos', ops: 'Ler, Editar' },
    { entity: 'Vendas', ops: 'Ler' },
    { entity: 'Contratos', ops: 'Ler' },
    { entity: 'Parcelas', ops: 'Ler, Editar' },
    { entity: 'Histórico de Serviços', ops: 'Ler, Criar' },
    { entity: 'Profissionais', ops: 'Ler' },
    { entity: 'Despesas', ops: 'Ler' },
    { entity: 'Categorias Financeiras', ops: 'Ler' },
    { entity: 'Produtos de Referência', ops: 'Ler' },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* WhatsApp */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Link className="h-4 w-4 text-green-600" />
            Conectar ao WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            Conecte o Assistente Sonatta ao seu WhatsApp para que a equipe possa consultar dados diretamente pelo aplicativo.
          </p>
          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-slate-700">Como conectar:</p>
            <ol className="text-sm text-slate-600 space-y-1 list-decimal list-inside">
              <li>Clique no botão abaixo para abrir o link de conexão</li>
              <li>Siga as instruções para vincular seu número</li>
              <li>Pronto! O assistente estará disponível no WhatsApp</li>
            </ol>
          </div>
          <a href={whatsappURL} target="_blank" rel="noopener noreferrer">
            <Button className="bg-green-600 hover:bg-green-700 text-white">
              💬 Conectar ao WhatsApp
            </Button>
          </a>
        </CardContent>
      </Card>

      {/* Permissões */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4 text-[#6B3FA0]" />
            Permissões de Acesso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 mb-4">O agente tem acesso às seguintes entidades do sistema:</p>
          <div className="space-y-2">
            {permissions.map(p => (
              <div key={p.entity} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <span className="text-sm font-medium text-slate-700">{p.entity}</span>
                <Badge variant="outline" className="text-xs text-[#6B3FA0] border-[#6B3FA0]/30 bg-[#6B3FA0]/5">
                  {p.ops}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Instruções */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-4 w-4 text-[#6B3FA0]" />
            Sobre o Assistente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <p>O Assistente Sonatta é um agente de IA treinado para ajudar a equipe interna a:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Buscar clientes por nome, CPF ou telefone</li>
            <li>Consultar agendamentos por data ou profissional</li>
            <li>Verificar testes em andamento e aparelhos em teste</li>
            <li>Checar disponibilidade de estoque</li>
            <li>Ver orçamentos pendentes de aprovação</li>
            <li>Consultar parcelas em atraso de clientes</li>
            <li>Verificar despesas financeiras a vencer</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Página Principal ──────────────────────────────────────────────────────────
export default function AssistenteSonatta() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-[#6B3FA0] flex items-center justify-center">
          <Bot className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Assistente Sonatta</h1>
          <p className="text-sm text-slate-500">Agente de IA para consulta interna de dados</p>
        </div>
        <Badge className="ml-auto bg-green-100 text-green-700 border-green-200">Ativo</Badge>
      </div>

      <ConfigTab />
    </div>
  );
}