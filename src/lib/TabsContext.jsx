import React, { createContext, useContext, useState, useCallback } from 'react';

const TabsContext = createContext(null);

export function TabsProvider({ children, initialPage = 'Dashboard', initialName = 'Dashboard' }) {
  const [tabs, setTabs] = useState([{ page: initialPage, name: initialName, params: {} }]);
  const [activeTab, setActiveTab] = useState(initialPage);

  const openTab = useCallback((page, name, params = {}) => {
    setTabs(prev => {
      const exists = prev.find(t => t.page === page);
      if (exists) {
        // Atualiza os params da aba existente
        return prev.map(t => t.page === page ? { ...t, params } : t);
      }
      return [...prev, { page, name, params }];
    });
    setActiveTab(page);
  }, []);

  const closeTab = useCallback((page) => {
    setTabs(prev => {
      const newTabs = prev.filter(t => t.page !== page);
      if (newTabs.length === 0) return prev;
      return newTabs;
    });
    setActiveTab(prev => {
      if (prev !== page) return prev;
      const idx = tabs.findIndex(t => t.page === page);
      const newTabs = tabs.filter(t => t.page !== page);
      if (newTabs.length === 0) return tabs[0].page;
      return newTabs[Math.max(0, idx - 1)].page;
    });
  }, [tabs]);

  const activateTab = useCallback((page) => {
    setActiveTab(page);
  }, []);

  const getTabParams = useCallback((page) => {
    const tab = tabs.find(t => t.page === page);
    return tab?.params || {};
  }, [tabs]);

  return (
    <TabsContext.Provider value={{ tabs, activeTab, openTab, closeTab, activateTab, getTabParams }}>
      {children}
    </TabsContext.Provider>
  );
}

export function useTabs() {
  return useContext(TabsContext);
}