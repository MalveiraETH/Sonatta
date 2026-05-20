import React, { useState, useEffect } from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Code, Copy, Download, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

export default function ApiDocs() {
  const [spec, setSpec] = useState(null);

  useEffect(() => {
    fetch('/swagger.json')
      .then(res => res.json())
      .then(setSpec)
      .catch(err => {
        console.error('Failed to load Swagger spec:', err);
        toast.error('Erro ao carregar documentação');
      });
  }, []);

  const handleDownloadSpec = () => {
    if (spec) {
      const dataStr = JSON.stringify(spec, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = window.URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'sonatta-api-spec.json';
      link.click();
    }
  };

  const handleCopyEndpoint = (endpoint) => {
    navigator.clipboard.writeText(endpoint);
    toast.success('Endpoint copiado!');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">API Documentation</h1>
          <p className="text-gray-600">Documentação completa da API Sonatta</p>
        </div>
        <Button onClick={handleDownloadSpec} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Download OpenAPI
        </Button>
      </div>

      {/* Quick Reference */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Code className="w-4 h-4" />
              Base URL
            </CardTitle>
          </CardHeader>
          <CardContent>
            <code className="bg-gray-100 px-2 py-1 rounded text-sm block overflow-x-auto">
              https://api.sonatta.com.br
            </code>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Auth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <code className="bg-gray-100 px-2 py-1 rounded text-sm block overflow-x-auto">
              Bearer Token (JWT)
            </code>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              Version
            </CardTitle>
          </CardHeader>
          <CardContent>
            <code className="bg-gray-100 px-2 py-1 rounded text-sm">
              v1.0
            </code>
          </CardContent>
        </Card>
      </div>

      {/* Common Endpoints */}
      <Card>
        <CardHeader>
          <CardTitle>Endpoints Principais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { method: 'GET', path: '/entities/Client', desc: 'Listar clientes' },
              { method: 'POST', path: '/entities/Client', desc: 'Criar cliente' },
              { method: 'GET', path: '/entities/Sale', desc: 'Listar vendas' },
              { method: 'POST', path: '/entities/Sale', desc: 'Criar venda' },
              { method: 'POST', path: '/functions/checkPlanLimits', desc: 'Verificar limites do plano' },
              { method: 'POST', path: '/functions/backupDatabase', desc: 'Criar backup' },
            ].map((endpoint, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100 transition">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <span className={`px-3 py-1 rounded font-mono text-sm font-bold ${
                    endpoint.method === 'GET' ? 'bg-blue-100 text-blue-700' :
                    endpoint.method === 'POST' ? 'bg-green-100 text-green-700' : ''
                  }`}>
                    {endpoint.method}
                  </span>
                  <div className="flex-1 min-w-0">
                    <code className="block text-sm overflow-x-auto">{endpoint.path}</code>
                    <p className="text-xs text-gray-600">{endpoint.desc}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleCopyEndpoint(endpoint.path)}
                  className="flex-shrink-0"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Swagger UI */}
      {spec && (
        <Card>
          <CardHeader>
            <CardTitle>Documentação Interativa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="swagger-wrapper">
              <SwaggerUI spec={spec} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auth Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Autenticação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="font-medium mb-2">1. Obter Token</p>
            <code className="block bg-gray-900 text-gray-100 p-3 rounded text-sm overflow-x-auto">
{`curl -X POST https://api.sonatta.com.br/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"user@example.com","password":"pass"}'`}
            </code>
          </div>
          <div>
            <p className="font-medium mb-2">2. Usar Token</p>
            <code className="block bg-gray-900 text-gray-100 p-3 rounded text-sm overflow-x-auto">
{`curl https://api.sonatta.com.br/entities/Client \\
  -H "Authorization: Bearer YOUR_TOKEN"`}
            </code>
          </div>
          <div>
            <p className="font-medium mb-2">3. No JavaScript</p>
            <code className="block bg-gray-900 text-gray-100 p-3 rounded text-sm overflow-x-auto">
{`const response = await fetch('/entities/Client', {
  headers: {
    'Authorization': \`Bearer \${token}\`
  }
});`}
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}