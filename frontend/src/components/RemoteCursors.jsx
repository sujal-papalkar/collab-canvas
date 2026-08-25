import React from 'react';
import {
  MousePointer,
  Pencil,
  Highlighter,
  Eraser,
  Type,
  Square,
  Sparkles,
} from 'lucide-react';

export const RemoteCursors = ({ remoteCursors = {}, worldToScreen }) => {
  const cursorsList = Object.values(remoteCursors);

  const getToolIcon = (tool) => {
    switch (tool) {
      case 'pencil':
      case 'brush':
        return <Pencil size={11} color="#fff" />;
      case 'highlighter':
        return <Highlighter size={11} color="#fff" />;
      case 'eraser':
        return <Eraser size={11} color="#fff" />;
      case 'text':
        return <Type size={11} color="#fff" />;
      case 'laser':
        return <Sparkles size={11} color="#f43f5e" />;
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 30,
      }}
    >
      {cursorsList.map((c) => {
        if (c.x === undefined || c.y === undefined || c.x === null || c.y === null) return null;
        const screenPos = worldToScreen(c.x, c.y);

        // Don't render if outside window viewport
        if (
          screenPos.x < -50 ||
          screenPos.y < -50 ||
          screenPos.x > window.innerWidth + 50 ||
          screenPos.y > window.innerHeight + 50
        ) {
          return null;
        }

        const color = c.avatarColor || '#6366f1';

        return (
          <div
            key={c.socketId || c.userId}
            style={{
              position: 'absolute',
              left: `${screenPos.x}px`,
              top: `${screenPos.y}px`,
              transform: 'translate(-2px, -2px)',
              transition: 'left 0.08s linear, top 0.08s linear',
              display: 'flex',
              flexDirection: 'column',
              pointerEvents: 'none',
            }}
          >
            {/* Pointer SVG Icon with collaborator color */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill={color}
              stroke="#ffffff"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.5))',
                transform: 'rotate(-20deg)',
              }}
            >
              <polygon points="3 3 10 21 14 13 22 10 3 3" />
            </svg>

            {/* Username and tool badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: color,
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: '6px',
                marginLeft: '12px',
                marginTop: '-4px',
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
              }}
            >
              {getToolIcon(c.tool)}
              <span>{c.username || 'Collaborator'}</span>
              {c.isDrawing && (
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    display: 'inline-block',
                    animation: 'pulse 1s infinite',
                  }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
