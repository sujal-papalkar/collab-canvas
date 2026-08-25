import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { CreateRoomModal } from '../components/CreateRoomModal';
import { useAuth } from '../context/AuthContext';
import {
  Palette,
  Users,
  Compass,
  Plus,
  ArrowRight,
  Lock,
  Globe,
  Search,
  Sparkles,
  Zap,
  Clock,
  Layers,
  Crown,
  Eye,
  Edit3,
  Trash2,
} from 'lucide-react';

export const LobbyPage = () => {
  const { user, token, isAuthenticated, guestLogin } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('public'); // 'public' | 'my-rooms'
  const [publicRooms, setPublicRooms] = useState([]);
  const [myRooms, setMyRooms] = useState({ ownedRooms: [], joinedRooms: [] });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [joinCodeLoading, setJoinCodeLoading] = useState(false);
  const [joinCodeError, setJoinCodeError] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [showJoinPasswordModal, setShowJoinPasswordModal] = useState(null); // room object
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);

  // Fetch public rooms
  const fetchPublicRooms = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/rooms/public');
      const data = await res.json();
      if (data.success) {
        setPublicRooms(data.rooms || []);
      }
    } catch (err) {
      console.error('Error loading public rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user rooms
  const fetchMyRooms = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/rooms/my-rooms', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setMyRooms({
          ownedRooms: data.ownedRooms || [],
          joinedRooms: data.joinedRooms || [],
        });
      }
    } catch (err) {
      console.error('Error loading my rooms:', err);
    }
  };

  useEffect(() => {
    fetchPublicRooms();
    if (isAuthenticated) {
      fetchMyRooms();
    }
  }, [isAuthenticated, token]);

  const handleQuickGuest = async () => {
    try {
      setGuestLoading(true);
      await guestLogin('Guest Artist');
      setShowCreateModal(true);
    } catch (err) {
      alert('Failed to initialize guest session');
    } finally {
      setGuestLoading(false);
    }
  };

  const handleJoinByCode = async (e) => {
    e.preventDefault();
    const raw = joinRoomCode.trim();
    if (!raw) return;

    setJoinCodeError('');
    setJoinCodeLoading(true);

    const cleanCode = raw.startsWith('room-') ? raw : `room-${raw.replace(/^#/, '')}`;

    try {
      // Check room metadata
      const res = await fetch(`/api/rooms/${cleanCode}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();

      if (!res.ok || !data.success || !data.room) {
        setJoinCodeError(data.message || 'Room not found. Please check the code.');
        setJoinCodeLoading(false);
        return;
      }

      const room = data.room;

      // If room is private and user is not owner and not already a member
      if (room.isPrivate && !room.isMember && room.userRole !== 'owner') {
        setShowJoinPasswordModal(room);
        setJoinPassword('');
        setPasswordError('');
        setJoinCodeLoading(false);
        return;
      }

      // If user is not authenticated yet, initialize guest login
      if (!isAuthenticated) {
        await guestLogin('Guest Artist');
      }

      navigate(`/canvas/${room.roomId}`);
    } catch (err) {
      setJoinCodeError('Unable to connect to server. Please try again.');
    } finally {
      setJoinCodeLoading(false);
    }
  };

  const handleEnterRoom = (room) => {
    if (room.isPrivate && !room.isMember && room.userRole !== 'owner') {
      setShowJoinPasswordModal(room);
      setJoinPassword('');
      setPasswordError('');
    } else {
      navigate(`/canvas/${room.roomId}`);
    }
  };

  const handlePrivateRoomSubmit = async (e) => {
    e.preventDefault();
    if (!showJoinPasswordModal) return;

    if (!joinPassword.trim()) {
      setPasswordError('Please enter the room password.');
      return;
    }

    try {
      setPasswordLoading(true);
      setPasswordError('');

      let activeToken = token;
      if (!activeToken) {
        const guestUser = await guestLogin('Guest Artist');
        activeToken = localStorage.getItem('collab_token');
      }

      const res = await fetch(`/api/rooms/${showJoinPasswordModal.roomId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify({ password: joinPassword.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        const targetRoomId = showJoinPasswordModal.roomId;
        setShowJoinPasswordModal(null);
        navigate(`/canvas/${targetRoomId}`);
      } else {
        setPasswordError(data.message || 'Incorrect room password. Please try again.');
      }
    } catch (err) {
      setPasswordError('Failed to verify room password. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteRoom = async (roomId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to permanently delete this canvas and all its drawing history?')) return;
    try {
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        fetchPublicRooms();
        fetchMyRooms();
      } else {
        alert(data.message || 'Failed to delete room');
      }
    } catch (err) {
      alert('Error deleting room');
    }
  };

  const filteredPublicRooms = publicRooms.filter((r) =>
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.roomId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      <Navbar onCreateRoomClick={() => setShowCreateModal(true)} />

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '36px 24px 80px', width: '100%', flex: 1 }}>
        {/* Hero Section */}
        <section
          style={{
            position: 'relative',
            padding: '48px 36px',
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(236, 72, 153, 0.08) 50%, rgba(6, 182, 212, 0.08) 100%)',
            border: '1px solid var(--border-color)',
            marginBottom: '40px',
            overflow: 'hidden',
          }}
        >
          <div style={{ maxWidth: '680px', position: 'relative', zIndex: 2 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(99, 102, 241, 0.2)',
                border: '1px solid rgba(99, 102, 241, 0.4)',
                color: '#a5b4fc',
                fontSize: '12px',
                fontWeight: 600,
                marginBottom: '16px',
              }}
            >
              <Zap size={13} />
              <span>Real-Time WebSocket Canvas Engine</span>
            </div>

            <h1 style={{ fontSize: '38px', fontWeight: 800, lineHeight: 1.2, marginBottom: '14px' }}>
              Create, Draw & Collaborate in <span className="gradient-text">Real Time</span>
            </h1>

            <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '28px' }}>
              Seamless multi-user whiteboard with instantaneous stroke streaming, live cursors, version history checkpoints, permission control, and live room chat.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
              {isAuthenticated ? (
                <button onClick={() => setShowCreateModal(true)} className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '15px' }}>
                  <Plus size={18} />
                  <span>Create New Canvas</span>
                </button>
              ) : (
                <>
                  <button onClick={handleQuickGuest} disabled={guestLoading} className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '15px' }}>
                    <Sparkles size={18} />
                    <span>{guestLoading ? 'Connecting...' : 'Quick Guest Canvas'}</span>
                  </button>
                  <button onClick={() => navigate('/register')} className="btn btn-secondary" style={{ padding: '12px 20px', fontSize: '15px' }}>
                    Sign Up Free
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Join by Code bar & Search */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
          {/* Quick Join Card */}
          <form onSubmit={handleJoinByCode} className="glass-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Zap size={13} color="var(--accent-primary)" />
                  <span>JOIN VIA ROOM ID / CODE</span>
                </div>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Enter Room Code (e.g. room-abc123)..."
                  value={joinRoomCode}
                  onChange={(e) => {
                    setJoinRoomCode(e.target.value);
                    if (joinCodeError) setJoinCodeError('');
                  }}
                  style={{ padding: '8px 12px' }}
                />
              </div>
              <button
                type="submit"
                disabled={joinCodeLoading || !joinRoomCode.trim()}
                className="btn btn-primary"
                style={{ marginTop: '18px', padding: '9px 18px', opacity: joinCodeLoading ? 0.7 : 1 }}
              >
                <span>{joinCodeLoading ? 'Checking...' : 'Join'}</span>
                <ArrowRight size={15} />
              </button>
            </div>
            {joinCodeError && (
              <div style={{ fontSize: '12px', color: '#f87171', background: 'rgba(239, 68, 68, 0.12)', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                {joinCodeError}
              </div>
            )}
          </form>

          {/* Search Filter */}
          <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                SEARCH PUBLIC ROOMS
              </div>
              <div style={{ position: 'relative' }}>
                <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  className="input-field"
                  placeholder="Search by title or room ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ padding: '8px 12px 8px 36px' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Rooms Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('public')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                border: 'none',
                background: 'transparent',
                color: activeTab === 'public' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                borderBottom: activeTab === 'public' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              <Globe size={16} />
              <span>Public Rooms ({filteredPublicRooms.length})</span>
            </button>

            {isAuthenticated && (
              <button
                onClick={() => setActiveTab('my-rooms')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  border: 'none',
                  background: 'transparent',
                  color: activeTab === 'my-rooms' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  borderBottom: activeTab === 'my-rooms' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                <Crown size={16} />
                <span>My Canvases ({myRooms.ownedRooms.length + myRooms.joinedRooms.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Rooms Grid */}
        {activeTab === 'public' ? (
          loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading active rooms...</div>
          ) : filteredPublicRooms.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
              <Palette size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '18px', marginBottom: '6px' }}>No rooms found</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
                Be the first to start a collaborative canvas session!
              </p>
              <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
                <Plus size={16} />
                <span>Create a Canvas Room</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
              {filteredPublicRooms.map((room) => (
                <div key={room.roomId} className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    {/* Top row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span className="badge badge-primary" style={{ fontSize: '11px' }}>
                        {room.roomId}
                      </span>

                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--accent-emerald)', fontWeight: 600 }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-emerald)' }} />
                        {room.memberCount || 1} online
                      </span>
                    </div>

                    <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '6px' }}>
                      {room.title}
                    </h3>

                    {room.description && (
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.4 }}>
                        {room.description}
                      </p>
                    )}
                  </div>

                  {/* Footer info & Enter button */}
                  <div style={{ marginTop: '18px', paddingTop: '14px', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: room.owner?.avatarColor || '#6366f1',
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {room.owner?.username ? room.owner.username.charAt(0).toUpperCase() : 'O'}
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {room.owner?.username || 'Anonymous'}
                      </span>
                    </div>

                    <button onClick={() => handleEnterRoom(room)} className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '13px' }}>
                      <span>Enter</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* My Rooms View */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            {/* Owned Rooms */}
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Crown size={16} color="#fbbf24" /> Created by You ({myRooms.ownedRooms.length})
              </h3>
              {myRooms.ownedRooms.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>You haven't created any rooms yet.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
                  {myRooms.ownedRooms.map((r) => (
                    <div key={r.roomId} className="glass-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span className="badge badge-owner">Owner</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.roomId}</span>
                        </div>
                        <h4 style={{ fontSize: '16px', fontWeight: 700 }}>{r.title}</h4>
                      </div>
                      <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <button
                          onClick={(e) => handleDeleteRoom(r.roomId, e)}
                          className="btn btn-danger"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          title="Delete Canvas"
                        >
                          <Trash2 size={14} />
                          <span>Delete</span>
                        </button>
                        <button onClick={() => navigate(`/canvas/${r.roomId}`)} className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '13px' }}>
                          Open Canvas
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Joined Rooms */}
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={16} color="var(--accent-primary)" /> Joined Canvases ({myRooms.joinedRooms.length})
              </h3>
              {myRooms.joinedRooms.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No joined canvases yet.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
                  {myRooms.joinedRooms.map((r) => (
                    <div key={r.roomId} className="glass-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span className="badge badge-editor">Member</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.roomId}</span>
                        </div>
                        <h4 style={{ fontSize: '16px', fontWeight: 700 }}>{r.title}</h4>
                      </div>
                      <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={() => navigate(`/canvas/${r.roomId}`)} className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '13px' }}>
                          Open Canvas
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onRoomCreated={() => {
          fetchPublicRooms();
          fetchMyRooms();
        }}
      />

      {/* Private Room Password Prompt Modal */}
      {showJoinPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowJoinPasswordModal(null)}>
          <div className="modal-content" style={{ maxWidth: '420px', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(236, 72, 153, 0.15)', border: '1px solid rgba(236, 72, 153, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Lock size={20} color="var(--accent-secondary)" />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Password Protected Canvas</h3>
                <span className="badge badge-primary" style={{ fontSize: '11px', marginTop: '2px' }}>
                  {showJoinPasswordModal.roomId}
                </span>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
              This canvas <strong style={{ color: '#fff' }}>"{showJoinPasswordModal.title}"</strong> is private. Please enter the room password to join.
            </p>

            {passwordError && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '13px', marginBottom: '14px' }}>
                {passwordError}
              </div>
            )}

            <form onSubmit={handlePrivateRoomSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  ROOM PASSWORD
                </label>
                <input
                  type="password"
                  autoFocus
                  className="input-field"
                  placeholder="Enter password..."
                  value={joinPassword}
                  onChange={(e) => {
                    setJoinPassword(e.target.value);
                    if (passwordError) setPasswordError('');
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowJoinPasswordModal(null)}
                  className="btn btn-secondary"
                  disabled={passwordLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={passwordLoading || !joinPassword.trim()}
                  style={{ opacity: passwordLoading ? 0.7 : 1 }}
                >
                  <Lock size={14} />
                  <span>{passwordLoading ? 'Verifying...' : 'Unlock & Enter'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
