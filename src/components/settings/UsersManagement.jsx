import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UserPlus, Shield, User, Loader2, UserX, UserCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import PendingInvitesCard from './PendingInvitesCard';

const roleLabels = {
  admin: 'Administrador',
  fonoaudiologo: 'Fonoaudiólogo(a)',
  comercial: 'Consultor Comercial',
  recepcao: 'Recepção',
  user: 'Usuário',
};

const roleColors = {
  admin: 'bg-purple-100 text-purple-700',
  fonoaudiologo: 'bg-blue-100 text-blue-700',
  comercial: 'bg-emerald-100 text-emerald-700',
  recepcao: 'bg-amber-100 text-amber-700',
  user: 'bg-slate-100 text-slate-700',
};

export default function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviting, setInviting] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editRole, setEditRole] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteUser, setDeleteUser] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const me = await base44.auth.me();
    const [allUsers, pendingInvites] = await Promise.all([
      base44.entities.User.list(),
      me?.role === 'admin'
        ? base44.entities.AccessInvite.filter({ status: 'pendente' }, { sort: '-created_date', limit: 100 })
        : Promise.resolve({ items: [] }),
    ]);
    setCurrentUser(me);
    setUsers(allUsers);
    setInvites(pendingInvites.items || []);
    setLoading(false);
  };

  const handleCreateUser = async () => {
    const email = inviteEmail.trim().toLowerCase();
    const fullName = inviteName.trim();
    const role = inviteRole;
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Informe um e-mail válido');
      return;
    }
    setInviting(true);
    try {
      // Pessoa que já tem acesso: apenas atualiza o perfil
      const existing = users.find((u) => (u.email || '').toLowerCase() === email);
      if (existing) {
        await base44.entities.User.update(existing.id, {
          role,
          ...(fullName ? { full_name: fullName } : {}),
        });
        toast.success(`${fullName || email} já tinha acesso. Perfil atualizado para ${roleLabels[role] || role}`);
        setInviteName('');
        setInviteEmail('');
        setInviteRole('user');
        setInviteOpen(false);
        loadData();
        return;
      }

      // Registra o convite com o perfil escolhido antes de enviar o e-mail
      const inviteData = {
        email,
        full_name: fullName,
        role,
        status: 'pendente',
        invited_at: new Date().toISOString(),
        invited_by_name: currentUser.full_name || currentUser.email,
      };
      const previous = await base44.entities.AccessInvite.filter({ email }, { sort: '-created_date', limit: 1 });
      const previousInvite = previous.items?.[0];
      if (previousInvite) {
        await base44.entities.AccessInvite.update(previousInvite.id, inviteData);
      } else {
        await base44.entities.AccessInvite.create(inviteData);
      }

      await base44.users.inviteUser(email, role === 'admin' ? 'admin' : 'user');

      await base44.integrations.Core.SendEmail({
        to: currentUser.email,
        subject: 'Novo convite de acesso - Sonatta',
        body: `Olá ${currentUser.full_name},\n\nUm convite de acesso foi enviado no sistema Sonatta:\n\nNome: ${fullName || '(não informado)'}\nE-mail: ${email}\nPerfil de acesso: ${roleLabels[role] || role}\n\nA pessoa receberá um e-mail com o link para criar a senha. O perfil escolhido é aplicado automaticamente no primeiro acesso.\n\nSonatta - Soluções Auditivas`,
      });
      toast.success(`Convite enviado para ${email} com o perfil ${roleLabels[role] || role}`);
      setInviteName('');
      setInviteEmail('');
      setInviteRole('user');
      setInviteOpen(false);
      loadData();
    } catch (e) {
      toast.error(`Erro ao enviar convite: ${e?.message || 'Tente novamente'}`);
    } finally {
      setInviting(false);
    }
  };

  const handleResendInvite = async (invite) => {
    try {
      await base44.users.inviteUser(invite.email, invite.role === 'admin' ? 'admin' : 'user');
      await base44.entities.AccessInvite.update(invite.id, {
        status: 'pendente',
        invited_at: new Date().toISOString(),
      });
      toast.success(`Convite reenviado para ${invite.email}`);
      loadData();
    } catch (e) {
      toast.error(`Não foi possível reenviar: ${e?.message || 'Tente novamente'}`);
    }
  };

  const handleCancelInvite = async (invite) => {
    try {
      await base44.entities.AccessInvite.update(invite.id, { status: 'cancelado' });
      toast.success('Convite cancelado. Esse e-mail não conseguirá entrar no sistema.');
      loadData();
    } catch (e) {
      toast.error(`Erro ao cancelar convite: ${e?.message || 'Tente novamente'}`);
    }
  };

  const handleSaveRole = async () => {
    setSaving(true);
    try {
      await base44.entities.User.update(editUser.id, { role: editRole });
      toast.success('Papel atualizado com sucesso');
      setEditUser(null);
      loadData();
    } catch (e) {
      toast.error(`Erro ao atualizar papel: ${e?.message || 'Tente novamente'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAccess = async (u) => {
    const next = u.access_status === 'inativo' ? 'ativo' : 'inativo';
    try {
      await base44.entities.User.update(u.id, { access_status: next });
      toast.success(next === 'ativo' ? 'Acesso reativado' : 'Acesso inativado');
      loadData();
    } catch (e) {
      toast.error(`Erro ao alterar acesso: ${e?.message || 'Tente novamente'}`);
    }
  };

  const handleDeleteUser = async () => {
    setDeleting(true);
    try {
      const response = await base44.functions.invoke('excluirUsuario', { user_id: deleteUser.id });
      if (response.data?.error) throw new Error(response.data.error);
      toast.success('Usuário excluído');
      setDeleteUser(null);
      loadData();
    } catch (e) {
      toast.error(`Erro ao excluir usuário: ${e?.message || 'Tente novamente'}`);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#6B3FA0]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-[#6B3FA0]" />
            Usuários do Sistema
          </CardTitle>
          {currentUser?.role === 'admin' && (
            <Button
              onClick={() => setInviteOpen(true)}
              className="bg-[#6B3FA0] hover:bg-[#5a3388] text-white gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Convidar Usuário
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Papel</TableHead>
                {currentUser?.role === 'admin' && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#6B3FA0]/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-[#6B3FA0] font-semibold text-sm">
                          {u.full_name?.charAt(0) || '?'}
                        </span>
                      </div>
                      {u.full_name}
                      {u.id === currentUser?.id && (
                        <Badge variant="outline" className="text-xs">Você</Badge>
                      )}
                      {u.access_status === 'inativo' && (
                        <Badge className="text-xs bg-red-100 text-red-700 hover:bg-red-100">Inativo</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600">{u.email}</TableCell>
                  <TableCell>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[u.role] || roleColors.user}`}>
                      {roleLabels[u.role] || u.role}
                    </span>
                  </TableCell>
                  {currentUser?.role === 'admin' && (
                    <TableCell className="text-right">
                      {u.id !== currentUser?.id && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setEditUser(u); setEditRole(u.role || 'user'); }}
                          >
                            Alterar Papel
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title={u.access_status === 'inativo' ? 'Reativar acesso' : 'Inativar acesso'}
                            onClick={() => handleToggleAccess(u)}
                          >
                            {u.access_status === 'inativo' ? (
                              <UserCheck className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <UserX className="h-4 w-4 text-amber-600" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Excluir usuário"
                            onClick={() => setDeleteUser(u)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {currentUser?.role === 'admin' && (
        <PendingInvitesCard
          invites={invites}
          onResend={handleResendInvite}
          onCancel={handleCancelInvite}
        />
      )}

      {/* Novo Usuário Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-[#6B3FA0]" />
              Convidar Usuário
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome completo</Label>
              <Input
                placeholder="Nome do usuário"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Perfil de acesso</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="fonoaudiologo">Fonoaudiólogo(a)</SelectItem>
                  <SelectItem value="comercial">Consultor Comercial</SelectItem>
                  <SelectItem value="recepcao">Recepção</SelectItem>
                  <SelectItem value="user">Usuário</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              O perfil escolhido é aplicado automaticamente quando a pessoa entrar no sistema pela primeira vez. Ela recebe por e-mail o link para criar a senha.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateUser} disabled={inviting || !inviteEmail.trim()} className="bg-[#6B3FA0] hover:bg-[#5a3388] text-white">
              {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar Convite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#6B3FA0]" />
              Alterar Papel de {editUser?.full_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Papel</Label>
            <Select value={editRole} onValueChange={setEditRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="fonoaudiologo">Fonoaudiólogo(a)</SelectItem>
                <SelectItem value="comercial">Consultor Comercial</SelectItem>
                <SelectItem value="recepcao">Recepção</SelectItem>
                <SelectItem value="user">Usuário</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancelar</Button>
            <Button onClick={handleSaveRole} disabled={saving} className="bg-[#6B3FA0] hover:bg-[#5a3388] text-white">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Excluir Usuário */}
      <AlertDialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteUser?.full_name || deleteUser?.email}</strong>? A pessoa perde o acesso ao sistema imediatamente. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDeleteUser(); }}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}