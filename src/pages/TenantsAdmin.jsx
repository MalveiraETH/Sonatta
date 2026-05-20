import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Building2, ShieldAlert, Users, UserPlus, Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const emptyForm = () => ({
  name: '',
  cnpj: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  state: '',
  status: 'ativo',
  plan: 'gratuito',
  notes: '',
});

const statusColors = {
  ativo: 'bg-emerald-100 text-emerald-700',
  inativo: 'bg-slate-100 text-slate-600',
  suspenso: 'bg-red-100 text-red-700',
};

const planColors = {
  gratuito: 'bg-blue-100 text-blue-700',
  basico: 'bg-purple-100 text-purple-700',
  premium: 'bg-amber-100 text-amber-700',
};

export default function TenantsAdmin() {
  const [user, setUser] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  // Invite from tenant view
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteTenant, setInviteTenant] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviting, setInviting] = useState(false);

  // Users panel
  const [usersOpen, setUsersOpen] = useState(false);
  const [usersTenant, setUsersTenant] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [data, users] = await Promise.all([
        base44.entities.Tenant.list('-created_date'),
        base44.entities.User.list(),
      ]);
      setTenants(data);
      setAllUsers(users);
    } catch (e) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  // Keep alias for single-tenant loads
  const loadTenants = loadData;

  const usersForTenant = (tenantId) => allUsers.filter(u => u.tenant_id === tenantId);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    await base44.users.inviteUser(inviteEmail.trim(), inviteRole);
    // After a short delay find the new user and assign tenant
    setTimeout(async () => {
      try {
        const users = await base44.entities.User.list();
        const invited = users.find(u => u.email === inviteEmail.trim());
        if (invited && inviteTenant) {
          await base44.entities.User.update(invited.id, { tenant_id: inviteTenant.id });
        }
        loadData();
      } catch (_) { loadData(); }
    }, 1500);
    toast.success(`Convite enviado para ${inviteEmail}`);
    setInviteEmail('');
    setInviteRole('user');
    setInviteOpen(false);
    setInviting(false);
  };

  const openCreate = () => {
    setEditing(null);
    setFormData(emptyForm());
    setFormOpen(true);
  };

  const openEdit = (tenant) => {
    setEditing(tenant);
    setFormData({ ...emptyForm(), ...tenant });
    setFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) { toast.error('Nome obrigatório'); return; }
    setSaving(true);
    try {
      if (editing) {
        await base44.entities.Tenant.update(editing.id, formData);
        toast.success('Tenant atualizado!');
      } else {
        await base44.entities.Tenant.create(formData);
        toast.success('Tenant criado!');
      }
      setFormOpen(false);
      loadTenants();
    } catch (e) {
      toast.error('Erro ao salvar tenant');
    } finally {
      setSaving(false);
    }
  };

  if (user && user.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
        <ShieldAlert className="h-10 w-10 text-slate-300" />
        <p className="text-base font-medium">Acesso restrito a administradores</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="h-7 w-7 text-[#6B3FA0]" />
            Gestão de Tenants
          </h1>
          <p className="text-sm text-slate-500 mt-1">Administração das clínicas cadastradas no sistema</p>
        </div>
        <Button onClick={openCreate} className="bg-[#6B3FA0] hover:bg-[#834CB8] w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Novo Tenant
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: tenants.length, color: 'text-slate-800' },
          { label: 'Ativos', value: tenants.filter(t => t.status === 'ativo').length, color: 'text-emerald-600' },
          { label: 'Inativos', value: tenants.filter(t => t.status === 'inativo').length, color: 'text-slate-500' },
          { label: 'Suspensos', value: tenants.filter(t => t.status === 'suspenso').length, color: 'text-red-600' },
        ].map(({ label, value, color }) => (
          <Card key={label} className="p-4">
            <p className="text-xs text-slate-500">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6B3FA0]" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Nome</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-400">
                    Nenhum tenant cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                tenants.map(tenant => (
                  <TableRow key={tenant.id} className="hover:bg-slate-50">
                    <TableCell className="font-semibold text-slate-900">{tenant.name}</TableCell>
                    <TableCell className="text-sm text-slate-500">{tenant.cnpj || '—'}</TableCell>
                    <TableCell className="text-sm">{tenant.city}{tenant.city && tenant.state ? '/' : ''}{tenant.state || (tenant.city ? '' : '—')}</TableCell>
                    <TableCell className="text-sm">
                      <div>{tenant.phone || '—'}</div>
                      {tenant.email && <div className="text-xs text-slate-400">{tenant.email}</div>}
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${planColors[tenant.plan] || 'bg-slate-100 text-slate-600'}`}>
                        {tenant.plan || 'gratuito'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${statusColors[tenant.status] || 'bg-slate-100 text-slate-600'}`}>
                        {tenant.status || 'ativo'}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-500 gap-1 text-xs"
                          onClick={() => { setUsersTenant(tenant); setUsersOpen(true); }}
                        >
                          <Users className="h-3.5 w-3.5" />
                          {usersForTenant(tenant.id).length}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Convidar usuário"
                          onClick={() => { setInviteTenant(tenant); setInviteEmail(''); setInviteRole('user'); setInviteOpen(true); }}
                        >
                          <UserPlus className="h-4 w-4 text-[#6B3FA0]" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(tenant)}>
                          <Pencil className="h-4 w-4 text-slate-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Users Panel Dialog */}
      <Dialog open={usersOpen} onOpenChange={setUsersOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[#6B3FA0]" />
              Usuários — {usersTenant?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {usersTenant && usersForTenant(usersTenant.id).length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Nenhum usuário associado.</p>
            ) : (
              <ul className="divide-y">
                {usersTenant && usersForTenant(usersTenant.id).map(u => (
                  <li key={u.id} className="flex items-center gap-3 py-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#6B3FA0]/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-[#6B3FA0] font-semibold text-sm">{u.full_name?.charAt(0) || '?'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{u.full_name}</p>
                      <p className="text-xs text-slate-400 truncate">{u.email}</p>
                    </div>
                    <span className="text-xs text-slate-500 shrink-0">{u.role}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setInviteTenant(usersTenant); setInviteEmail(''); setInviteRole('user'); setUsersOpen(false); setInviteOpen(true); }} className="gap-1">
              <UserPlus className="h-4 w-4" /> Convidar
            </Button>
            <Button onClick={() => setUsersOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-[#6B3FA0]" />
              Convidar para {inviteTenant?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" placeholder="email@exemplo.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Papel</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="fonoaudiologo">Fonoaudiólogo(a)</SelectItem>
                  <SelectItem value="comercial">Consultor Comercial</SelectItem>
                  <SelectItem value="recepcao">Recepção</SelectItem>
                  <SelectItem value="user">Usuário</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
            <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()} className="bg-[#6B3FA0] hover:bg-[#834CB8]">
              {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar Convite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Tenant' : 'Novo Tenant'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-1">
                <Label>Nome da Clínica *</Label>
                <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Sonatta Manaus" />
              </div>
              <div className="space-y-1">
                <Label>CNPJ</Label>
                <Input value={formData.cnpj} onChange={e => setFormData({ ...formData, cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
              </div>
              <div className="space-y-1">
                <Label>Telefone</Label>
                <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="(00) 00000-0000" />
              </div>
              <div className="space-y-1">
                <Label>E-mail</Label>
                <Input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="contato@clinica.com" />
              </div>
              <div className="space-y-1">
                <Label>Endereço</Label>
                <Input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="Rua, número, bairro" />
              </div>
              <div className="space-y-1">
                <Label>Cidade</Label>
                <Input value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} placeholder="Manaus" />
              </div>
              <div className="space-y-1">
                <Label>Estado (UF)</Label>
                <Input value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value })} placeholder="AM" maxLength={2} />
              </div>
              <div className="space-y-1">
                <Label>Plano</Label>
                <Select value={formData.plan} onValueChange={v => setFormData({ ...formData, plan: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gratuito">Gratuito</SelectItem>
                    <SelectItem value="basico">Básico</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                    <SelectItem value="suspenso">Suspenso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 space-y-1">
                <Label>Observações</Label>
                <Input value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Notas internas..." />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving} className="bg-[#6B3FA0] hover:bg-[#834CB8]">
                {saving ? 'Salvando...' : editing ? 'Salvar' : 'Criar Tenant'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}