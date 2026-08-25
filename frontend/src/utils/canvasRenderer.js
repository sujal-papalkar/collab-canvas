// Canvas Rendering Engine and Geometry Utilities

// Image cache for rendering imported PNG/JPEG images without reloading each frame
const imageCache = new Map();

export const getImageFromCache = (src) => {
  if (!src) return null;
  if (imageCache.has(src)) return imageCache.get(src);
  const img = new Image();
  img.src = src;
  imageCache.set(src, img);
  return img;
};

// Helper to compute bounding box for any element
export const getElementBounds = (el) => {
  if (['pencil', 'brush', 'highlighter'].includes(el.type)) {
    if (!el.points || el.points.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of el.points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    const pad = (el.strokeWidth || 4) / 2;
    return {
      minX: minX - pad,
      minY: minY - pad,
      maxX: maxX + pad,
      maxY: maxY + pad,
      width: Math.max(20, maxX - minX + pad * 2),
      height: Math.max(20, maxY - minY + pad * 2),
    };
  }

  if (['line', 'arrow'].includes(el.type)) {
    const minX = Math.min(el.x1 || 0, el.x2 || 0);
    const minY = Math.min(el.y1 || 0, el.y2 || 0);
    const maxX = Math.max(el.x1 || 0, el.x2 || 0);
    const maxY = Math.max(el.y1 || 0, el.y2 || 0);
    const pad = (el.strokeWidth || 4) / 2 + 5;
    return {
      minX: minX - pad,
      minY: minY - pad,
      maxX: maxX + pad,
      maxY: maxY + pad,
      width: Math.max(20, maxX - minX + pad * 2),
      height: Math.max(20, maxY - minY + pad * 2),
    };
  }

  // Rectangles, Circles, Triangles, Stars, Text, Sticky
  const x = el.x || 0;
  const y = el.y || 0;
  const width = el.width || 50;
  const height = el.height || 50;
  return {
    minX: width < 0 ? x + width : x,
    minY: height < 0 ? y + height : y,
    maxX: width < 0 ? x : x + width,
    maxY: height < 0 ? y : y + height,
    width: Math.abs(width),
    height: Math.abs(height),
  };
};

// Hit test to see if point (px, py) is on or inside an element
export const isPointInElement = (px, py, el) => {
  const bounds = getElementBounds(el);
  const pad = Math.max(10, (el.strokeWidth || 4));

  // Fast bounding box reject
  if (
    px < bounds.minX - pad ||
    px > bounds.maxX + pad ||
    py < bounds.minY - pad ||
    py > bounds.maxY + pad
  ) {
    return false;
  }

  if (['pencil', 'brush', 'highlighter'].includes(el.type)) {
    if (!el.points || el.points.length < 2) return false;
    for (let i = 0; i < el.points.length - 1; i++) {
      const p1 = el.points[i];
      const p2 = el.points[i + 1];
      const dist = distanceToSegment(px, py, p1.x, p1.y, p2.x, p2.y);
      if (dist <= (el.strokeWidth || 4) / 2 + 8) return true;
    }
    return false;
  }

  if (['line', 'arrow'].includes(el.type)) {
    const dist = distanceToSegment(px, py, el.x1, el.y1, el.x2, el.y2);
    return dist <= (el.strokeWidth || 4) / 2 + 8;
  }

  // Standard box shapes (Rectangle, Text, Sticky, Triangle, Star, Circle)
  return (
    px >= bounds.minX &&
    px <= bounds.maxX &&
    py >= bounds.minY &&
    py <= bounds.maxY
  );
};

// Distance from point to line segment
function distanceToSegment(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

// Render background grid pattern
export const renderGrid = (ctx, width, height, zoom, pan, gridType, backgroundColor) => {
  ctx.fillStyle = backgroundColor || '#12131c';
  ctx.fillRect(0, 0, width, height);

  if (gridType === 'none') return;

  const gridSize = 28 * zoom;
  const startX = pan.x % gridSize;
  const startY = pan.y % gridSize;

  if (gridType === 'dots') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    const dotRadius = Math.max(1, 1.2 * Math.min(zoom, 2));
    for (let x = startX; x < width; x += gridSize) {
      for (let y = startY; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (gridType === 'grid') {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = startX; x < width; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = startY; y < height; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  }
};

// Render single element
export const renderElement = (ctx, el) => {
  ctx.save();
  ctx.globalAlpha = el.opacity !== undefined ? el.opacity : 1;
  ctx.lineWidth = el.strokeWidth || 3;
  ctx.strokeStyle = el.strokeColor || '#ffffff';
  ctx.fillStyle = el.fillColor && el.fillColor !== 'transparent' ? el.fillColor : 'transparent';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (el.strokeStyle === 'dashed') {
    ctx.setLineDash([8, 8]);
  } else if (el.strokeStyle === 'dotted') {
    ctx.setLineDash([3, 6]);
  } else {
    ctx.setLineDash([]);
  }

  switch (el.type) {
    case 'pencil':
    case 'brush': {
      if (!el.points || el.points.length === 0) break;
      ctx.beginPath();
      if (el.points.length === 1) {
        ctx.arc(el.points[0].x, el.points[0].y, (el.strokeWidth || 3) / 2, 0, Math.PI * 2);
        ctx.fillStyle = el.strokeColor;
        ctx.fill();
      } else {
        ctx.moveTo(el.points[0].x, el.points[0].y);
        for (let i = 1; i < el.points.length - 1; i++) {
          const xc = (el.points[i].x + el.points[i + 1].x) / 2;
          const yc = (el.points[i].y + el.points[i + 1].y) / 2;
          ctx.quadraticCurveTo(el.points[i].x, el.points[i].y, xc, yc);
        }
        ctx.lineTo(el.points[el.points.length - 1].x, el.points[el.points.length - 1].y);
        ctx.stroke();
      }
      break;
    }

    case 'highlighter': {
      if (!el.points || el.points.length === 0) break;
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = (el.strokeWidth || 12) * 2.5;
      ctx.lineCap = 'square';
      ctx.beginPath();
      ctx.moveTo(el.points[0].x, el.points[0].y);
      for (let i = 1; i < el.points.length; i++) {
        ctx.lineTo(el.points[i].x, el.points[i].y);
      }
      ctx.stroke();
      ctx.restore();
      break;
    }

    case 'rectangle': {
      const bounds = getElementBounds(el);
      ctx.beginPath();
      ctx.rect(bounds.minX, bounds.minY, bounds.width, bounds.height);
      if (el.fillColor && el.fillColor !== 'transparent') ctx.fill();
      ctx.stroke();
      break;
    }

    case 'rounded-rect': {
      const bounds = getElementBounds(el);
      const r = Math.min(16, bounds.width / 4, bounds.height / 4);
      ctx.beginPath();
      ctx.roundRect(bounds.minX, bounds.minY, bounds.width, bounds.height, r);
      if (el.fillColor && el.fillColor !== 'transparent') ctx.fill();
      ctx.stroke();
      break;
    }

    case 'circle': {
      const bounds = getElementBounds(el);
      ctx.beginPath();
      ctx.ellipse(
        bounds.minX + bounds.width / 2,
        bounds.minY + bounds.height / 2,
        bounds.width / 2,
        bounds.height / 2,
        0,
        0,
        Math.PI * 2
      );
      if (el.fillColor && el.fillColor !== 'transparent') ctx.fill();
      ctx.stroke();
      break;
    }

    case 'triangle': {
      const bounds = getElementBounds(el);
      ctx.beginPath();
      ctx.moveTo(bounds.minX + bounds.width / 2, bounds.minY);
      ctx.lineTo(bounds.maxX, bounds.maxY);
      ctx.lineTo(bounds.minX, bounds.maxY);
      ctx.closePath();
      if (el.fillColor && el.fillColor !== 'transparent') ctx.fill();
      ctx.stroke();
      break;
    }

    case 'star': {
      const bounds = getElementBounds(el);
      const cx = bounds.minX + bounds.width / 2;
      const cy = bounds.minY + bounds.height / 2;
      const outerR = Math.min(bounds.width, bounds.height) / 2;
      const innerR = outerR * 0.45;
      const points = 5;
      ctx.beginPath();
      for (let i = 0; i < points * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (i * Math.PI) / points - Math.PI / 2;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      if (el.fillColor && el.fillColor !== 'transparent') ctx.fill();
      ctx.stroke();
      break;
    }

    case 'line': {
      ctx.beginPath();
      ctx.moveTo(el.x1, el.y1);
      ctx.lineTo(el.x2, el.y2);
      ctx.stroke();
      break;
    }

    case 'arrow': {
      ctx.beginPath();
      ctx.moveTo(el.x1, el.y1);
      ctx.lineTo(el.x2, el.y2);
      ctx.stroke();

      // Arrowhead
      const headLen = Math.max(12, (el.strokeWidth || 3) * 3);
      const angle = Math.atan2(el.y2 - el.y1, el.x2 - el.x1);
      ctx.beginPath();
      ctx.moveTo(el.x2, el.y2);
      ctx.lineTo(
        el.x2 - headLen * Math.cos(angle - Math.PI / 6),
        el.y2 - headLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        el.x2 - headLen * Math.cos(angle + Math.PI / 6),
        el.y2 - headLen * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fillStyle = el.strokeColor;
      ctx.fill();
      break;
    }

    case 'text': {
      const bounds = getElementBounds(el);
      ctx.font = `${el.fontSize || 24}px 'Inter', sans-serif`;
      ctx.fillStyle = el.strokeColor || '#ffffff';
      ctx.textBaseline = 'top';
      const lines = (el.text || 'Type text...').split('\n');
      const lineHeight = (el.fontSize || 24) * 1.3;
      lines.forEach((line, idx) => {
        ctx.fillText(line, bounds.minX, bounds.minY + idx * lineHeight);
      });
      break;
    }

    case 'sticky': {
      const bounds = getElementBounds(el);
      // Memo card shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 6;

      // Note background
      ctx.fillStyle = el.fillColor || '#fef08a';
      ctx.beginPath();
      ctx.roundRect(bounds.minX, bounds.minY, bounds.width, bounds.height, 8);
      ctx.fill();

      // Fold top-right corner effect
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.beginPath();
      ctx.moveTo(bounds.maxX - 16, bounds.minY);
      ctx.lineTo(bounds.maxX, bounds.minY + 16);
      ctx.lineTo(bounds.maxX - 16, bounds.minY + 16);
      ctx.closePath();
      ctx.fill();

      // Note text
      ctx.font = `500 ${el.fontSize || 16}px 'Inter', sans-serif`;
      ctx.fillStyle = '#1e293b'; // dark readable text on pastel
      ctx.textBaseline = 'top';
      const lines = (el.text || 'Sticky note...').split('\n');
      const lineHeight = (el.fontSize || 16) * 1.35;
      lines.forEach((line, idx) => {
        ctx.fillText(line, bounds.minX + 12, bounds.minY + 12 + idx * lineHeight);
      });
      break;
    }

    case 'image': {
      const bounds = getElementBounds(el);
      if (el.src) {
        const img = getImageFromCache(el.src);
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, bounds.minX, bounds.minY, bounds.width, bounds.height);
        } else if (img) {
          // Placeholder outline while image loads
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.lineWidth = 1;
          ctx.strokeRect(bounds.minX, bounds.minY, bounds.width, bounds.height);
        }
      }
      break;
    }

    default:
      break;
  }

  ctx.restore();
};

// Render Bounding Box and Transform Handles for selected elements
export const renderSelectionBox = (ctx, el, isMulti = false) => {
  const bounds = getElementBounds(el);
  ctx.save();
  ctx.strokeStyle = '#6366f1';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);

  const pad = 6;
  const x = bounds.minX - pad;
  const y = bounds.minY - pad;
  const w = bounds.width + pad * 2;
  const h = bounds.height + pad * 2;

  ctx.strokeRect(x, y, w, h);

  // If not multiple elements, render 8 resize handles
  if (!isMulti && !['pencil', 'brush', 'highlighter'].includes(el.type)) {
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    const handleSize = 8;

    const handles = [
      { x: x, y: y }, // Top-left
      { x: x + w / 2, y: y }, // Top-center
      { x: x + w, y: y }, // Top-right
      { x: x + w, y: y + h / 2 }, // Middle-right
      { x: x + w, y: y + h }, // Bottom-right
      { x: x + w / 2, y: y + h }, // Bottom-center
      { x: x, y: y + h }, // Bottom-left
      { x: x, y: y + h / 2 }, // Middle-left
    ];

    handles.forEach((hPos) => {
      ctx.fillRect(hPos.x - handleSize / 2, hPos.y - handleSize / 2, handleSize, handleSize);
      ctx.strokeRect(hPos.x - handleSize / 2, hPos.y - handleSize / 2, handleSize, handleSize);
    });
  }

  ctx.restore();
};

// Render remote collaborator's active selection box
export const renderRemoteSelection = (ctx, el, username, avatarColor) => {
  const bounds = getElementBounds(el);
  ctx.save();
  ctx.strokeStyle = avatarColor || '#ec4899';
  ctx.lineWidth = 2;
  ctx.setLineDash([3, 3]);

  const pad = 6;
  const x = bounds.minX - pad;
  const y = bounds.minY - pad;
  const w = bounds.width + pad * 2;
  const h = bounds.height + pad * 2;

  ctx.strokeRect(x, y, w, h);

  // Username badge above selection
  ctx.setLineDash([]);
  ctx.font = `600 11px 'Inter', sans-serif`;
  const textWidth = ctx.measureText(username).width;
  ctx.fillStyle = avatarColor || '#ec4899';
  ctx.roundRect(x, y - 18, textWidth + 12, 16, 4);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(username, x + 6, y - 10);

  ctx.restore();
};

// Render laser pointer trails
export const renderLaserTrails = (ctx, trails) => {
  if (!trails || trails.length === 0) return;
  ctx.save();
  const now = Date.now();

  for (let i = 0; i < trails.length - 1; i++) {
    const p1 = trails[i];
    const p2 = trails[i + 1];
    const age = now - p2.time;
    if (age > 1200) continue;

    const alpha = Math.max(0, 1 - age / 1200);
    ctx.strokeStyle = p1.color || '#ef4444';
    ctx.shadowColor = p1.color || '#ef4444';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 4 * alpha;
    ctx.globalAlpha = alpha;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }
  ctx.restore();
};
