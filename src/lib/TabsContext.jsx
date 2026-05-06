import React, { createContext, useContext, useState, useCallback } from 'react';

const TabsContext = createContext(null);

export function TabsProvider({ children }) {
  const [tabs, setTabs] = useState([{ page: 'Dashboard', name: 'Dashboard' }]);
  const [activeTab, setActiveTab] = useState('Dashboard');

  const openTab = useCallback((page, name) => {
    setTabs(prev => {
      const exists = prev.find(t => t.page === page);
      if (exists) return prev;
      return [...prev, { page, name }];
    });
    setActiveTab(page);
  }, []);

  const closeTab = useCallback((page, allPages) => {
    setTabs(prev => {
      const newTabs = prev.filter(t => t.page !== page);
      if (newTabs.length === 0) return prev; // nunca fechar a última aba
      return newTabs;
    });
    setActiveTab(prev => {
      if (prev !== page) return prev;
      // ativar a aba anterior ou a próxima
      const idx = tabs.findIndex(t => t.page === page);
      const newTabs = tabs.filter(t => t.page !== page);
      if (newTabs.length === 0) return tabs[0].page;
      return newTabs[Math.max(0, idx - 1)].page;
    });
  }, [tabs]);

  const activateTab = useCallback((page) => {
    setActiveTab(page);
  }, []);

  return (
    <TabsContext.Provider value={{ tabs, activeTab, openTab, closeTab, activateTab }}>
      {children}
    </TabsContext.Provider>
  );
}

export function useTabs() {
  return useContext(TabsContext);
}