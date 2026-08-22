import React, { useState } from 'react';
import {
  Undo2,
  Redo2,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid,
  Magnet,
  Trash,
  Palette,
} from 'lucide-react';

const BG_COLORS = [
  { label: 'Dark Navy', value: '#12131c' },
  { label: 'Cyber Black', value: '#0a0a0f' },
  { label: 'Deep Blue', value: '#0f172a' },
  { label: 'Clean Slate', value: '#1e293b' },
  { label: 'Light Studio', value: '#f8fafc' },
];

export const CanvasBottomBar = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onUndo,
  onRedo,
  undoCount,
  redoCount,
  onClear,
  selectedCount,
  onDeleteSelected,
  gridType,
  setGridType,
  snapToGrid,
  setSnapToGrid,
  backgroundColor,
  setBackgroundColor,
  currentRole,
}) => {
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const isViewer = currentRole === 'viewer';

  const toggleGrid = () => {
    if (gridType === 'dots') setGridType('grid');
    else if (gridType === 'grid') setGridType('none');
    else setGridType('dots');
  };

  return (
    <>
      <div className="glass-panel floating-bottom">
        {/* Undo / Redo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            className="tool-btn"
            onClick={onUndo}
            disabled={undoCount === 0 || isViewer}
            style={{ opacity: undoCount === 0 || isViewer ? 0.35 : 1 }}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={16} />
          </button>
          <button
            className="tool-btn"
            onClick={onRedo}
            disabled={redoCount === 0 || isViewer}
            style={{ opacity: redoCount === 0 || isViewer ? 0.35 : 1 }}
            title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
          >
            <Redo2 size={16} />
          </button>
        </div>

        {/* Delete selected */}
        {selectedCount > 0 && !isViewer && (
          <button
            className="tool-btn"
            onClick={onDeleteSelected}
            style={{ color: '#f87171' }}
            title={`Delete ${selectedCount} selected element(s) (Del / Backspace)`}
          >
            <Trash2 size={16} />
          </button>
        )}

        <div style={{ width: '1px', height: '22px', background: 'var(--border-color)', margin: '0 4px' }} />

        {/* Zoom Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button className="tool-btn" onClick={onZoomOut} title="Zoom Out (-)">
            <ZoomOut size={16} />
          </button>
          <button
            onClick={onResetZoom}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              minWidth: '48px',
            }}
            title="Reset Zoom to 100%"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button className="tool-btn" onClick={onZoomIn} title="Zoom In (+)">
            <ZoomIn size={16} />
          </button>
        </div>

        <div style={{ width: '1px', height: '22px', background: 'var(--border-color)', margin: '0 4px' }} />

        {/* Grid toggle */}
        <button
          className={`tool-btn ${gridType !== 'none' ? 'active' : ''}`}
          onClick={toggleGrid}
          title={`Grid style: ${gridType} (Click to toggle)`}
        >
          <Grid size={16} />
        </button>

        {/* Snap to grid */}
        <button
          className={`tool-btn ${snapToGrid ? 'active' : ''}`}
          onClick={() => setSnapToGrid(!snapToGrid)}
          title="Snap to Grid"
        >
          <Magnet size={16} />
        </button>

        {/* Background Color Picker Toggle */}
        <div style={{ position: 'relative' }}>
          <button
            className={`tool-btn ${showBgPicker ? 'active' : ''}`}
            onClick={() => setShowBgPicker(!showBgPicker)}
            disabled={isViewer}
            style={{ opacity: isViewer ? 0.4 : 1 }}
            title="Canvas Background Color"
          >
            <Palette size={16} />
          </button>

          {showBgPicker && (
            <div
              className="glass-panel"
              style={{
                position: 'absolute',
                bottom: '48px',
                left: '50%',
                transform: 'translateX(-50%)',
                padding: '8px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                gap: '6px',
                zIndex: 60,
              }}
            >
              {BG_COLORS.map((bg) => (
                <button
                  key={bg.value}
                  onClick={() => {
                    setBackgroundColor(bg.value);
                    setShowBgPicker(false);
                  }}
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '6px',
                    background: bg.value,
                    border: backgroundColor === bg.value ? '2px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.2)',
                    cursor: 'pointer',
                  }}
                  title={bg.label}
                />
              ))}
            </div>
          )}
        </div>

        {/* Clear Canvas */}
        {!isViewer && (
          <button
            className="tool-btn"
            onClick={() => setShowClearConfirm(true)}
            style={{ color: '#f87171' }}
            title="Clear Canvas"
          >
            <Trash size={16} />
          </button>
        )}
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '380px', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Trash2 size={24} color="#f87171" />
            </div>
            <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Clear entire canvas?</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              This will remove all drawings and shapes for everyone in this room. You can undo this action with Ctrl+Z.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={() => setShowClearConfirm(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                Cancel
              </button>
              <button
                onClick={() => {
                  onClear();
                  setShowClearConfirm(false);
                }}
                className="btn btn-danger"
                style={{ flex: 1 }}
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
