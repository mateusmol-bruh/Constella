import React, { createContext, useContext, type ReactNode } from 'react';
import { communityService, type CommunityRepository } from '../services/community.service';
import { useAuth } from './AuthContext';
const CommunityContext = createContext<CommunityRepository | undefined>(undefined);
export function CommunityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return <CommunityContext.Provider value={user ? communityService : undefined}>{children}</CommunityContext.Provider>;
}
export function useCommunity() {
  const repository = useContext(CommunityContext);
  if (!repository) throw new Error('Entre com sua conta para acessar a comunidade.');
  return repository;
}
