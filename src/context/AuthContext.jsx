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
      const payload = parseJwtPayload(token);
      if (payload) {
        setUser((prev) => {
          const orgId =
            prev?.organizationId ||
            prev?.orgId ||
            payload.organizationId ||
            payload.orgId ||
            payload.organization ||
            payload.org ||
            '';
          return {
            id: prev?.id || payload.userId || payload.sub || payload.id,
            email: prev?.email || payload.sub || payload.email || 'user@tally.com',
            roles: prev?.roles || payload.role || role,
            firstName: prev?.firstName || payload.firstName || '',
            lastName: prev?.lastName || payload.lastName || '',
            ...prev,
            organizationId: orgId,
          };
        });
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

  const updateUser = (fields) => {
    setUser((prev) => {
      const next = { ...(prev || {}), ...fields };
      localStorage.setItem('tally_auth_user', JSON.stringify(next));
      return next;
    });
  };

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
          roles: newRole,
          organizationId: payload.organizationId || payload.orgId || payload.organization || ''
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
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        role,
        user,
        isAuthenticated: !!token,
        login,
        logout,
        updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
