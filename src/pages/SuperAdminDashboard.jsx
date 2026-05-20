import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Users, Building2, Shield, Edit2, Eye } from 'lucide-react';
import { toast } from 'sonner';

export default function SuperAdminDashboard() {
  const { user, navigateToLogin } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [totalRevenue, setTotalRevenue] = useState(0);

  useEffect(() => {
    if (!user || user.role !== 'super_admin') {
      navigateToLogin();
      return;
    }
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tenantsData, usersData] = await Promise.all([
        base44.asServiceRole.entities.Tenant.list(),
        base44.asServiceRole.entities.User.list(),
      ]);
      
      setTenants(tenantsData || []);
      setUsers(usersData || []);
      
      // Calcular receita total (baseado em stripe_subscription_id ou plan)
      const revenue = tenantsData.reduce((sum, tenant) => {
        const planValue = { premium: 299, basico: 99, gratuito: 0 };
        return sum + (planValue[tenant.plan] || 0);
      }, 0);
      setTotalRevenue(revenue);
    } catch (error) {
      toast.error('Erro ao carregar dados');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const planColors = {
    premium: 'bg-purple-100 text-purple-800',
    basico: 'bg-blue-100 text-blue-800',
    gratuito: 'bg-gray-100 text-gray-800',
  };

  const statusColors = {
    ativo: 'bg-green-100 text-green-800',
    inativo: 'bg-gray-100 text-gray-800',
    suspenso: 'bg-red-100 text-red-800',
  };

  const getTenantAdmins = (tenantId) => {
    return users.filter(u => 
      u.tenant_id === tenantId && (u.role === 'admin' || u.role === 'super_admin')
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-slate-900">SuperAdmin Dashboard</h1>
        <p className="text-slate-600 mt-2">Gestão completa de tenants, faturamento e permissões</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Tenants</CardTitle>
            <Building2 className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenants.length}</div>
            <p className="text-xs text-slate-600">Clínicas ativas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
            <DollarSign className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {totalRevenue.toLocaleString('pt-BR')}</div>
            <p className="text-xs text-slate-600">Baseado em planos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários</CardTitle>
            <Users className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-slate-600">Total na plataforma</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planos Premium</CardTitle>
            <Shield className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenants.filter(t => t.plan === 'premium').length}</div>
            <p className="text-xs text-slate-600">Tenants premium</p>
          </CardContent>
        </Card>
      </div>

      {/* Tenants Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tenants</CardTitle>
          <CardDescription>Gestão de todas as clínicas e sua configuração</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Nome</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Administradores</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan="6" className="text-center py-8 text-slate-500">
                      Nenhum tenant encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  tenants.map((tenant) => {
                    const admins = getTenantAdmins(tenant.id);
                    return (
                      <TableRow key={tenant.id}>
                        <TableCell className="font-medium">{tenant.name}</TableCell>
                        <TableCell>
                          <Badge className={planColors[tenant.plan] || planColors.gratuito}>
                            {tenant.plan}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[tenant.status] || statusColors.ativo}>
                            {tenant.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {admins.length} admin{admins.length !== 1 ? 's' : ''}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">{tenant.cnpj || '-'}</TableCell>
                        <TableCell className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedTenant(tenant)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>{selectedTenant?.name}</DialogTitle>
                                <DialogDescription>Detalhes e gerenciamento do tenant</DialogDescription>
                              </DialogHeader>
                              {selectedTenant && (
                                <div className="space-y-6">
                                  {/* Informações do Tenant */}
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <p className="text-sm font-medium text-slate-600">CNPJ</p>
                                        <p className="text-lg font-semibold">{selectedTenant.cnpj || '-'}</p>
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-slate-600">Plano</p>
                                        <p className="text-lg font-semibold capitalize">{selectedTenant.plan}</p>
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-slate-600">Status</p>
                                        <p className="text-lg font-semibold capitalize">{selectedTenant.status}</p>
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-slate-600">E-mail</p>
                                        <p className="text-lg font-semibold">{selectedTenant.email || '-'}</p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Administradores */}
                                  <div>
                                    <h3 className="font-semibold text-slate-900 mb-3">Administradores</h3>
                                    <div className="space-y-2">
                                      {getTenantAdmins(selectedTenant.id).map(admin => (
                                        <div key={admin.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                          <div>
                                            <p className="font-medium text-slate-900">{admin.full_name}</p>
                                            <p className="text-sm text-slate-600">{admin.email}</p>
                                          </div>
                                          <Badge variant="outline">{admin.role}</Badge>
                                        </div>
                                      ))}
                                      {getTenantAdmins(selectedTenant.id).length === 0 && (
                                        <p className="text-sm text-slate-600">Nenhum administrador designado</p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Ações */}
                                  <div className="flex gap-2 pt-4 border-t">
                                    <Button variant="outline" className="flex-1">
                                      <Edit2 className="h-4 w-4 mr-2" />
                                      Editar Tenant
                                    </Button>
                                    <Button variant="outline" className="flex-1">
                                      Gerenciar Permissões
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Permissões por Tenant */}
      <Card>
        <CardHeader>
          <CardTitle>Permissões de Administradores</CardTitle>
          <CardDescription>Controle de acesso dos admins por tenant</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tenants.slice(0, 5).map(tenant => (
              <div key={tenant.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium text-slate-900">{tenant.name}</p>
                  <p className="text-sm text-slate-600">{getTenantAdmins(tenant.id).length} administrador(es)</p>
                </div>
                <Button variant="outline" size="sm">
                  <Shield className="h-4 w-4 mr-2" />
                  Configurar
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}