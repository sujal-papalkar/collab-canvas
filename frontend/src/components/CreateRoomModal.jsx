import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Lock, Globe, Shield, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const CreateRoomModal = ({ isOpen, onClose, onRoomCreated }) => {
  const { token, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [defaultRole, setDefaultRole] = useState('editor');
  const [maxUsers, setMaxUsers] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a room title');
      return;
    }

    if (isPrivate && !password) {
      setError('Please set a password for the private room');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          isPrivate,
          password: isPrivate ? password : null,
          defaultRole,
          maxUsers,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onClose();
        if (onRoomCreated) onRoomCreated(data.room);
        navigate(`/canvas/${data.room.roomId}`);
      } else {
        setError(data.message || 'Failed to create room');
      }
    } catch (err) {
      setError('Network error while creating room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={20} color="var(--accent-primary)" />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Create Drawing Room</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Set up a shared digital workspace for real-time collaboration
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-secondary btn-icon">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '13px' }}>
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              ROOM TITLE *
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Brainstorming Session, UI Wireframe..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              DESCRIPTION (OPTIONAL)
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="Brief description of what you're creating..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Privacy Choice */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              PRIVACY SETTINGS
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setIsPrivate(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  background: !isPrivate ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                  border: !isPrivate ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  color: !isPrivate ? '#fff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                <Globe size={18} color={!isPrivate ? 'var(--accent-primary)' : 'currentColor'} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>Public Room</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Anyone with code can join</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsPrivate(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  background: isPrivate ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                  border: isPrivate ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  color: isPrivate ? '#fff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                <Lock size={18} color={isPrivate ? 'var(--accent-primary)' : 'currentColor'} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>Password Protected</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Requires password to enter</div>
                </div>
              </button>
            </div>
          </div>

          {/* Password Input (if private) */}
          {isPrivate && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                ROOM PASSWORD *
              </label>
              <input
                type="password"
                className="input-field"
                placeholder="Enter password for collaborators..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          )}

          {/* Default Role */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              DEFAULT ROLE FOR NEW MEMBERS
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setDefaultRole('editor')}
                style={{
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  background: defaultRole === 'editor' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                  border: defaultRole === 'editor' ? '1.5px solid var(--accent-emerald)' : '1px solid var(--border-color)',
                  color: defaultRole === 'editor' ? '#34d399' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                ✏️ Editor (Can Draw)
              </button>

              <button
                type="button"
                onClick={() => setDefaultRole('viewer')}
                style={{
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  background: defaultRole === 'viewer' ? 'rgba(148, 163, 184, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                  border: defaultRole === 'viewer' ? '1.5px solid #94a3b8' : '1px solid var(--border-color)',
                  color: defaultRole === 'viewer' ? '#cbd5e1' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                👁️ Viewer (Read Only)
              </button>
            </div>
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Plus size={16} />
              <span>{loading ? 'Creating...' : 'Create Room'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
