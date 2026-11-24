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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UserPlus, Shield, User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [me, allUsers] = await Promise.all([
      base44.auth.me(),
      base44.entities.User.list(),
    ]);
    setCurrentUser(me);
    setUsers(allUsers);
    setLoading(false);
  };

  // Garante que nome e perfil escolhidos no cadastro fiquem gravados no usuário
  const applyProfile = async (email, role, fullName) => {
    try {
      const allUsers = await base44.entities.User.list();
      const created = allUsers.find((u) => (u.email || '').toLowerCase() === email.toLowerCase());
      if (!created) return;
      if (created.role !== role) {
        await base44.entities.User.update(created.id, { role });
      }
      if (fullName && created.full_name !== fullName) {
        await base44.entities.User.update(created.id, { full_name: fullName });
      }
    } catch (e) {
      // O perfil já foi enviado na criação do acesso
    }
  };

  const handleCreateUser = async () => {
    const email = inviteEmail.trim();
    const fullName = inviteName.trim();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Informe um e-mail válido');
      return;
    }
    setInviting(true);
    try {
      await base44.users.inviteUser(email, inviteRole);
      await applyProfile(email, inviteRole, fullName);
      await base44.integrations.Core.SendEmail({
        to: currentUser.email,
        subject: 'Novo usuário cadastrado - Sonatta',
        body: `Olá ${currentUser.full_name},\n\nUm novo usuário foi cadastrado no sistema Sonatta:\n\nNome: ${fullName || '(não informado)'}\nE-mail: ${email}\nPerfil de acesso: ${roleLabels[inviteRole] || inviteRole}\n\nO usuário receberá um e-mail com o link para definir a senha e acessar o sistema.\n\nSonatta - Soluções Auditivas`,
      });
      toast.success(`Usuário ${fullName || email} cadastrado como ${roleLabels[inviteRole] || inviteRole}`);
      setInviteName('');
      setInviteEmail('');
      setInviteRole('user');
      setInviteOpen(false);
      loadData();
    } catch (e) {
      toast.error(`Erro ao cadastrar usuário: ${e?.message || 'Tente novamente'}`);
    } finally {
      setInviting(false);
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
              Novo Usuário
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setEditUser(u); setEditRole(u.role || 'user'); }}
                        >
                          Alterar Papel
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Novo Usuário Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-[#6B3FA0]" />
              Novo Usuário
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
              O perfil de acesso já fica definido neste cadastro. O usuário recebe por e-mail o link para criar a senha e entrar no sistema.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateUser} disabled={inviting || !inviteEmail.trim()} className="bg-[#6B3FA0] hover:bg-[#5a3388] text-white">
              {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cadastrar Usuário'}
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
    </div>
  );
}