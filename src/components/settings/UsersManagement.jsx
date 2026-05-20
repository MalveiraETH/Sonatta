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
import { UserPlus, Mail, Shield, User, Loader2 } from 'lucide-react';
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

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    await base44.users.inviteUser(inviteEmail.trim(), inviteRole);
    toast.success(`Convite enviado para ${inviteEmail}`);
    setInviteEmail('');
    setInviteRole('user');
    setInviteOpen(false);
    setInviting(false);
    loadData();
  };

  const handleSaveRole = async () => {
    setSaving(true);
    await base44.entities.User.update(editUser.id, { role: editRole });
    toast.success('Papel atualizado com sucesso');
    setEditUser(null);
    setSaving(false);
    loadData();
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

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-[#6B3FA0]" />
              Convidar Novo Usuário
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
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
              <Label>Papel</Label>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
            <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()} className="bg-[#6B3FA0] hover:bg-[#5a3388] text-white">
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
    </div>
  );
}