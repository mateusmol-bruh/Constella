import React from 'react';
import { AppState } from 'react-native';
import { useAuth } from './AuthContext';
import { proService } from '../services/pro.service';
import { errorMessage } from '../services/api';
import { hasProAccess } from '../utils/pro';
import type { ProStatus } from '../types/pro';

interface ProState {
  data?: ProStatus; loading: boolean; error: string; access: boolean;
  reload: () => Promise<void>; setData: (status: ProStatus) => void;
}
const Context = React.createContext<ProState | null>(null);
export function ProProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return <AccountProProvider key={user?.id ?? 'guest'} owner={user?.id}>{children}</AccountProProvider>;
}
function AccountProProvider({ owner, children }: { owner?: string; children: React.ReactNode }) {
  const generation = React.useRef(0);
  const [state, setState] = React.useState<{ data?: ProStatus; loading: boolean; error: string }>({ loading: !!owner, error: '' });
  const reload = React.useCallback(async () => {
    const run = ++generation.current;
    if (!owner) return;
    try {
      const data = await proService.status();
      if (run === generation.current) setState({ data, loading: false, error: '' });
    } catch (cause) {
      if (run === generation.current) setState({ loading: false, error: errorMessage(cause) });
    }
  }, [owner]);
  React.useEffect(() => {
    const counter = generation;
    const startup = setTimeout(() => { if (owner) void reload(); }, 0);
    const interval = setInterval(() => { if (owner && AppState.currentState === 'active') void reload(); }, 15000);
    const sub = AppState.addEventListener('change', value => { if (value === 'active' && owner) void reload(); });
    return () => { counter.current++; clearTimeout(startup); clearInterval(interval); sub.remove(); };
  }, [owner, reload]);
  const data = state.data;
  const setData = React.useCallback((data: ProStatus) => { generation.current++; setState({ data, loading: false, error: '' }); }, []);
  return <Context.Provider value={{ data, loading: state.loading, error: state.error, access: !!data && hasProAccess(data), reload, setData }}>{children}</Context.Provider>;
}
export function usePro() {
  const value = React.useContext(Context);
  if (!value) throw new Error('ProProvider ausente');
  return value;
}
