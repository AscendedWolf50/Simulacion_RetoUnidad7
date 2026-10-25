function hexToRgba(hex, alpha = 1) {
  let c = hex.replace('#', '').trim();
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  const num = parseInt(c, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export class CanvasBuffer {
  constructor(width = 1024, height = 1024) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d');

    // Canvas auxiliar para la máscara de recorte
    this.maskCanvas = document.createElement('canvas');
    this.maskCanvas.width = width;
    this.maskCanvas.height = height;
    this.maskCtx = this.maskCanvas.getContext('2d');

    this.PREVIEW_SCALE = 0.5;
    this.BUFFER_SCALE = this.PREVIEW_SCALE * ((width * 1.8) / (512 * 5.5));
    this.sheetWidth = (1.8 / 5.5) * width * (472 / 512);

    this.currentColor = '';
    this.currentRadius = 0;
    this.brushCanvas = null;

    // Caché de Path2D para máscaras de recorte
    this.stencilPathCache = new Map();

    this.resetToCorporateGrid();
  }

  // -----------------------------------------------------------------
  // PRE-RENDERIZADO DE PINCEL DE AEROSOL
  // -----------------------------------------------------------------
  createBrushCanvas(color, radius = 65) {
    const size = Math.ceil(radius * 2);
    const bCanvas = document.createElement('canvas');
    bCanvas.width = size;
    bCanvas.height = size;
    const bCtx = bCanvas.getContext('2d');
    const center = radius;

    // Núcleo de bruma suave
    const grad = bCtx.createRadialGradient(center, center, 0, center, center, radius);
    grad.addColorStop(0, hexToRgba(color, 0.25));
    grad.addColorStop(0.4, hexToRgba(color, 0.09));
    grad.addColorStop(0.75, hexToRgba(color, 0.02));
    grad.addColorStop(1, hexToRgba(color, 0));

    bCtx.fillStyle = grad;
    bCtx.fillRect(0, 0, size, size);

    // Micro-partículas de pigmento optimizadas
    const dots = 45;
    bCtx.fillStyle = hexToRgba(color, 0.45);
    bCtx.beginPath();

    for (let i = 0; i < dots; i++) {
      const r = Math.pow(Math.random(), 2.1) * radius;
      const angle = Math.random() * Math.PI * 2;
      const px = center + Math.cos(angle) * r;
      const py = center + Math.sin(angle) * r;
      const dotSize = (1 - r / radius) * 1.8 + Math.random() * 0.7 + 0.4;

      bCtx.moveTo(px + dotSize, py);
      bCtx.arc(px, py, dotSize, 0, Math.PI * 2);
    }

    bCtx.fill();
    return bCanvas;
  }

  updateBrush(color, radius = 65) {
    if (this.currentColor !== color || this.currentRadius !== radius) {
      this.currentColor = color;
      this.currentRadius = radius;
      this.brushCanvas = this.createBrushCanvas(color, radius);
    }
  }

  // -----------------------------------------------------------------
  // AFICHE DE DISEÑO SUIZO (FONDO CORPORATIVO)
  // -----------------------------------------------------------------
  resetToCorporateGrid() {
    const { width, height } = this.canvas;
    const ctx = this.ctx;

    ctx.fillStyle = '#d8d8d6';
    ctx.fillRect(0, 0, width, height);

    ctx.lineWidth = 1.5;
    const margin = 60;
    const cols = 6;
    const colWidth = (width - margin * 2) / cols;

    for (let i = 0; i <= cols; i++) {
      const x = margin + i * colWidth;
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(255, 0, 80, 0.25)' : 'rgba(0, 150, 255, 0.2)';
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = margin; y < height - margin; y += 80) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.beginPath();
      ctx.moveTo(margin, y);
      ctx.lineTo(width - margin, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#111115';
    ctx.font = '900 55px "Helvetica Neue", Helvetica, Arial, sans-serif';
    ctx.fillText('SWISS DESIGN', margin, 130);
    ctx.fillText('STANDARDS', margin, 185);

    ctx.fillStyle = '#55555e';
    ctx.font = '600 16px "Helvetica Neue", Helvetica, Arial, sans-serif';
    ctx.fillText('REGULATION 1981 // STRICT GRID ALIGNMENT REQUIRED', margin, 215);

    ctx.fillStyle = '#333338';
    ctx.font = '400 11px monospace';
    const sampleText = [
      "1.01 ALL GRAPHIC ELEMENTS MUST CONFORM TO THE 6-COLUMN GRID SYSTEM.",
      "1.02 UNAPPROVED EXPRESSION OR IRREVERENT COLORS ARE STRICTLY FORBIDDEN.",
      "1.03 MAINTAIN VISUAL BALANCE, ORDER, AND CONTROL AT ALL TIMES.",
      "1.04 DEVIATION FROM CORPORATE IDENTITY WILL RESULT IN SYSTEM REJECTION."
    ];

    sampleText.forEach((line, idx) => {
      ctx.fillText(line, margin, 260 + idx * 18);
    });

    ctx.strokeStyle = '#111115';
    ctx.lineWidth = 4;
    ctx.strokeRect(margin / 2, margin / 2, width - margin, height - margin);
  }

  // -----------------------------------------------------------------
  // SILUETA VECTORIAL DEL LOGO (STENCILS)
  // -----------------------------------------------------------------
  getStencilPath(type, scale = 1.0) {
    const path = new Path2D();

    if (type === 'm' || type === 'mtv') {
      const w = 150 * scale;
      const h = 130 * scale;

      path.moveTo(-w, -h);
      path.lineTo(-w * 0.4, -h);
      path.lineTo(-w * 0.4, -h * 0.1);
      path.lineTo(0, -h * 0.65);
      path.lineTo(w * 0.4, -h * 0.1);
      path.lineTo(w * 0.4, -h);
      path.lineTo(w, -h);
      path.lineTo(w, h);
      path.lineTo(w * 0.4, h);
      path.lineTo(w * 0.4, h * 0.25);
      path.lineTo(0, h * 0.75);
      path.lineTo(-w * 0.4, h * 0.25);
      path.lineTo(-w * 0.4, h);
      path.lineTo(-w, h);
      path.closePath();
    }

    if (type === 'tv' || type === 'mtv') {
      const tvX = (type === 'mtv') ? 40 * scale : 0;
      const tvY = (type === 'mtv') ? 15 * scale : 0;

      path.rect(tvX - 80 * scale, tvY - 60 * scale, 120 * scale, 30 * scale);
      path.rect(tvX - 35 * scale, tvY - 30 * scale, 32 * scale, 110 * scale);

      path.moveTo(tvX + 20 * scale, tvY - 40 * scale);
      path.lineTo(tvX + 55 * scale, tvY - 40 * scale);
      path.lineTo(tvX + 80 * scale, tvY + 50 * scale);
      path.lineTo(tvX + 105 * scale, tvY - 50 * scale);
      path.lineTo(tvX + 138 * scale, tvY - 50 * scale);
      path.lineTo(tvX + 95 * scale, tvY + 80 * scale);
      path.lineTo(tvX + 65 * scale, tvY + 80 * scale);
      path.closePath();
    }

    return path;
  }

  getStencilClipPath(type) {
    if (!this.stencilPathCache.has(type)) {
      const combinedPath = new Path2D();
      combinedPath.rect(-this.sheetWidth / 2, -this.sheetWidth / 2, this.sheetWidth, this.sheetWidth);
      const cutoutPath = this.getStencilPath(type, this.BUFFER_SCALE);
      combinedPath.addPath(cutoutPath);
      this.stencilPathCache.set(type, combinedPath);
    }
    return this.stencilPathCache.get(type);
  }

  // -----------------------------------------------------------------
  // LÁMINA FÍSICA DEL STENCIL (VISTA PREVIA DE 512px)
  // -----------------------------------------------------------------
  getStencilPreviewCanvas(type) {
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 512;
    pCanvas.height = 512;
    const pCtx = pCanvas.getContext('2d');

    pCtx.clearRect(0, 0, 512, 512);

    if (type === 'spray') return pCanvas;

    pCtx.fillStyle = 'rgba(15, 15, 20, 0.78)';
    pCtx.fillRect(20, 20, 472, 472);
    pCtx.strokeStyle = 'rgba(255, 0, 85, 0.9)';
    pCtx.lineWidth = 4;
    pCtx.strokeRect(20, 20, 472, 472);

    pCtx.save();
    pCtx.translate(256, 256);
    const path = this.getStencilPath(type, this.PREVIEW_SCALE);

    pCtx.globalCompositeOperation = 'destination-out';
    pCtx.fillStyle = '#ffffff';
    pCtx.fill(path);

    pCtx.globalCompositeOperation = 'source-over';
    pCtx.strokeStyle = '#ffff00';
    pCtx.lineWidth = 3.5;
    pCtx.stroke(path);

    pCtx.restore();

    return pCanvas;
  }

  // -----------------------------------------------------------------
  // APLICAR AEROSOL FLUIDO OPTIMIZADO
  // -----------------------------------------------------------------
  sprayPaint(startUV, endUV, color = '#ff0055', sprayRadius = 65, placedStencils = []) {
    this.updateBrush(color, sprayRadius);

    const w = this.canvas.width;
    const h = this.canvas.height;

    const x1 = startUV.x * w;
    const y1 = (1 - startUV.y) * h;
    const x2 = endUV.x * w;
    const y2 = (1 - endUV.y) * h;

    const dist = Math.hypot(x2 - x1, y2 - y1);
    const stepSize = 10;
    const steps = Math.min(12, Math.max(1, Math.floor(dist / stepSize)));

    const sheetWidth = this.sheetWidth;

    if (placedStencils.length > 0) {
      const minX = Math.max(0, Math.floor(Math.min(x1, x2) - sprayRadius - 10));
      const minY = Math.max(0, Math.floor(Math.min(y1, y2) - sprayRadius - 10));
      const maxX = Math.min(w, Math.ceil(Math.max(x1, x2) + sprayRadius + 10));
      const maxY = Math.min(h, Math.ceil(Math.max(y1, y2) + sprayRadius + 10));
      const bboxW = maxX - minX;
      const bboxH = maxY - minY;

      if (bboxW <= 0 || bboxH <= 0) return;

      const mCtx = this.maskCtx;
      mCtx.clearRect(minX, minY, bboxW, bboxH);

      // Estampar trazo de pincel continuo
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const px = x1 + (x2 - x1) * t;
        const py = y1 + (y2 - y1) * t;
        mCtx.drawImage(this.brushCanvas, px - sprayRadius, py - sprayRadius);
      }

      // Recortar sobre stencils colocados mediante la ruta cacheada
      placedStencils.forEach(stencil => {
        const stX = stencil.uvX * w;
        const stY = (1 - stencil.uvY) * h;

        if (
          stX + sheetWidth / 2 < minX ||
          stX - sheetWidth / 2 > maxX ||
          stY + sheetWidth / 2 < minY ||
          stY - sheetWidth / 2 > maxY
        ) {
          return;
        }

        mCtx.save();
        mCtx.globalCompositeOperation = 'destination-out';
        mCtx.translate(stX, stY);
        const clipPath = this.getStencilClipPath(stencil.type);
        mCtx.fill(clipPath, 'evenodd');
        mCtx.restore();
      });

      // Copiar región afectada al canvas principal
      this.ctx.drawImage(
        this.maskCanvas,
        minX, minY, bboxW, bboxH,
        minX, minY, bboxW, bboxH
      );
    } else {
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const px = x1 + (x2 - x1) * t;
        const py = y1 + (y2 - y1) * t;
        this.ctx.drawImage(this.brushCanvas, px - sprayRadius, py - sprayRadius);
      }
    }
  }
}