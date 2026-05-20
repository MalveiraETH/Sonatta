import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ROLE_PERMISSIONS, ROLE_LABELS } from '@/lib/rolePermissions';
import { toast } from 'sonner';

export default function SettingsRoles() {
  const [users, setUsers] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [selectedRole, setSelectedRole] = useState('comercial');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const allUsers = await base44.entities.User.list();
      setUsers(allUsers);
    } catch (error) {
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = async () => {
    if (!editingUserId) return;

    try {
      await base44.auth.updateMe({ id: editingUserId, role: selectedRole });
      toast.success('Role atualizado');
      loadUsers();
      setShowDialog(false);
    } catch (error) {
      toast.error('Erro ao atualizar');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Permissões por Role</h1>

      {/* Usuários */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários e Roles</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Carregando...</p>
          ) : (
            <div className="space-y-3">
              {users.map(user => (
                <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-semibold">{user.full_name}</p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingUserId(user.id);
                        setSelectedRole(user.role);
                        setShowDialog(true);
                      }}
                    >
                      Alterar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permissões por Role */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.entries(ROLE_PERMISSIONS).map(([role, perms]) => (
          <Card key={role}>
            <CardHeader>
              <CardTitle className="text-lg">{ROLE_LABELS[role]}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(perms).map(([resource, actions]) => (
                  <div key={resource} className="border-l-4 border-blue-500 pl-3">
                    <p className="font-medium text-sm capitalize">{resource}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {actions.map(action => (
                        <span
                          key={action}
                          className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                        >
                          {action}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog de Alterar Role */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Role do Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Novo Role</label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([role, label]) => (
                    <SelectItem key={role} value={role}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleChangeRole}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}