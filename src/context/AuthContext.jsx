import React, { createContext, useContext, useState, useEffect } from 'react';
import { parseJwtPayload } from '../utils/formatters';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('tally_auth_token') || '');
  const [role, setRole] = useState(() => localStorage.getItem('tally_auth_role') || '');
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('tally_auth_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  useEffect(() => {
    if (token) {
      localStorage.setItem('tally_auth_token', token);
      if (!user) {
        const payload = parseJwtPayload(token);
        if (payload) {
          const userObj = {
            id: payload.userId || payload.sub,
            email: payload.sub || 'user@tally.com',
            roles: payload.role || role
          };
          setUser(userObj);
        }
      }
    } else {
      localStorage.removeItem('tally_auth_token');
    }
  }, [token]);

  useEffect(() => {
    if (role) {
      localStorage.setItem('tally_auth_role', role);
    } else {
      localStorage.removeItem('tally_auth_role');
    }
  }, [role]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('tally_auth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('tally_auth_user');
    }
  }, [user]);

  const login = (newToken, newRole, userObj = null) => {
    setToken(newToken);
    setRole(newRole);
    if (userObj) {
      setUser(userObj);
    } else {
      const payload = parseJwtPayload(newToken);
      if (payload) {
        setUser({
          id: payload.userId || payload.sub,
          email: payload.sub || 'user@tally.com',
          roles: newRole
        });
      }
    }
  };

  const logout = () => {
    setToken('');
    setRole('');
    setUser(null);
    localStorage.removeItem('tally_auth_token');
    localStorage.removeItem('tally_auth_role');
    localStorage.removeItem('tally_auth_user');
    localStorage.removeItem('tally_use_mock');
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        role,
        user,
        isAuthenticated: !!token,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
