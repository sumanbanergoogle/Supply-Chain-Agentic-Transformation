import React, { createContext, useContext, useState } from 'react';

export type Persona = 'VP_TMD' | 'BRANCH_MANAGER' | 'FIELD_SO';

const STORAGE_KEY = 'beatpulse.persona';

export const PERSONA_LIST: { id: Persona; label: string }[] = [
  { id: 'VP_TMD', label: 'VP TM&D' },
  { id: 'BRANCH_MANAGER', label: 'Branch Mgr' },
  { id: 'FIELD_SO', label: 'Sales Officer' },
];

let currentPersona: Persona = (() => {
  try {
    const v = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (v === 'VP_TMD' || v === 'BRANCH_MANAGER' || v === 'FIELD_SO') return v;
  } catch {
    /* ignore */
  }
  return 'VP_TMD';
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
  persona: 'VP_TMD',
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
