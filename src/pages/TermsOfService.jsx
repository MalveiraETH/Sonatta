import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-[#6B3FA0] hover:underline mb-8">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        <h1 className="text-4xl font-bold text-slate-900 mb-2">Termos de Serviço</h1>
        <p className="text-slate-500 mb-8">Última atualização: 20 de maio de 2026</p>

        <div className="prose prose-slate max-w-none">
          <h2>1. Aceitação dos Termos</h2>
          <p>Ao acessar e usar a plataforma Sonatta, você concorda em estar vinculado por estes Termos de Serviço. Se você não concorda com qualquer parte destes termos, não use o serviço.</p>

          <h2>2. Descrição do Serviço</h2>
          <p>Sonatta é uma plataforma SaaS de gestão para clínicas auditivas, fornecendo ferramentas para gerenciar clientes, agendamentos, vendas, estoque e processos financeiros.</p>

          <h2>3. Responsabilidades do Usuário</h2>
          <ul>
            <li>Manter a confidencialidade de suas credenciais de login</li>
            <li>Usar o serviço apenas para fins legais e conforme permitido por estes termos</li>
            <li>Não tentar contornar ou romper medidas de segurança</li>
            <li>Não transmitir conteúdo malicioso ou prejudicial</li>
          </ul>

          <h2>4. Planos e Preços</h2>
          <p>Os preços estão sujeitos a mudanças com aviso prévio de 30 dias. A continuação do uso após alterações de preço constitui aceitação dos novos termos.</p>

          <h2>5. Cancelamento</h2>
          <p>Você pode cancelar sua assinatura a qualquer momento. Não serão oferecidos reembolsos por períodos parcialmente utilizados.</p>

          <h2>6. Limitação de Responsabilidade</h2>
          <p>A Sonatta não se responsabiliza por perdas indiretas, incidentais ou consequentes relacionadas ao uso ou incapacidade de usar o serviço.</p>

          <h2>7. Alterações aos Termos</h2>
          <p>Reservamos o direito de modificar estes termos. As alterações entram em vigor imediatamente após a publicação.</p>

          <h2>8. Contato</h2>
          <p>Para dúvidas sobre estes Termos, entre em contato em <a href="mailto:suporte@sonatta.com.br">suporte@sonatta.com.br</a></p>
        </div>
      </div>
    </div>
  );
}