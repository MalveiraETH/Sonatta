import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { MessageSquare, Mail, Phone, HelpCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const faqs = [
  {
    category: 'Geral',
    items: [
      { q: 'Como faço para criar uma conta?', a: 'Visite a página de registro e preencha os dados da sua clínica. Você receberá um email de confirmação.' },
      { q: 'Quanto custa o serviço?', a: 'Oferecemos 3 planos: Gratuito (básico), Básico (R$ 299/mês) e Premium (R$ 799/mês).' },
      { q: 'Posso cancelar minha assinatura a qualquer momento?', a: 'Sim, você pode cancelar sua assinatura a qualquer momento sem multa.' },
    ]
  },
  {
    category: 'Clientes',
    items: [
      { q: 'Como cadastrar um novo cliente?', a: 'Vá para a aba "Clientes" e clique em "Novo Cliente". Preencha os dados obrigatórios e salve.' },
      { q: 'Posso importar clientes em lote?', a: 'Sim, na página de Importação você pode fazer upload de um arquivo CSV com os dados.' },
      { q: 'Qual é o limite de clientes?', a: 'Depende do seu plano: Gratuito (50), Básico (500), Premium (ilimitado).' },
    ]
  },
  {
    category: 'Vendas',
    items: [
      { q: 'Como registrar uma venda?', a: 'Crie um orçamento, envie ao cliente, e quando aprovado, converta em venda.' },
      { q: 'Quais métodos de pagamento são aceitos?', a: 'PIX, cartão de crédito, boleto, dinheiro e transferência bancária.' },
      { q: 'Posso parcelar vendas?', a: 'Sim, você pode definir parcelamento em cartão ou PIX parcelado.' },
    ]
  }
];

export default function Support() {
  const [activeTab, setActiveTab] = useState('faq');
  const [formData, setFormData] = useState({
    subject: '',
    category: 'Geral',
    message: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subject || !formData.message) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      await base44.functions.invoke('sendSupportEmail', formData);
      toast.success('Mensagem enviada! Responderemos em breve.');
      setFormData({ subject: '', category: 'Geral', message: '' });
    } catch (error) {
      toast.error('Erro ao enviar mensagem. Tente novamente.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <HelpCircle className="h-12 w-12 text-[#6B3FA0] mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-slate-900 mb-3">Central de Suporte</h1>
          <p className="text-lg text-slate-600">Encontre respostas ou envie uma mensagem</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('faq')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'faq'
                ? 'border-b-2 border-[#6B3FA0] text-[#6B3FA0]'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            FAQ
          </button>
          <button
            onClick={() => setActiveTab('contact')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'contact'
                ? 'border-b-2 border-[#6B3FA0] text-[#6B3FA0]'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Entre em Contato
          </button>
        </div>

        {/* FAQ Tab */}
        {activeTab === 'faq' && (
          <div className="space-y-8">
            {faqs.map((section) => (
              <div key={section.category}>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">{section.category}</h2>
                <div className="space-y-4">
                  {section.items.map((item, idx) => (
                    <Card key={idx} className="p-6 hover:shadow-md transition-shadow">
                      <h3 className="font-semibold text-slate-900 mb-2 flex items-start gap-3">
                        <MessageSquare className="h-5 w-5 text-[#A4D233] flex-shrink-0 mt-0.5" />
                        {item.q}
                      </h3>
                      <p className="text-slate-600 ml-8">{item.a}</p>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Contact Tab */}
        {activeTab === 'contact' && (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Contact Form */}
            <Card className="p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Envie sua mensagem</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Geral">Geral</SelectItem>
                      <SelectItem value="Suporte Técnico">Suporte Técnico</SelectItem>
                      <SelectItem value="Faturação">Faturação</SelectItem>
                      <SelectItem value="Feedback">Feedback</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Assunto *</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Qual é sua dúvida?"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Mensagem *</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Descreva sua dúvida ou problema em detalhes..."
                    rows={6}
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full bg-[#6B3FA0] hover:bg-[#5a2d7f]">
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Enviar Mensagem
                </Button>
              </form>
            </Card>

            {/* Contact Info */}
            <div className="space-y-6">
              <Card className="p-6 bg-[#6B3FA0]/5 border-[#6B3FA0]/20">
                <div className="flex items-start gap-4">
                  <Mail className="h-6 w-6 text-[#6B3FA0] flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">Email</h3>
                    <a href="mailto:suporte@sonatta.com.br" className="text-[#6B3FA0] hover:underline">
                      suporte@sonatta.com.br
                    </a>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-[#A4D233]/10 border-[#A4D233]/30">
                <div className="flex items-start gap-4">
                  <Phone className="h-6 w-6 text-[#A4D233] flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">WhatsApp</h3>
                    <a href="https://wa.me/5592991692102" target="_blank" rel="noopener noreferrer" className="text-[#A4D233] hover:underline">
                      (92) 9 9169-2102
                    </a>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-slate-50">
                <h3 className="font-semibold text-slate-900 mb-3">Tempo de resposta</h3>
                <p className="text-slate-600 text-sm">
                  Respondemos a todos os emails dentro de 24 horas durante dias úteis. Para urgências, use o WhatsApp.
                </p>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}