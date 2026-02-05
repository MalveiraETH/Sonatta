import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function AppVersionMonitor() {
  const [currentVersion, setCurrentVersion] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const user = await base44.auth.me();
        setIsAdmin(user?.role === 'admin');

        // Obter versão atual
        const versions = await base44.entities.AppVersion.list('-version_timestamp', 1);
        if (versions.length > 0) {
          setCurrentVersion(versions[0].version_timestamp);
        }

        // Subscrever mudanças
        const unsubscribe = base44.entities.AppVersion.subscribe((event) => {
          if (event.type === 'create' || event.type === 'update') {
            const newVersion = event.data.version_timestamp;
            
            // Se não é admin e a versão mudou, recarregar
            if (!isAdmin && currentVersion && newVersion > currentVersion) {
              setTimeout(() => {
                window.location.reload();
              }, 1000);
            }
          }
        });

        return unsubscribe;
      } catch (error) {
        console.error('Erro ao monitorar versão:', error);
      }
    };

    init();
  }, [currentVersion, isAdmin]);

  return null;
}