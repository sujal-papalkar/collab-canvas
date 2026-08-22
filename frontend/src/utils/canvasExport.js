import { getElementBounds, renderElement } from './canvasRenderer';

// Export canvas as PNG/JPEG DataURL or download
export const exportCanvasImage = ({
  elements,
  backgroundColor = '#12131c',
  format = 'png', // 'png' | 'jpeg'
  scale = 2,
  includeBackground = true,
  filename = 'canvas-artwork',
}) => {
  if (!elements || elements.length === 0) {
    alert('Canvas is empty. Draw something before exporting!');
    return;
  }

  // Calculate overall canvas bounding box
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  elements.forEach((el) => {
    const b = getElementBounds(el);
    if (b.minX < minX) minX = b.minX;
    if (b.minY < minY) minY = b.minY;
    if (b.maxX > maxX) maxX = b.maxX;
    if (b.maxY > maxY) maxY = b.maxY;
  });

  const padding = 40;
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  const width = Math.max(200, maxX - minX);
  const height = Math.max(200, maxY - minY);

  const offCanvas = document.createElement('canvas');
  offCanvas.width = width * scale;
  offCanvas.height = height * scale;
  const ctx = offCanvas.getContext('2d');

  ctx.scale(scale, scale);
  ctx.translate(-minX, -minY);

  // Background
  if (includeBackground) {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(minX, minY, width, height);
  } else if (format === 'jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(minX, minY, width, height);
  }

  // Render all elements
  elements.forEach((el) => {
    renderElement(ctx, el);
  });

  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const dataUrl = offCanvas.toDataURL(mimeType, 0.95);

  const link = document.createElement('a');
  link.download = `${filename}.${format}`;
  link.href = dataUrl;
  link.click();
};

// Generate thumbnail DataURL for snapshots
export const generateSnapshotThumbnail = (elements, backgroundColor = '#12131c') => {
  if (!elements || elements.length === 0) return '';

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  elements.forEach((el) => {
    const b = getElementBounds(el);
    if (b.minX < minX) minX = b.minX;
    if (b.minY < minY) minY = b.minY;
    if (b.maxX > maxX) maxX = b.maxX;
    if (b.maxY > maxY) maxY = b.maxY;
  });

  const pad = 20;
  minX -= pad;
  minY -= pad;
  maxX += pad;
  maxY += pad;

  const w = Math.max(100, maxX - minX);
  const h = Math.max(100, maxY - minY);

  const canvas = document.createElement('canvas');
  canvas.width = 240;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, 240, 160);

  const scale = Math.min(240 / w, 160 / h);
  ctx.scale(scale, scale);
  ctx.translate(-minX, -minY);

  elements.forEach((el) => {
    renderElement(ctx, el);
  });

  return canvas.toDataURL('image/jpeg', 0.6);
};

// Export canvas as SVG string & download
export const exportCanvasSVG = ({ elements, backgroundColor = '#12131c', filename = 'canvas-drawing' }) => {
  if (!elements || elements.length === 0) return;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  elements.forEach((el) => {
    const b = getElementBounds(el);
    if (b.minX < minX) minX = b.minX;
    if (b.minY < minY) minY = b.minY;
    if (b.maxX > maxX) maxX = b.maxX;
    if (b.maxY > maxY) maxY = b.maxY;
  });

  const padding = 30;
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  const width = Math.max(200, maxX - minX);
  const height = Math.max(200, maxY - minY);

  let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${width} ${height}" width="${width}" height="${height}">\n`;
  svgContent += `  <rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="${backgroundColor}" />\n`;

  elements.forEach((el) => {
    const stroke = el.strokeColor || '#ffffff';
    const fill = el.fillColor && el.fillColor !== 'transparent' ? el.fillColor : 'none';
    const sw = el.strokeWidth || 3;
    const op = el.opacity !== undefined ? el.opacity : 1;

    switch (el.type) {
      case 'pencil':
      case 'brush':
      case 'highlighter': {
        if (el.points && el.points.length > 0) {
          const d = el.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
          svgContent += `  <path d="${d}" stroke="${stroke}" stroke-width="${sw}" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="${op}" />\n`;
        }
        break;
      }
      case 'rectangle': {
        const b = getElementBounds(el);
        svgContent += `  <rect x="${b.minX}" y="${b.minY}" width="${b.width}" height="${b.height}" stroke="${stroke}" stroke-width="${sw}" fill="${fill}" opacity="${op}" />\n`;
        break;
      }
      case 'rounded-rect': {
        const b = getElementBounds(el);
        svgContent += `  <rect x="${b.minX}" y="${b.minY}" width="${b.width}" height="${b.height}" rx="12" stroke="${stroke}" stroke-width="${sw}" fill="${fill}" opacity="${op}" />\n`;
        break;
      }
      case 'circle': {
        const b = getElementBounds(el);
        svgContent += `  <ellipse cx="${b.minX + b.width / 2}" cy="${b.minY + b.height / 2}" rx="${b.width / 2}" ry="${b.height / 2}" stroke="${stroke}" stroke-width="${sw}" fill="${fill}" opacity="${op}" />\n`;
        break;
      }
      case 'line': {
        svgContent += `  <line x1="${el.x1}" y1="${el.y1}" x2="${el.x2}" y2="${el.y2}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" opacity="${op}" />\n`;
        break;
      }
      case 'text': {
        const b = getElementBounds(el);
        svgContent += `  <text x="${b.minX}" y="${b.minY + (el.fontSize || 24)}" font-family="sans-serif" font-size="${el.fontSize || 24}" fill="${stroke}" opacity="${op}">${el.text || ''}</text>\n`;
        break;
      }
      default:
        break;
    }
  });

  svgContent += `</svg>`;

  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.svg`;
  link.click();
};

// Export canvas as JSON file
export const exportCanvasJSONFile = (elements, backgroundColor, filename = 'canvas-data') => {
  const data = JSON.stringify({ elements, backgroundColor, version: 1, exportedAt: new Date().toISOString() }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.json`;
  link.click();
};
