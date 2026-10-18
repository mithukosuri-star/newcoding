import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { View } from '../types';

interface NavValue {
  view: View;
  canGoBack: boolean;
  navigate: (view: View) => void;
  back: () => void;
}

const NavContext = createContext<NavValue | null>(null);

export function NavProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<View[]>([{ kind: 'home' }]);

  const navigate = useCallback((next: View) => {
    setStack((prev) => {
      const current = prev[prev.length - 1];
      if (JSON.stringify(current) === JSON.stringify(next)) return prev;
      return [...prev, next];
    });
  }, []);

  const back = useCallback(() => {
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const value = useMemo(
    () => ({
      view: stack[stack.length - 1],
      canGoBack: stack.length > 1,
      navigate,
      back,
    }),
    [back, navigate, stack],
  );

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav(): NavValue {
  const context = useContext(NavContext);
  if (!context) throw new Error('useNav must be used inside NavProvider');
  return context;
}
