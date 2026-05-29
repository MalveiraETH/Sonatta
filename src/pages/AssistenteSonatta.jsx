import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, Bot, Loader2, Trash2, MessageSquare, Settings, Link, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const AGENT_NAME = 'assistente_sonatta';

// ── Message Bubble ────────────────────────────────────────────────────────────
function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex gap-3 mb-4', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="h-8 w-8 rounded-full bg-[#6B3FA0] flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bot className="h-4 w-4 text-white" />
        </div>
      )}
      <div className={cn('max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
        isUser
          ? 'bg-[#6B3FA0] text-white rounded-br-sm'
          : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
      )}>
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <ReactMarkdown
            className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
            components={{
              p: ({ children }) => <p className="my-1">{children}</p>,
              ul: ({ children }) => <ul className="my-1 ml-4 list-disc">{children}</ul>,
              ol: ({ children }) => <ol className="my-1 ml-4 list-decimal">{children}</ol>,
              li: ({ children }) => <li className="my-0.5">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold text-[#6B3FA0]">{children}</strong>,
              code: ({ children }) => <code className="bg-slate-100 px-1 rounded text-xs">{children}</code>,
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}
        {message.tool_calls?.length > 0 && message.tool_calls.map((tc, i) => (
          <div key={i} className="mt-2 text-xs text-slate-400 italic">
            🔍 Consultando dados...
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Chat Tab ──────────────────────────────────────────────────────────────────
function ChatTab() {
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => { loadConversations(); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (!activeConv) return;
    const unsub = base44.agents.subscribeToConversation(activeConv.id, (data) => {
      setMessages(data.messages || []);
    });
    return unsub;
  }, [activeConv?.id]);

  const loadConversations = async () => {
    setLoadingConvs(true);
    try {
      const convs = await base44.agents.listConversations({ agent_name: AGENT_NAME });
      setConversations(convs || []);
    } catch (e) {
      console.error(e);
    }
    setLoadingConvs(false);
  };

  const newConversation = async () => {
    const conv = await base44.agents.createConversation({
      agent_name: AGENT_NAME,
      metadata: { name: 'Nova conversa — ' + new Date().toLocaleDateString('pt-BR') }
    });
    setConversations(prev => [conv, ...prev]);
    setActiveConv(conv);
    setMessages([]);
  };

  const openConversation = async (conv) => {
    const full = await base44.agents.getConversation(conv.id);
    setActiveConv(full);
    setMessages(full.messages || []);
  };

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    if (!activeConv) { toast.error('Selecione ou inicie uma conversa'); return; }
    const text = input.trim();
    setInput('');
    setSending(true);
    setMessages(prev => [...prev, { role: 'user', content: text, id: 'tmp_' + Date.now() }]);
    try {
      await base44.agents.addMessage(activeConv, { role: 'user', content: text });
    } catch (e) {
      toast.error('Erro ao enviar mensagem');
    }
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="flex h-[calc(100vh-200px)] gap-4">
      {/* Sidebar de conversas */}
      <div className="w-64 flex flex-col gap-2 flex-shrink-0">
        <Button onClick={newConversation} className="bg-[#6B3FA0] hover:bg-[#5a3490] text-white w-full">
          <MessageSquare className="h-4 w-4 mr-2" /> Nova Conversa
        </Button>
        <div className="flex-1 overflow-y-auto space-y-1">
          {loadingConvs ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
          ) : conversations.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">Nenhuma conversa ainda</p>
          ) : conversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => openConversation(conv)}
              className={cn(
                'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                activeConv?.id === conv.id
                  ? 'bg-[#6B3FA0] text-white'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              )}
            >
              <p className="font-medium truncate">{conv.metadata?.name || 'Conversa'}</p>
              <p className={cn('text-xs truncate', activeConv?.id === conv.id ? 'text-white/70' : 'text-slate-400')}>
                {new Date(conv.created_date).toLocaleDateString('pt-BR')}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Área do chat */}
      <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {!activeConv ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-400">
            <Bot className="h-16 w-16 text-[#6B3FA0]/30" />
            <div className="text-center">
              <p className="font-medium text-slate-600">Assistente Sonatta</p>
              <p className="text-sm">Inicie uma nova conversa ou selecione uma existente</p>
            </div>
            <Button onClick={newConversation} className="bg-[#6B3FA0] hover:bg-[#5a3490] text-white">
              <MessageSquare className="h-4 w-4 mr-2" /> Iniciar Conversa
            </Button>
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-[#6B3FA0]" />
                <span className="font-medium text-slate-700 text-sm">{activeConv.metadata?.name || 'Conversa'}</span>
              </div>
              <Badge variant="outline" className="text-xs text-green-600 border-green-300 bg-green-50">Online</Badge>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {messages.filter(m => m.role !== 'tool' && m.content).map((msg, i) => (
                <MessageBubble key={msg.id || i} message={msg} />
              ))}
              {sending && (
                <div className="flex gap-3 mb-4">
                  <div className="h-8 w-8 rounded-full bg-[#6B3FA0] flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-[#6B3FA0]" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 border-t border-slate-100 bg-white">
              <div className="flex gap-2 items-end">
                <Textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Digite sua pergunta... (Enter para enviar)"
                  className="resize-none min-h-[44px] max-h-32 text-sm"
                  rows={1}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim() || sending}
                  className="bg-[#6B3FA0] hover:bg-[#5a3490] text-white h-11 px-4 flex-shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

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

      <Tabs defaultValue="chat">
        <TabsList className="bg-white border border-slate-200">
          <TabsTrigger value="chat" className="data-[state=active]:bg-[#6B3FA0] data-[state=active]:text-white">
            <MessageSquare className="h-4 w-4 mr-2" /> Chat
          </TabsTrigger>
          <TabsTrigger value="config" className="data-[state=active]:bg-[#6B3FA0] data-[state=active]:text-white">
            <Settings className="h-4 w-4 mr-2" /> Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-4">
          <ChatTab />
        </TabsContent>
        <TabsContent value="config" className="mt-4">
          <ConfigTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}