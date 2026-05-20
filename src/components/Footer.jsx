import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 py-8 mt-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="font-semibold text-white mb-4">Sonatta</h3>
            <p className="text-sm">Gestão completa para clínicas auditivas.</p>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-4">Suporte</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/Support" className="hover:text-white transition">Central de Ajuda</Link></li>
              <li><a href="mailto:suporte@sonatta.com.br" className="hover:text-white transition">Email</a></li>
              <li><a href="https://wa.me/5592991692102" className="hover:text-white transition">WhatsApp</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-4">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/TermsOfService" className="hover:text-white transition">Termos de Serviço</Link></li>
              <li><Link to="/PrivacyPolicy" className="hover:text-white transition">Política de Privacidade</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800 pt-6 text-center text-sm">
          <p>&copy; 2026 Sonatta. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}