import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, MessageCircle, Calendar, Clock, CheckCircle, DollarSign, Tag, Phone, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PublicQuote() {
  const { quoteId } = useParams();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadQuote();
  }, [quoteId]);

  const loadQuote = async () => {
    try {
      // Endpoint público da função — não passa pelo gateway autenticado
      const res = await fetch(`/functions/getPublicQuote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId })
      });
      const data = await res.json();
      if (data?.quote) {
        setQuote(data.quote);
      } else if (data?.error) {
        setError(data.error === 'Orçamento não encontrado'
          ? 'Orçamento não encontrado.'
          : 'Não foi possível carregar o orçamento. Verifique o link ou entre em contato.');
      } else {
        setError('Orçamento não encontrado.');
      }
    } catch (e) {
      setError('Não foi possível carregar o orçamento. Verifique o link ou entre em contato.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return '';
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return '';
    return format(d, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  const getStatusInfo = (status) => {
    const map = {
      rascunho: { label: 'Rascunho', color: 'bg-slate-100 text-slate-600' },
      criado: { label: 'Criado', color: 'bg-blue-100 text-blue-700' },
      enviado: { label: 'Enviado', color: 'bg-purple-100 text-purple-700' },
      aprovado: { label: 'Aprovado', color: 'bg-emerald-100 text-emerald-700' },
      recusado: { label: 'Recusado', color: 'bg-red-100 text-red-700' },
      convertido: { label: 'Convertido em Venda', color: 'bg-emerald-100 text-emerald-700' }
    };
    return map[status] || { label: status, color: 'bg-slate-100 text-slate-600' };
  };

  const getWhatsAppLink = () => {
    if (!quote?.client_phone) return null;
    const phone = quote.client_phone.replace(/\D/g, '');
    const publicUrl = window.location.href;
    let productList = '';
    quote.items?.forEach(item => {
      productList += `• ${item.product_name}`;
      if (item.quantity > 1) productList += ` (${item.quantity}x)`;
      productList += ` — ${formatCurrency(item.unit_price)}`;
      if (item.quantity > 1) productList += ` cada`;
      productList += '\n';
    });

    const message = `👋 Olá! Gostaria de falar sobre o orçamento *${quote.quote_number}*.\n\n` +
      `🔗 Veja os detalhes: ${publicUrl}\n\n` +
      `📋 Resumo:\n${productList}\n` +
      `💰 Total: *${formatCurrency(quote.total)}*`;

    return `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#6B3FA0]/30 border-t-[#6B3FA0] rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-0 shadow-sm text-center">
          <CardContent className="pt-6 pb-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <FileText className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-slate-800">Ops!</h2>
            <p className="text-slate-600">{error}</p>
            <div className="pt-2 text-sm text-slate-500">
              <p>Sonatta Soluções Auditivas</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusInfo = getStatusInfo(quote.status);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-[#6B3FA0] text-white">
        <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
          <div className="flex items-center gap-4">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694e93aa7609bf14847de917/6be15c70b_IMG_5204.png"
              alt="Sonatta"
              className="w-16 h-16 object-contain rounded-xl bg-white p-1"
            />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">SONATTA</h1>
              <p className="text-white/70 text-sm">Soluções Auditivas</p>
            </div>
          </div>
          <div className="mt-6">
            <p className="text-white/80 text-sm">Orçamento</p>
            <h2 className="text-3xl sm:text-4xl font-bold mt-1">{quote.quote_number}</h2>
            <span className={`inline-block mt-3 px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Client & Quote Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-[#6B3FA0]">
                <User className="h-4 w-4" />
                <h3 className="font-semibold text-sm">Cliente</h3>
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-lg">{quote.client_name}</p>
                {quote.client_cpf && <p className="text-sm text-slate-500">CPF: {quote.client_cpf}</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-[#6B3FA0]">
                <Calendar className="h-4 w-4" />
                <h3 className="font-semibold text-sm">Detalhes</h3>
              </div>
              <div className="space-y-1 text-sm">
                <p className="text-slate-600">
                  <span className="text-slate-400">Data:</span> {formatDate(quote.created_date)}
                </p>
                {quote.validity_days && (
                  <p className="text-slate-600">
                    <span className="text-slate-400">Validade:</span> {quote.validity_days} dias
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Items Table */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <Tag className="h-5 w-5 text-[#6B3FA0]" />
              Itens do Orçamento
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Produto</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Qtd</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Valor Unit.</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.items?.map((item, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{item.product_name}</td>
                      <td className="px-4 py-3 text-sm text-center text-slate-600">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-600">{formatCurrency(item.unit_price)}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-slate-800">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50/50 border-t">
                    <td colSpan={3} className="px-4 py-3 text-sm text-right text-slate-600">Subtotal</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-slate-800">{formatCurrency(quote.subtotal)}</td>
                  </tr>
                  {quote.discount > 0 && (
                    <tr className="bg-slate-50/50">
                      <td colSpan={3} className="px-4 py-3 text-sm text-right text-emerald-600">Desconto</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-emerald-600">-{formatCurrency(quote.discount)}</td>
                    </tr>
                  )}
                  <tr className="bg-[#6B3FA0]/5">
                    <td colSpan={3} className="px-4 py-4 text-sm text-right font-bold text-[#6B3FA0]">TOTAL</td>
                    <td className="px-4 py-4 text-lg font-bold text-[#6B3FA0] text-right">{formatCurrency(quote.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {quote.notes && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm text-slate-500 uppercase mb-2">Observações</h3>
              <p className="text-slate-700 whitespace-pre-wrap">{quote.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* WhatsApp CTA */}
        {quote.client_phone && (
          <Card className="border-0 shadow-sm bg-emerald-50 border border-emerald-200">
            <CardContent className="p-6 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                <MessageCircle className="h-7 w-7 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-emerald-800">Ficou com dúvidas?</h3>
              <p className="text-emerald-700 text-sm">
                Fale diretamente com nossa equipe pelo WhatsApp e tire todas as suas dúvidas sobre este orçamento.
              </p>
              <a
                href={getWhatsAppLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
              >
                <MessageCircle className="h-5 w-5" />
                Falar no WhatsApp
              </a>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <footer className="text-center pt-8 pb-4">
          <p className="text-sm text-slate-400">
            © {new Date().getFullYear()} Sonatta Soluções Auditivas
          </p>
          <p className="text-xs text-slate-300 mt-1">
            Este orçamento é válido por {quote.validity_days || 30} dias a partir da data de emissão.
          </p>
        </footer>
      </main>
    </div>
  );
}