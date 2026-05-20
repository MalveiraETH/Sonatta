import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export default function SeedDemo() {
  const [email, setEmail] = useState('malveira.fabio@gmail.com');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const checkSuperAdminPermission = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const users = await base44.entities.User.list();
      const user = users.find(u => u.email === email);

      if (!user) {
        setError(`Usuário ${email} não encontrado`);
        setLoading(false);
        return;
      }

      const isSuperAdmin = user.role === 'admin';
      setResult({
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        isSuperAdmin,
      });
    } catch (err) {
      setError(err.message || 'Erro ao verificar permissões');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Verificar Permissões de Super Admin</CardTitle>
          <CardDescription>
            Verifique o status de permissões de super admin para um usuário
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email do Usuário</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@example.com"
            />
          </div>

          <Button
            onClick={checkSuperAdminPermission}
            disabled={loading || !email}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verificando...
              </>
            ) : (
              'Verificar Permissão'
            )}
          </Button>

          {error && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Erro</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-3 p-4 rounded-lg bg-blue-50 border border-blue-200">
              <div className="flex items-start gap-3">
                {result.isSuperAdmin ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-medium text-blue-900">Resultado da Verificação</p>
                  <div className="mt-2 space-y-1 text-sm text-blue-800">
                    <p><strong>Email:</strong> {result.email}</p>
                    <p><strong>Nome:</strong> {result.fullName}</p>
                    <p><strong>Role:</strong> {result.role}</p>
                    <p>
                      <strong>Super Admin:</strong>{' '}
                      <span className={result.isSuperAdmin ? 'text-green-600 font-semibold' : 'text-amber-600 font-semibold'}>
                        {result.isSuperAdmin ? 'SIM ✓' : 'NÃO ✗'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}