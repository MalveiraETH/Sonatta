import { useMemo } from 'react';
import { ROLE_PERMISSIONS, getPageAccessByRole, canAccess } from './rolePermissions';

export function usePermissions(user) {
  const permissions = useMemo(() => {
    if (!user?.role) return {};
    return ROLE_PERMISSIONS[user.role] || {};
  }, [user?.role]);

  const allowedPages = useMemo(() => {
    if (!user?.role) return [];
    return getPageAccessByRole(user.role);
  }, [user?.role]);

  return {
    permissions,
    allowedPages,
    canAccess: (resource, action = 'read') => {
      return canAccess(user?.role, resource, action);
    },
    canAccessPage: (pageName) => {
      if (!pageName) return false;
      const pageResource = pageName.charAt(0).toLowerCase() + pageName.slice(1);
      // Map page names to resources
      const resourceMap = {
        clients: 'clients',
        sales: 'sales',
        appointments: 'appointments',
        inventory: 'inventory',
        quotes: 'quotes',
        contracts: 'contracts',
        deviceRepairs: 'repairs',
        financeiro: 'financeiro',
        tests: 'tests',
        professionals: 'professionals',
        registrations: 'registrations',
        reports: 'reports',
        analytics: 'analytics',
        webhooks: 'webhooks',
        apiDocs: 'apidocs',
        usageDashboard: 'backup',
        settings: 'settings',
        dashboard: 'clients', // Dashboard requires clients access
      };

      const resource = resourceMap[pageName] || pageResource;
      return canAccess(user?.role, resource, 'read');
    },
    hasAdminRole: user?.role === 'admin',
    userRole: user?.role,
  };
}