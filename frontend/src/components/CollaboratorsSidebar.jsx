import React from 'react';
import { Users, X, Crown, Shield, Eye, Edit3, UserMinus } from 'lucide-react';

export const CollaboratorsSidebar = ({
  isOpen,
  onClose,
  activeUsers = [],
  pendingRequests = [],
  currentUserId,
  isOwner,
  onUpdateRole,
  onKickUser,
  onApproveRequest,
  onDenyRequest,
  room,
}) => {
  if (!isOpen) return null;

  return (
    <div className="glass-panel floating-sidebar">
      {/* Header */}
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={18} color="var(--accent-primary)" />
          <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Collaborators ({activeUsers.length})</h3>
        </div>
        <button onClick={onClose} className="btn btn-secondary btn-icon" style={{ width: '28px', height: '28px' }}>
          <X size={15} />
        </button>
      </div>

      {/* User list */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {/* Pending Join Requests (Owner only) */}
        {isOwner && pendingRequests.length > 0 && (
          <div style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--accent-secondary)', animation: 'pulse 1.5s infinite' }} />
                Pending Join Requests ({pendingRequests.length})
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {pendingRequests.map((req) => (
                <div
                  key={req.userId || req.socketId}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(236, 72, 153, 0.08)',
                    border: '1px solid rgba(236, 72, 153, 0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: req.avatarColor || '#6366f1',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {req.username?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {req.username}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {req.isGuest ? 'Guest user' : 'Registered user'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => onApproveRequest && onApproveRequest(req.userId, 'editor')}
                      className="btn btn-primary"
                      style={{ flex: 1, padding: '5px 8px', fontSize: '11px', background: 'linear-gradient(135deg, #10b981, #059669)' }}
                      title="Admit with drawing permission"
                    >
                      Allow (Editor)
                    </button>
                    <button
                      onClick={() => onApproveRequest && onApproveRequest(req.userId, 'viewer')}
                      className="btn btn-secondary"
                      style={{ padding: '5px 8px', fontSize: '11px' }}
                      title="Admit as read-only viewer"
                    >
                      Viewer
                    </button>
                    <button
                      onClick={() => onDenyRequest && onDenyRequest(req.userId)}
                      className="btn btn-danger btn-icon"
                      style={{ width: '28px', height: '28px' }}
                      title="Decline request"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ height: '1px', background: 'var(--border-color)', margin: '14px 0' }} />
          </div>
        )}
        {activeUsers.map((u) => {
          const isMe = u.userId === currentUserId;
          const userIsOwner = u.role === 'owner';

          return (
            <div
              key={u.socketId || u.userId}
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    position: 'relative',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: u.avatarColor || '#6366f1',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {u.username ? u.username.charAt(0).toUpperCase() : '?'}
                  {/* Online green indicator */}
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#10b981',
                      border: '1.5px solid var(--bg-secondary)',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>
                      {u.username} {isMe && '(You)'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    {userIsOwner ? (
                      <span className="badge badge-owner" style={{ fontSize: '10px', padding: '1px 6px' }}>
                        <Crown size={10} /> Owner
                      </span>
                    ) : u.role === 'editor' ? (
                      <span className="badge badge-editor" style={{ fontSize: '10px', padding: '1px 6px' }}>
                        <Edit3 size={10} /> Editor
                      </span>
                    ) : (
                      <span className="badge badge-viewer" style={{ fontSize: '10px', padding: '1px 6px' }}>
                        <Eye size={10} /> Viewer
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Owner Administration Controls for other members */}
              {isOwner && !isMe && !userIsOwner && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {/* Toggle Role */}
                  <button
                    onClick={() => onUpdateRole(u.userId, u.role === 'editor' ? 'viewer' : 'editor')}
                    className="btn btn-secondary"
                    style={{ padding: '4px 8px', fontSize: '11px' }}
                    title={u.role === 'editor' ? 'Demote to Viewer' : 'Promote to Editor'}
                  >
                    {u.role === 'editor' ? 'Make Viewer' : 'Make Editor'}
                  </button>

                  {/* Kick member */}
                  <button
                    onClick={() => onKickUser(u.userId)}
                    className="btn btn-danger btn-icon"
                    style={{ width: '28px', height: '28px' }}
                    title="Remove user from room"
                  >
                    <UserMinus size={13} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Room info footer */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--border-color)',
          fontSize: '12px',
          color: 'var(--text-muted)',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>Default Role: <strong style={{ color: 'var(--text-secondary)' }}>{room?.defaultRole || 'editor'}</strong></span>
        <span>Max: {room?.maxUsers || 20}</span>
      </div>
    </div>
  );
};
