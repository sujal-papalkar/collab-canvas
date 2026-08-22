import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Palette, LogOut, User, Plus, Compass } from 'lucide-react';

export const Navbar = ({ onCreateRoomClick }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="glass-panel" style={{ position: 'sticky', top: 0, zIndex: 50, borderBottom: '1px solid var(--border-color)' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Brand */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(99, 102, 241, 0.4)' }}>
            <Palette size={20} color="#ffffff" />
          </div>
          <div>
            <span style={{ fontSize: '19px', fontWeight: 800, letterSpacing: '-0.03em' }} className="gradient-text">
              CollabCanvas
            </span>
          </div>
        </Link>

        {/* Navigation & User actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link to="/" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
            <Compass size={16} />
            <span>Explore Rooms</span>
          </Link>

          {isAuthenticated ? (
            <>
              <button onClick={onCreateRoomClick} className="btn btn-primary">
                <Plus size={16} />
                <span>Create Room</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '8px', borderLeft: '1px solid var(--border-color)' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: user?.avatarColor || '#6366f1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '14px',
                    color: '#fff',
                    boxShadow: `0 0 10px ${user?.avatarColor || '#6366f1'}88`,
                  }}
                  title={user?.username}
                >
                  {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {user?.username}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {user?.isGuest ? 'Guest Session' : 'Member'}
                  </span>
                </div>

                <button onClick={handleLogout} className="btn btn-secondary btn-icon" title="Logout" style={{ marginLeft: '6px' }}>
                  <LogOut size={16} />
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Link to="/login" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
                Sign In
              </Link>
              <Link to="/register" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
