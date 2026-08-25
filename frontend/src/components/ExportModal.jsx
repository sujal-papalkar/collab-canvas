import React, { useState } from 'react';
import { Download, X, FileImage, Image as ImageIcon } from 'lucide-react';
import { exportCanvasImage } from '../utils/canvasExport';

export const ExportModal = ({
  isOpen,
  onClose,
  elements = [],
  backgroundColor = '#12131c',
  roomTitle = 'canvas',
  roomId,
}) => {
  const [format, setFormat] = useState('png'); // 'png' | 'jpeg' only
  const [scale, setScale] = useState(2);
  const [transparentBg, setTransparentBg] = useState(false);
  const [filename, setFilename] = useState(roomTitle.toLowerCase().replace(/[^a-z0-9]/gi, '_'));

  if (!isOpen) return null;

  const handleExport = () => {
    const safeName = filename.trim() || 'collab_canvas';

    exportCanvasImage({
      elements,
      backgroundColor,
      format,
      scale,
      includeBackground: format === 'png' ? !transparentBg : true,
      filename: safeName,
    });

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Download size={20} color="var(--accent-primary)" />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Export Artwork</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Download high-resolution image files (PNG / JPEG)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-secondary btn-icon">
            <X size={16} />
          </button>
        </div>

        {/* Format Selector: PNG & JPEG only */}
        <div style={{ marginBottom: '18px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
            SELECT FORMAT
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
              { id: 'png', label: 'PNG Image', subtitle: 'Lossless with transparency support', icon: FileImage },
              { id: 'jpeg', label: 'JPEG Image', subtitle: 'Compressed solid backdrop', icon: ImageIcon },
            ].map((f) => {
              const Icon = f.icon;
              const isSelected = format === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFormat(f.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '4px',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    border: isSelected ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'var(--transition-fast)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                    <Icon size={18} color={isSelected ? 'var(--accent-primary)' : 'currentColor'} />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: isSelected ? '#fff' : 'var(--text-primary)' }}>{f.label}</span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{f.subtitle}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
          {/* Filename */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              FILE NAME
            </label>
            <input
              type="text"
              className="input-field"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="Filename..."
            />
          </div>

          {/* Scale (for PNG / JPEG) */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              RESOLUTION SCALE
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { value: 1, label: '1x (Standard)' },
                { value: 2, label: '2x (Retina HD)' },
                { value: 3, label: '3x (Ultra HD 4K)' },
              ].map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setScale(s.value)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: 'var(--radius-md)',
                    background: scale === s.value ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.04)',
                    color: scale === s.value ? '#fff' : 'var(--text-secondary)',
                    border: '1px solid var(--border-color)',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Transparent Background Toggle for PNG */}
          {format === 'png' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px' }}>
              <input
                type="checkbox"
                checked={transparentBg}
                onChange={(e) => setTransparentBg(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
              />
              <span>Transparent Background (Exclude canvas backdrop)</span>
            </label>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={handleExport} className="btn btn-primary">
            <Download size={16} />
            <span>Download .{format.toUpperCase()}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
