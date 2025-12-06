'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface ShortcutsContextType {
  showHelp: () => void;
  hideHelp: () => void;
  isOpen: boolean;
}

const ShortcutsContext = createContext<ShortcutsContextType | undefined>(undefined);

export function ShortcutsProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const showHelp = useCallback(() => {
    setIsOpen(true);
  }, []);

  const hideHelp = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <ShortcutsContext.Provider
      value={{
        showHelp,
        hideHelp,
        isOpen,
      }}
    >
      {children}
    </ShortcutsContext.Provider>
  );
}

export function useShortcuts() {
  const context = useContext(ShortcutsContext);
  if (!context) {
    throw new Error('useShortcuts must be used within a ShortcutsProvider');
  }
  return context;
}
