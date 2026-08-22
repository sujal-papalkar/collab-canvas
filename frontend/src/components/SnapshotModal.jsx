import React, { useState, useEffect } from 'react';
import { History, Plus, RotateCcw, X, Clock, Layers } from 'lucide-react';
import { generateSnapshotThumbnail } from '../utils/canvasExport';

export const SnapshotModal = ({
  isOpen,
  onClose,
  roomId,
  elements,
  backgroundColor,
  token,
  onRestoreSnapshot,
  currentRole,
}) => {
  const [snapshots, setSnapshots] = useState([]);
  const [snapshotName, setSnapshotName] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const isViewer = currentRole === 'viewer';

  // Load snapshots list
  const fetchSnapshots = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/canvas/${roomId}/snapshots`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        setSnapshots(data.snapshots || []);
      }
    } catch (err) {
      console.error('Error loading snapshots:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSnapshots();
    }
  }, [isOpen, roomId]);

  // Create new snapshot
  const handleCreateSnapshot = async (e) => {
    e.preventDefault();
    if (!snapshotName.trim() || isViewer) return;

    try {
      setCreating(true);
      setError('');
      const thumbnail = generateSnapshotThumbnail(elements, backgroundColor);

      const res = await fetch(`/api/canvas/${roomId}/snapshots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: snapshotName.trim(),
          thumbnail,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSnapshotName('');
        fetchSnapshots();
      } else {
        setError(data.message || 'Failed to create snapshot');
      }
    } catch (err) {
      setError('Network error while saving snapshot');
    } finally {
      setCreating(false);
    }
  };

  // Restore snapshot version
  const handleRestore = async (snapshot) => {
    if (isViewer) return;
    const confirm = window.confirm(`Restore canvas to '${snapshot.name}' (v${snapshot.version})? Current unsaved modifications will be replaced.`);
    if (!confirm) return;

    try {
      const res = await fetch(`/api/canvas/${roomId}/snapshots/${snapshot._id}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        onRestoreSnapshot(data.canvasState.elements, data.canvasState.backgroundColor);
        onClose();
      } else {
        alert(data.message || 'Failed to restore snapshot');
      }
    } catch (err) {
      alert('Error restoring snapshot');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <History size={20} color="var(--accent-primary)" />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Version History & Snapshots</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Save checkpoints and rollback canvas state at any time
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-secondary btn-icon">
            <X size={16} />
          </button>
        </div>

        {/* Create Snapshot Form */}
        {!isViewer && (
          <form onSubmit={handleCreateSnapshot} style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Name this snapshot (e.g. Initial Wireframe, Final Concept)..."
                value={snapshotName}
                onChange={(e) => setSnapshotName(e.target.value)}
                disabled={creating}
              />
              <button type="submit" className="btn btn-primary" disabled={creating || !snapshotName.trim()} style={{ whiteSpace: 'nowrap' }}>
                <Plus size={16} />
                <span>{creating ? 'Saving...' : 'Take Snapshot'}</span>
              </button>
            </div>
            {error && <div style={{ color: '#f87171', fontSize: '12px', marginTop: '6px' }}>{error}</div>}
          </form>
        )}

        {/* Snapshots Timeline List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Loading history...</div>
          ) : snapshots.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
              No snapshots saved yet. Save a snapshot above to create a version rollback point!
            </div>
          ) : (
            snapshots.map((s) => (
              <div
                key={s._id}
                className="glass-card"
                style={{
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '14px',
                }}
              >
                {/* Thumbnail */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {s.thumbnail ? (
                    <img
                      src={s.thumbnail}
                      alt={s.name}
                      style={{
                        width: '80px',
                        height: '54px',
                        borderRadius: '6px',
                        objectFit: 'cover',
                        border: '1px solid var(--border-color)',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '80px',
                        height: '54px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Layers size={20} color="var(--text-muted)" />
                    </div>
                  )}

                  {/* Info */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>{s.name}</span>
                      <span className="badge badge-primary" style={{ fontSize: '10px' }}>
                        v{s.version}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} />
                        {new Date(s.createdAt).toLocaleString()}
                      </span>
                      <span>•</span>
                      <span>{s.elements?.length || 0} objects</span>
                      {s.createdBy?.username && (
                        <>
                          <span>•</span>
                          <span>by {s.createdBy.username}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Restore Button */}
                {!isViewer && (
                  <button onClick={() => handleRestore(s)} className="btn btn-secondary" style={{ fontSize: '12px', padding: '6px 12px' }}>
                    <RotateCcw size={14} />
                    <span>Restore</span>
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
