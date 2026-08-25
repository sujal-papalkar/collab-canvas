import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Share2,
  Copy,
  Check,
  History,
  Download,
  Upload,
  Users,
  MessageSquare,
  Shield,
  Eye,
  Edit3,
  Crown,
} from 'lucide-react';

export const CanvasHeader = ({
  room,
  currentRole,
  activeUsers = [],
  onOpenSnapshots,
  onOpenExport,
  onImportImage,
  isChatOpen,
  setIsChatOpen,
  isUsersOpen,
  setIsUsersOpen,
  unreadChatCount = 0,
}) => {
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef(null);

  const isViewer = currentRole === 'viewer';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Strict validation: PNG and JPEG only
    const validMimes = ['image/png', 'image/jpeg', 'image/jpg'];
    const nameLower = file.name.toLowerCase();
    const isPngOrJpeg = validMimes.includes(file.type) || nameLower.endsWith('.png') || nameLower.endsWith('.jpg') || nameLower.endsWith('.jpeg');

    if (!isPngOrJpeg) {
      alert('Only PNG and JPEG images are supported. SVG and JSON are not allowed.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (onImportImage) onImportImage(event.target.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <header className="glass-panel floating-header">
      {/* Hidden File Input for PNG / JPEG only */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, .png, .jpg, .jpeg"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* Left: Back & Room Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <Link to="/" className="btn btn-secondary btn-icon" title="Exit to Lobby">
          <ArrowLeft size={18} />
        </Link>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '16px', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
              {room?.title || 'Collaborative Canvas'}
            </h1>

            {/* Role badge */}
            {currentRole === 'owner' && (
              <span className="badge badge-owner" title="You are the room owner">
                <Crown size={12} /> Owner
              </span>
            )}
            {currentRole === 'editor' && (
              <span className="badge badge-editor" title="You have edit access">
                <Edit3 size={12} /> Editor
              </span>
            )}
            {currentRole === 'viewer' && (
              <span className="badge badge-viewer" title="You have view-only access">
                <Eye size={12} /> Viewer
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
            <span>Room ID: <strong style={{ color: 'var(--text-secondary)' }}>{room?.roomId}</strong></span>
            <span>•</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#10b981' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} /> Live Sync
            </span>
          </div>
        </div>
      </div>

      {/* Center: Share & Collaborators Avatar Stack */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Collaborators Avatar Stack */}
        <div
          onClick={() => setIsUsersOpen(!isUsersOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-color)',
          }}
          title="Click to view all collaborators"
        >
          <div style={{ display: 'flex', marginRight: '6px' }}>
            {activeUsers.slice(0, 4).map((u, i) => (
              <div
                key={u.socketId || i}
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: u.avatarColor || '#6366f1',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: i === 0 ? 0 : '-8px',
                  border: '2px solid var(--bg-secondary)',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                }}
                title={`${u.username} (${u.role})`}
              >
                {u.username ? u.username.charAt(0).toUpperCase() : '?'}
              </div>
            ))}
          </div>

          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginRight: '4px' }}>
            {activeUsers.length} Online
          </span>
        </div>

        {/* Share / Copy link */}
        <button onClick={handleCopyLink} className="btn btn-secondary" style={{ fontSize: '12px', padding: '6px 12px' }}>
          {copied ? <Check size={14} color="#10b981" /> : <Share2 size={14} />}
          <span>{copied ? 'Copied Link!' : 'Invite / Share'}</span>
        </button>
      </div>

      {/* Right: Actions (Import Image, Snapshot, Export, Chat toggle, Users toggle) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Import Image (PNG/JPEG only) */}
        {!isViewer && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-secondary"
            title="Import PNG or JPEG image onto canvas"
          >
            <Upload size={16} />
            <span>Import Image</span>
          </button>
        )}

        {/* Version History / Snapshots */}
        <button onClick={onOpenSnapshots} className="btn btn-secondary" title="Version History & Snapshots">
          <History size={16} />
          <span>Snapshots</span>
        </button>

        {/* Export Modal trigger (PNG & JPEG only) */}
        <button onClick={onOpenExport} className="btn btn-primary" title="Export Canvas as PNG or JPEG">
          <Download size={16} />
          <span>Export</span>
        </button>

        {/* Chat Toggle */}
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`btn btn-secondary btn-icon ${isChatOpen ? 'active' : ''}`}
          style={{ position: 'relative' }}
          title="Room Chat"
        >
          <MessageSquare size={17} />
          {unreadChatCount > 0 && !isChatOpen && (
            <span
              style={{
                position: 'absolute',
                top: '-3px',
                right: '-3px',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: 'var(--accent-secondary)',
                color: '#fff',
                fontSize: '10px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {unreadChatCount}
            </span>
          )}
        </button>

        {/* Members Sidebar Toggle */}
        <button
          onClick={() => setIsUsersOpen(!isUsersOpen)}
          className={`btn btn-secondary btn-icon ${isUsersOpen ? 'active' : ''}`}
          title="Collaborators & Room Settings"
        >
          <Users size={17} />
        </button>
      </div>
    </header>
  );
};
