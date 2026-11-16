import React, { createContext, useContext, useState } from 'react';

export type Persona = 'TMD_HEAD' | 'BRANCH_AM' | 'AREA_EXEC_SO';

const STORAGE_KEY = 'beatpulse.persona';

export const PERSONA_LIST: { id: Persona; label: string; scopeBadge: string; canCompareCities: boolean; canDispatchAsm: boolean }[] = [
  { id: 'TMD_HEAD', label: 'TM&D Head / Circle', scopeBadge: '3-City Exec', canCompareCities: true, canDispatchAsm: true },
  { id: 'BRANCH_AM', label: 'Branch / Area Mgr (AM)', scopeBadge: 'AM · DMS Dispatch', canCompareCities: false, canDispatchAsm: true },
  { id: 'AREA_EXEC_SO', label: 'Area Exec / SO (WD Pilot)', scopeBadge: 'Field Execution', canCompareCities: false, canDispatchAsm: false },
];

function mapLegacyPersona(v: string | null): Persona | null {
  if (v === 'TMD_HEAD' || v === 'VP_TMD') return 'TMD_HEAD';
  if (v === 'BRANCH_AM' || v === 'BRANCH_MANAGER') return 'BRANCH_AM';
  if (v === 'AREA_EXEC_SO' || v === 'FIELD_SO') return 'AREA_EXEC_SO';
  return null;
}

let currentPersona: Persona = (() => {
  try {
    const v = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    const mapped = mapLegacyPersona(v);
    if (mapped) return mapped;
  } catch {
    /* ignore */
  }
  return 'TMD_HEAD';
})();

const listeners = new Set<(p: Persona) => void>();

export function getPersona(): Persona {
  return currentPersona;
}

export function subscribePersona(fn: (p: Persona) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

let fetchInstalled = false;
function installFetchWrapper() {
  if (fetchInstalled || typeof window === 'undefined' || !window.fetch) return;
  fetchInstalled = true;
  const orig = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (!url.startsWith('/api/')) return orig(input, init);
    const headers = new Headers(init?.headers);
    if (!headers.has('X-Persona')) headers.set('X-Persona', currentPersona);
    return orig(input, { ...init, headers });
  };
}
installFetchWrapper();

const Ctx = createContext<{ persona: Persona; setPersona: (p: Persona) => void }>({
  persona: 'TMD_HEAD',
  setPersona: () => {},
});

export const PersonaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [persona, setP] = useState<Persona>(currentPersona);
  const setPersona = (p: Persona) => {
    currentPersona = p;
    try {
      window.localStorage.setItem(STORAGE_KEY, p);
    } catch {
      /* ignore */
    }
    listeners.forEach((fn) => fn(p));
    setP(p);
  };
  return <Ctx.Provider value={{ persona, setPersona }}>{children}</Ctx.Provider>;
};

export function usePersona() {
  return useContext(Ctx);
}
