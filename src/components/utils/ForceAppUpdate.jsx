import React from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function ForceAppUpdate() {
  const handleForceUpdate = async () => {
    try {
      const user = await base44.auth.me();
      
      if (user?.role !== 'admin') {
        toast.error('Apenas administradores podem forçar atualizações');
        return;
      }

      // Criar ou atualizar versão
      const versions = await base44.entities.AppVersion.list('-version_timestamp', 1);
      const newVersion = {
        version_timestamp: Date.now(),
        updated_by: user.full_name || user.email,
        description: 'Atualização forçada pelo administrador'
      };

      if (versions.length > 0) {
        await base44.entities.AppVersion.update(versions[0].id, newVersion);
      } else {
        await base44.entities.AppVersion.create(newVersion);
      }

      toast.success('Atualização enviada! Todos os usuários serão atualizados em breve.');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao forçar atualização');
    }
  };

  return (
    <Button
      onClick={handleForceUpdate}
      variant="outline"
      className="gap-2"
    >
      <RefreshCw className="h-4 w-4" />
      Forçar Atualização para Todos
    </Button>
  );
}