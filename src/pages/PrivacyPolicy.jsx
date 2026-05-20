import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-[#6B3FA0] hover:underline mb-8">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        <h1 className="text-4xl font-bold text-slate-900 mb-2">Política de Privacidade</h1>
        <p className="text-slate-500 mb-8">Última atualização: 20 de maio de 2026</p>

        <div className="prose prose-slate max-w-none">
          <h2>1. Introdução</h2>
          <p>A Sonatta respeita sua privacidade e está comprometida em proteger seus dados pessoais. Esta Política de Privacidade explica como coletamos, usamos e protegemos suas informações.</p>

          <h2>2. Coleta de Dados</h2>
          <p>Coletamos as seguintes informações:</p>
          <ul>
            <li>Dados de conta: nome, email, telefone</li>
            <li>Dados operacionais: clientes, agendamentos, vendas (conforme você insere)</li>
            <li>Dados de uso: logs de acesso, endereço IP, navegador</li>
            <li>Dados de pagamento: processados via Stripe (não armazenamos)</li>
          </ul>

          <h2>3. Uso de Dados</h2>
          <p>Usamos seus dados para:</p>
          <ul>
            <li>Fornecer e melhorar o serviço</li>
            <li>Comunicações de suporte e notificações</li>
            <li>Conformidade legal e segurança</li>
            <li>Análise agregada para melhorias (anonimizado)</li>
          </ul>

          <h2>4. Compartilhamento de Dados</h2>
          <p>Não vendemos seus dados. Compartilhamos apenas com:</p>
          <ul>
            <li>Stripe (processamento de pagamentos)</li>
            <li>Provedores de email para notificações</li>
            <li>Quando legalmente obrigados</li>
          </ul>

          <h2>5. Segurança</h2>
          <p>Implementamos criptografia SSL/TLS, autenticação segura e políticas de acesso rigorosas para proteger seus dados.</p>

          <h2>6. Retenção de Dados</h2>
          <p>Mantemos seus dados enquanto você tem uma conta ativa. Você pode solicitar exclusão a qualquer momento.</p>

          <h2>7. Seus Direitos</h2>
          <p>Você tem direito a:</p>
          <ul>
            <li>Acessar seus dados pessoais</li>
            <li>Corrigir informações inexatas</li>
            <li>Solicitar exclusão</li>
            <li>Exportar seus dados</li>
          </ul>

          <h2>8. Contato</h2>
          <p>Para questões de privacidade, contate <a href="mailto:privacidade@sonatta.com.br">privacidade@sonatta.com.br</a></p>
        </div>
      </div>
    </div>
  );
}