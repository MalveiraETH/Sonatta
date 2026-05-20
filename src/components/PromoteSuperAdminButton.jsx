import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function PromoteSuperAdminButton() {
  const [loading, setLoading] = useState(false);

  const handlePromote = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('promoteSuperAdmin', {});
      
      if (response.data.success) {
        toast.success('Você foi promovido a super_admin! Recarregando...');
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (error) {
      toast.error('Erro ao promover: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      onClick={handlePromote} 
      disabled={loading}
      className="bg-purple-600 hover:bg-purple-700"
    >
      <Shield className="h-4 w-4 mr-2" />
      {loading ? 'Promovendo...' : 'Promover a Super Admin'}
    </Button>
  );
}