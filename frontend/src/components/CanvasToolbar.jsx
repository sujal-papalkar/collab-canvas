import React, { useState } from 'react';
import {
  MousePointer,
  Hand,
  Pencil,
  Highlighter,
  Square,
  Circle,
  Triangle,
  Star,
  Minus,
  ArrowRight,
  Type,
  StickyNote,
  Eraser,
  Sparkles,
  ChevronRight,
  Sliders,
} from 'lucide-react';

const PRESET_COLORS = [
  '#ffffff', '#6366f1', '#ec4899', '#3b82f6', '#06b6d4',
  '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#000000',
];

const STICKY_COLORS = [
  '#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#fed7aa', '#ddd6fe',
];

export const CanvasToolbar = ({
  activeTool,
  setActiveTool,
  strokeColor,
  setStrokeColor,
  fillColor,
  setFillColor,
  strokeWidth,
  setStrokeWidth,
  strokeStyle,
  setStrokeStyle,
  opacity,
  setOpacity,
  fontSize,
  setFontSize,
  eraserSize = 20,
  setEraserSize,
  currentRole,
}) => {
  const [showShapeMenu, setShowShapeMenu] = useState(false);
  const [showStylePanel, setShowStylePanel] = useState(false);

  const isViewer = currentRole === 'viewer';

  const shapes = [
    { id: 'rectangle', icon: Square, label: 'Rectangle (R)' },
    { id: 'circle', icon: Circle, label: 'Circle (O)' },
    { id: 'triangle', icon: Triangle, label: 'Triangle' },
    { id: 'star', icon: Star, label: 'Star' },
    { id: 'line', icon: Minus, label: 'Line (L)' },
    { id: 'arrow', icon: ArrowRight, label: 'Arrow (A)' },
  ];

  const handleToolSelect = (tool) => {
    if (isViewer && tool !== 'hand' && tool !== 'select') return;
    setActiveTool(tool);
    setShowShapeMenu(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Main vertical tool strip */}
      <div className="glass-panel floating-tools">
        {/* Pointer / Select */}
        <button
          className={`tool-btn ${activeTool === 'select' ? 'active' : ''}`}
          onClick={() => handleToolSelect('select')}
          data-tooltip="Select / Transform (V)"
        >
          <MousePointer size={18} />
        </button>

        {/* Hand / Pan */}
        <button
          className={`tool-btn ${activeTool === 'hand' ? 'active' : ''}`}
          onClick={() => handleToolSelect('hand')}
          data-tooltip="Pan Canvas (H / Space)"
        >
          <Hand size={18} />
        </button>

        <div style={{ height: '1px', background: 'var(--border-color)', margin: '3px 0' }} />

        {/* Pencil / Brush */}
        <button
          className={`tool-btn ${activeTool === 'pencil' ? 'active' : ''}`}
          onClick={() => handleToolSelect('pencil')}
          disabled={isViewer}
          style={{ opacity: isViewer ? 0.4 : 1 }}
          data-tooltip="Pencil / Brush (P)"
        >
          <Pencil size={18} />
        </button>

        {/* Highlighter */}
        <button
          className={`tool-btn ${activeTool === 'highlighter' ? 'active' : ''}`}
          onClick={() => handleToolSelect('highlighter')}
          disabled={isViewer}
          style={{ opacity: isViewer ? 0.4 : 1 }}
          data-tooltip="Highlighter (B)"
        >
          <Highlighter size={18} />
        </button>

        {/* Shapes Menu Trigger */}
        <div style={{ position: 'relative' }}>
          <button
            className={`tool-btn ${['rectangle', 'rounded-rect', 'circle', 'triangle', 'star', 'line', 'arrow'].includes(activeTool) ? 'active' : ''}`}
            onClick={() => setShowShapeMenu(!showShapeMenu)}
            disabled={isViewer}
            style={{ opacity: isViewer ? 0.4 : 1 }}
            data-tooltip="Shapes"
          >
            <Square size={18} />
          </button>

          {/* Shape Flyout Submenu */}
          {showShapeMenu && !isViewer && (
            <div
              className="glass-panel"
              style={{
                position: 'absolute',
                left: '48px',
                top: '0',
                display: 'flex',
                gap: '4px',
                padding: '6px',
                borderRadius: 'var(--radius-md)',
                zIndex: 60,
              }}
            >
              {shapes.map((s) => {
                const IconComponent = s.icon;
                return (
                  <button
                    key={s.id}
                    className={`tool-btn ${activeTool === s.id ? 'active' : ''}`}
                    onClick={() => handleToolSelect(s.id)}
                    title={s.label}
                  >
                    <IconComponent size={18} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Text */}
        <button
          className={`tool-btn ${activeTool === 'text' ? 'active' : ''}`}
          onClick={() => handleToolSelect('text')}
          disabled={isViewer}
          style={{ opacity: isViewer ? 0.4 : 1 }}
          data-tooltip="Text (T)"
        >
          <Type size={18} />
        </button>

        {/* Sticky Note */}
        <button
          className={`tool-btn ${activeTool === 'sticky' ? 'active' : ''}`}
          onClick={() => handleToolSelect('sticky')}
          disabled={isViewer}
          style={{ opacity: isViewer ? 0.4 : 1 }}
          data-tooltip="Sticky Note (S)"
        >
          <StickyNote size={18} />
        </button>

        {/* Eraser */}
        <button
          className={`tool-btn ${activeTool === 'eraser' ? 'active' : ''}`}
          onClick={() => handleToolSelect('eraser')}
          disabled={isViewer}
          style={{ opacity: isViewer ? 0.4 : 1 }}
          data-tooltip="Eraser (E)"
        >
          <Eraser size={18} />
        </button>

        {/* Laser Presentation Pointer */}
        <button
          className={`tool-btn ${activeTool === 'laser' ? 'active' : ''}`}
          onClick={() => handleToolSelect('laser')}
          data-tooltip="Laser Pointer (L)"
        >
          <Sparkles size={18} color="#f43f5e" />
        </button>

        <div style={{ height: '1px', background: 'var(--border-color)', margin: '3px 0' }} />

        {/* Style Panel Toggle */}
        <button
          className={`tool-btn ${showStylePanel ? 'active' : ''}`}
          onClick={() => setShowStylePanel(!showStylePanel)}
          disabled={isViewer}
          style={{ opacity: isViewer ? 0.4 : 1 }}
          data-tooltip="Style Controls"
        >
          <div
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              backgroundColor: strokeColor,
              border: '2px solid #fff',
              boxShadow: '0 0 8px rgba(0,0,0,0.5)',
            }}
          />
        </button>
      </div>

      {/* Floating Style Controls Flyout Panel */}
      {showStylePanel && !isViewer && (
        <div
          className="glass-panel"
          style={{
            position: 'absolute',
            top: '84px',
            left: '68px',
            width: '230px',
            padding: '14px',
            borderRadius: 'var(--radius-md)',
            zIndex: 60,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* Eraser Size Controls */}
          {activeTool === 'eraser' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                <span>ERASER RADIUS</span>
                <span style={{ color: 'var(--accent-rose)' }}>{eraserSize}px</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginTop: '6px', marginBottom: '8px' }}>
                {[
                  { label: 'Small', size: 10 },
                  { label: 'Medium', size: 20 },
                  { label: 'Large', size: 36 },
                ].map(({ label, size }) => (
                  <button
                    key={size}
                    onClick={() => setEraserSize && setEraserSize(size)}
                    style={{
                      padding: '5px 4px',
                      borderRadius: '6px',
                      background: eraserSize === size ? 'var(--accent-rose)' : 'rgba(255,255,255,0.06)',
                      color: eraserSize === size ? '#fff' : 'var(--text-secondary)',
                      border: '1px solid var(--border-color)',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <input
                type="range"
                min="6"
                max="60"
                value={eraserSize}
                onChange={(e) => setEraserSize && setEraserSize(parseInt(e.target.value, 10))}
                style={{ width: '100%', accentColor: 'var(--accent-rose)', cursor: 'pointer' }}
              />
            </div>
          )}

          {/* Stroke Color */}
          {activeTool !== 'eraser' && (
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Stroke Color
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', marginTop: '6px' }}>
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setStrokeColor(c)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    background: c,
                    border: strokeColor === c ? '2px solid #fff' : '1px solid rgba(255,255,255,0.15)',
                    cursor: 'pointer',
                    boxShadow: strokeColor === c ? '0 0 10px rgba(99,102,241,0.6)' : 'none',
                  }}
                />
              ))}
            </div>
            {/* Custom HEX Input */}
            <input
              type="color"
              value={strokeColor}
              onChange={(e) => setStrokeColor(e.target.value)}
              style={{
                width: '100%',
                height: '28px',
                marginTop: '6px',
                padding: '2px',
                borderRadius: '6px',
                background: 'transparent',
                border: '1px solid var(--border-color)',
                cursor: 'pointer',
              }}
            />
          </div>
          )}

          {/* Fill Color for Shapes & Sticky */}
          {['rectangle', 'rounded-rect', 'circle', 'triangle', 'star', 'sticky'].includes(activeTool) && (
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Fill Color
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginTop: '6px' }}>
                <button
                  onClick={() => setFillColor('transparent')}
                  style={{
                    height: '26px',
                    borderRadius: '6px',
                    background: 'transparent',
                    border: fillColor === 'transparent' ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    fontSize: '10px',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  None
                </button>
                {(activeTool === 'sticky' ? STICKY_COLORS : PRESET_COLORS.slice(0, 3)).map((c) => (
                  <button
                    key={c}
                    onClick={() => setFillColor(c)}
                    style={{
                      height: '26px',
                      borderRadius: '6px',
                      background: c,
                      border: fillColor === c ? '2px solid #fff' : '1px solid rgba(255,255,255,0.15)',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Stroke Width & Style */}
          {activeTool !== 'eraser' && (
            <>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  <span>STROKE WIDTH</span>
                  <span>{strokeWidth}px</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="24"
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(parseInt(e.target.value, 10))}
                  style={{ width: '100%', marginTop: '6px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Stroke Style
                </label>
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                  {['solid', 'dashed', 'dotted'].map((style) => (
                    <button
                      key={style}
                      onClick={() => setStrokeStyle(style)}
                      style={{
                        flex: 1,
                        padding: '4px',
                        borderRadius: '6px',
                        background: strokeStyle === style ? 'var(--accent-primary)' : 'rgba(255,255,255,0.06)',
                        color: strokeStyle === style ? '#fff' : 'var(--text-secondary)',
                        border: '1px solid var(--border-color)',
                        fontSize: '11px',
                        textTransform: 'capitalize',
                        cursor: 'pointer',
                      }}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  <span>OPACITY</span>
                  <span>{Math.round(opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={opacity}
                  onChange={(e) => setOpacity(parseFloat(e.target.value))}
                  style={{ width: '100%', marginTop: '6px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                />
              </div>
            </>
          )}

          {/* Font Size for Text */}
          {activeTool === 'text' && (
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Font Size
              </label>
              <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                {[16, 24, 32, 48].map((size) => (
                  <button
                    key={size}
                    onClick={() => setFontSize(size)}
                    style={{
                      flex: 1,
                      padding: '4px',
                      borderRadius: '6px',
                      background: fontSize === size ? 'var(--accent-primary)' : 'rgba(255,255,255,0.06)',
                      color: fontSize === size ? '#fff' : 'var(--text-secondary)',
                      border: '1px solid var(--border-color)',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
