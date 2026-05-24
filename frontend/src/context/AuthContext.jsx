import { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

const isJwtExpired = (token) => {
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return true;

    const payloadJson = atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson);

    // exp is in seconds
    if (!payload?.exp) return false; // if no exp, treat as not expired
    const now = Math.floor(Date.now() / 1000);
    return payload.exp <= now;
  } catch (e) {
    return true; // if cannot decode => treat as expired/invalid
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (!stored) {
        setUser(null);
        return;
      }

      const parsed = JSON.parse(stored);

      // ✅ must have token + role
      if (!parsed?.token || !parsed?.role) {
        localStorage.removeItem('user');
        setUser(null);
        return;
      }

      // ✅ token expired => logout automatically
      if (isJwtExpired(parsed.token)) {
        localStorage.removeItem('user');
        setUser(null);
        return;
      }

      setUser(parsed);
    } catch (e) {
      localStorage.removeItem('user');
      setUser(null);
    }
  }, []);

  const login = (data) => {
    if (!data?.token || !data?.role) {
      setUser(null);
      localStorage.removeItem('user');
      return;
    }

    // ✅ if token already expired (rare) do not store
    if (isJwtExpired(data.token)) {
      setUser(null);
      localStorage.removeItem('user');
      return;
    }

    setUser(data);
    localStorage.setItem('user', JSON.stringify(data));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
};