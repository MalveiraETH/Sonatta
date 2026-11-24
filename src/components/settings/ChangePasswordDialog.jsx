import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { KeyRound, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ChangePasswordDialog({ open, onOpenChange, user }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleSave = async () => {
    if (newPassword.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('A confirmação não confere com a nova senha');
      return;
    }
    if (!currentPassword) {
      toast.error('Informe sua senha atual');
      return;
    }
    setSaving(true);
    try {
      await base44.auth.changePassword({
        userId: user?.id,
        currentPassword,
        newPassword,
      });
      toast.success('Senha alterada com sucesso');
      reset();
      onOpenChange(false);
    } catch (e) {
      toast.error(`Não foi possível alterar a senha: ${e?.message || 'verifique a senha atual'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-[#6B3FA0]" />
            Alterar Minha Senha
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Senha atual</Label>
            <Input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Nova senha</Label>
            <Input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Confirmar nova senha</Label>
            <Input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Mínimo de 6 caracteres. Depois de alterar, use a nova senha nos próximos acessos.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Cancelar</Button>
          <Button
            onClick={handleSave}
            disabled={saving || !currentPassword || !newPassword || !confirmPassword}
            className="bg-[#6B3FA0] hover:bg-[#5a3388] text-white"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar Nova Senha'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}