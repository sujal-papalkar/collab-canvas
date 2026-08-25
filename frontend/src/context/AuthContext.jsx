import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('collab_token') || null);
  const [loading, setLoading] = useState(true);

  // Initialize and verify stored token
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('collab_token');
      const storedUser = localStorage.getItem('collab_user');

      if (storedToken && storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          setToken(storedToken);
          // Verify with backend
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${storedToken}` },
          });
          const data = await res.json();
          if (data.success && data.user) {
            setUser(data.user);
            localStorage.setItem('collab_user', JSON.stringify(data.user));
          } else {
            // Token expired
            logout();
          }
        } catch (err) {
          console.warn('Auth token verification skipped or offline:', err);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || 'Login failed');
    }

    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('collab_token', data.token);
    localStorage.setItem('collab_user', JSON.stringify(data.user));
    return data.user;
  };

  const register = async (username, email, password) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || 'Registration failed');
    }

    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('collab_token', data.token);
    localStorage.setItem('collab_user', JSON.stringify(data.user));
    return data.user;
  };

  const guestLogin = async (nickname) => {
    const res = await fetch('/api/auth/guest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname }),
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || 'Guest login failed');
    }

    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('collab_token', data.token);
    localStorage.setItem('collab_user', JSON.stringify(data.user));
    return data.user;
  };

  const logout = async () => {
    const currentToken = token || localStorage.getItem('collab_token');
    const currentUser = user || (localStorage.getItem('collab_user') ? JSON.parse(localStorage.getItem('collab_user')) : null);

    if (currentToken && currentUser?.isGuest) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentToken}`,
          },
        });
      } catch (e) {
        console.warn('Logout server notification error:', e);
      }
    }

    setToken(null);
    setUser(null);
    localStorage.removeItem('collab_token');
    localStorage.removeItem('collab_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        guestLogin,
        logout,
        isAuthenticated: !!token && !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
