import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ loading: true, user: null, school: null, modules: [] });

  const refresh = useCallback(async () => {
    if (!localStorage.getItem('rny_token')) return setState({ loading: false, user: null, school: null, modules: [] });
    try {
      const { data } = await api.get('/auth/me');
      setState({ loading: false, ...data });
    } catch {
      localStorage.removeItem('rny_token');
      setState({ loading: false, user: null, school: null, modules: [] });
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = async (email, password, school) => {
    const { data } = await api.post('/auth/login', { email, password, school });
    localStorage.setItem('rny_token', data.token);
    localStorage.removeItem('rny_act_school');
    await refresh();
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('rny_token');
    localStorage.removeItem('rny_act_school');
    setState({ loading: false, user: null, school: null, modules: [] });
  };

  /** Super admin: operate inside a tenant */
  const actAsSchool = async (schoolId) => {
    if (schoolId) localStorage.setItem('rny_act_school', schoolId);
    else localStorage.removeItem('rny_act_school');
    await refresh();
  };

  const has = (mod) => !mod || state.user?.role === 'SUPER_ADMIN' || state.modules.includes(mod);
  const is = (...roles) => !!state.user && (roles.flat().includes(state.user.role) || state.user.role === 'SUPER_ADMIN');

  return <AuthCtx.Provider value={{ ...state, login, logout, refresh, actAsSchool, has, is }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);

export const homeFor = (user, school) => {
  if (!user) return '/login';
  if (user.role === 'SUPER_ADMIN' && !school) return '/platform';
  if (user.role === 'PARENT' || user.role === 'STUDENT') return '/app/portal';
  if (user.role === 'TEACHER') return '/app/teacher';
  return '/app';
};
