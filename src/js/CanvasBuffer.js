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
  constructor(width = 2048, height = 1024) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d');

    this.maskCanvas = document.createElement('canvas');
    this.maskCanvas.width = width;
    this.maskCanvas.height = height;
    this.maskCtx = this.maskCanvas.getContext('2d');

    this.PREVIEW_SCALE = 0.5;
    this.sheetWidth = (1.8 / 10.0) * width * (472 / 512);
    this.BUFFER_SCALE = (this.sheetWidth / 472) * 0.5;

    this.currentColor = '';
    this.currentRadius = 0;
    this.brushCanvas = null;

    this.stencilPathCache = new Map();
    this.targets = [];
    this.unlockedMTV = false;
    this.onTextureLoaded = null;

    this.brickImg = new Image();
    this.brickImg.crossOrigin = 'anonymous';
    this.brickImg.src = 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/red_brick_plaster_01/red_brick_plaster_01_diff_1k.jpg';
    this.brickImg.onload = () => {
      this.resetToCorporateGrid();
      if (this.onTextureLoaded) this.onTextureLoaded();
    };

    this.resetToCorporateGrid();
  }

  createBrushCanvas(color, radius = 65) {
    const size = Math.ceil(radius * 2);
    const bCanvas = document.createElement('canvas');
    bCanvas.width = size;
    bCanvas.height = size;
    const bCtx = bCanvas.getContext('2d');
    const center = radius;

    const grad = bCtx.createRadialGradient(center, center, 0, center, center, radius);
    grad.addColorStop(0, hexToRgba(color, 0.35));
    grad.addColorStop(0.4, hexToRgba(color, 0.15));
    grad.addColorStop(0.75, hexToRgba(color, 0.04));
    grad.addColorStop(1, hexToRgba(color, 0));

    bCtx.fillStyle = grad;
    bCtx.fillRect(0, 0, size, size);

    const dots = 50;
    bCtx.fillStyle = hexToRgba(color, 0.55);
    bCtx.beginPath();

    for (let i = 0; i < dots; i++) {
      const r = Math.pow(Math.random(), 2.1) * radius;
      const angle = Math.random() * Math.PI * 2;
      const px = center + Math.cos(angle) * r;
      const py = center + Math.sin(angle) * r;
      const dotSize = (1 - r / radius) * 2.0 + Math.random() * 0.8 + 0.5;

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

  resetToCorporateGrid() {
    const { width, height } = this.canvas;
    const ctx = this.ctx;

    this.unlockedMTV = false;

    this.targets = [
      { id: 1, label: '01. CENSOR EXPRESSION', x: 180, y: 350, w: 450, h: 260, hits: 0, requiredHits: 35, completed: false },
      { id: 2, label: '02. OBEY THE SYSTEM', x: 799, y: 350, w: 450, h: 260, hits: 0, requiredHits: 35, completed: false },
      { id: 3, label: '03. BAN LOUD MUSIC', x: 1418, y: 350, w: 450, h: 260, hits: 0, requiredHits: 35, completed: false }
    ];

    if (this.brickImg.complete && this.brickImg.naturalWidth !== 0) {
      const pattern = ctx.createPattern(this.brickImg, 'repeat');
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.fillStyle = '#8a3424';
      ctx.fillRect(0, 0, width, height);
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = '900 82px "Courier New", monospace';
    ctx.fillText('CONTROL ZONE 1981', 180, 150);

    ctx.fillStyle = 'rgba(255, 0, 85, 0.9)';
    ctx.font = '700 32px monospace';
    ctx.fillText('// REBEL SPRAY AREA // VANDALIZE ALL POSTERS', 180, 210);

    this.targets.forEach(t => {
      ctx.fillStyle = '#f4f1ea';
      ctx.fillRect(t.x, t.y, t.w, t.h);

      ctx.strokeStyle = '#111115';
      ctx.lineWidth = 6;
      ctx.strokeRect(t.x, t.y, t.w, t.h);

      ctx.fillStyle = '#cc1e2b';
      ctx.fillRect(t.x + 12, t.y + 12, t.w - 24, 50);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 22px monospace';
      ctx.fillText('AUTHORITY NOTICE', t.x + 24, t.y + 45);

      ctx.fillStyle = '#111115';
      ctx.font = '900 22px "Helvetica Neue", Arial, sans-serif';
      ctx.fillText(t.label, t.x + 24, t.y + 110);

      ctx.fillStyle = '#44444d';
      ctx.font = '600 16px monospace';
      ctx.fillText('STRICT COMPLIANCE REQUIRED.', t.x + 24, t.y + 155);
      ctx.fillText('NO UNAPPROVED ART.', t.x + 24, t.y + 185);

      ctx.strokeStyle = '#cc1e2b';
      ctx.lineWidth = 3;
      ctx.strokeRect(t.x + 24, t.y + 200, 190, 35);
      ctx.fillStyle = '#cc1e2b';
      ctx.font = '800 16px monospace';
      ctx.fillText('[TARGET ZONE]', t.x + 35, t.y + 224);
    });

    ctx.strokeStyle = '#111115';
    ctx.lineWidth = 14;
    ctx.strokeRect(20, 20, width - 40, height - 40);
  }

  getStencilPath(type, scale = 1.0) {
    const path = new Path2D();
    const s = scale;

    if (type === 'm' || type === 'mtv') {
      const w = 150 * s;
      const h = 115 * s;

      path.moveTo(-w, -h);
      path.lineTo(-w * 0.28, -h);
      path.lineTo(-w * 0.22, -h * 0.72);
      path.lineTo(-w * 0.08, -h * 0.72);
      path.lineTo(-w * 0.16, -h);
      path.lineTo(w * 0.28, -h);
      path.lineTo(w * 0.88, -h);
      path.lineTo(w * 0.88, h);
      path.lineTo(w * 0.38, h);
      path.lineTo(w * 0.18, h * 0.42);
      path.lineTo(w * 0.06, h * 0.42);
      path.lineTo(0, h * 0.25);
      path.lineTo(-w * 0.38, h);
      path.lineTo(-w, h);
      path.closePath();

      const innerTri = new Path2D();
      innerTri.moveTo(-w * 0.22, h * 0.88);
      innerTri.lineTo(-w * 0.04, h * 0.52);
      innerTri.lineTo(-w * 0.04, h * 0.88);
      innerTri.closePath();
      path.addPath(innerTri);

      const edge3D = new Path2D();
      edge3D.moveTo(w * 0.94, -h + 12 * s);
      edge3D.lineTo(w * 1.1, -h + 24 * s);
      edge3D.lineTo(w * 1.1, h * 0.1);
      edge3D.lineTo(w * 0.94, h * 0.25);
      edge3D.closePath();
      path.addPath(edge3D);

      const edge3DBottom = new Path2D();
      edge3DBottom.moveTo(w * 0.94, h * 0.38);
      edge3DBottom.lineTo(w * 1.1, h * 0.22);
      edge3DBottom.lineTo(w * 1.1, h + 18 * s);
      edge3DBottom.lineTo(w * 0.94, h + 18 * s);
      edge3DBottom.closePath();
      path.addPath(edge3DBottom);
    }

    if (type === 'tv' || type === 'mtv') {
      const ox = (type === 'mtv') ? 28 * s : 0;
      const oy = (type === 'mtv') ? 10 * s : 0;

      const tPath = new Path2D();
      tPath.moveTo(ox - 110 * s, oy - 20 * s);
      tPath.bezierCurveTo(ox - 122 * s, oy - 38 * s, ox - 105 * s, oy - 60 * s, ox - 78 * s, oy - 55 * s);
      tPath.lineTo(ox + 20 * s, oy - 25 * s);
      tPath.bezierCurveTo(ox + 40 * s, oy - 20 * s, ox + 38 * s, oy + 10 * s, ox + 18 * s, oy + 16 * s);
      tPath.bezierCurveTo(ox + 2 * s, oy + 20 * s, ox - 12 * s, oy + 10 * s, ox - 18 * s, oy - 2 * s);
      tPath.lineTo(ox - 62 * s, oy + 12 * s);
      tPath.lineTo(ox - 58 * s, oy + 108 * s);
      tPath.bezierCurveTo(ox - 56 * s, oy + 132 * s, ox - 86 * s, oy + 134 * s, ox - 88 * s, oy + 108 * s);
      tPath.lineTo(ox - 90 * s, oy + 18 * s);
      tPath.bezierCurveTo(ox - 102 * s, oy + 15 * s, ox - 110 * s, oy - 2 * s, ox - 110 * s, oy - 20 * s);
      tPath.closePath();
      path.addPath(tPath);

      const vPath = new Path2D();
      vPath.moveTo(ox - 18 * s, oy - 12 * s);
      vPath.bezierCurveTo(ox - 34 * s, oy - 45 * s, ox - 2 * s, oy - 58 * s, ox + 16 * s, oy - 38 * s);
      vPath.bezierCurveTo(ox + 28 * s, oy - 18 * s, ox + 32 * s, oy + 18 * s, ox + 40 * s, oy + 65 * s);
      vPath.bezierCurveTo(ox + 44 * s, oy + 88 * s, ox + 70 * s, oy + 86 * s, ox + 74 * s, oy + 60 * s);
      vPath.lineTo(ox + 125 * s, oy - 38 * s);
      vPath.bezierCurveTo(ox + 138 * s, oy - 56 * s, ox + 160 * s, oy - 34 * s, ox + 144 * s, oy - 14 * s);
      vPath.lineTo(ox + 90 * s, oy + 70 * s);
      vPath.bezierCurveTo(ox + 76 * s, oy + 108 * s, ox + 22 * s, oy + 106 * s, ox + 16 * s, oy + 64 * s);
      vPath.bezierCurveTo(ox + 6 * s, oy + 24 * s, ox - 2 * s, oy, ox - 18 * s, oy - 12 * s);
      vPath.closePath();
      path.addPath(vPath);
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

  getStencilPreviewCanvas(type) {
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 512;
    pCanvas.height = 512;
    const pCtx = pCanvas.getContext('2d');

    pCtx.clearRect(0, 0, 512, 512);

    if (type === 'spray') return pCanvas;

    pCtx.fillStyle = 'rgba(15, 15, 20, 0.85)';
    pCtx.fillRect(20, 20, 472, 472);
    pCtx.strokeStyle = 'rgba(255, 0, 85, 0.95)';
    pCtx.lineWidth = 5;
    pCtx.strokeRect(20, 20, 472, 472);

    pCtx.save();
    pCtx.translate(256, 256);
    const path = this.getStencilPath(type, this.PREVIEW_SCALE);

    pCtx.globalCompositeOperation = 'destination-out';
    pCtx.fillStyle = '#ffffff';
    pCtx.fill(path);

    pCtx.globalCompositeOperation = 'source-over';
    pCtx.strokeStyle = '#ffff00';
    pCtx.lineWidth = 4;
    pCtx.stroke(path);

    pCtx.restore();

    return pCanvas;
  }

  checkTargetHit(px, py) {
    this.targets.forEach(t => {
      if (!t.completed) {
        if (px >= t.x && px <= t.x + t.w && py >= t.y && py <= t.y + t.h) {
          t.hits++;
          if (t.hits >= t.requiredHits) {
            t.completed = true;
          }
        }
      }
    });
  }

  getRebellionProgress() {
    const completedCount = this.targets.filter(t => t.completed).length;
    const total = this.targets.length;
    const allDone = completedCount === total;
    return { completedCount, total, allDone };
  }

  triggerMTVReveal() {
    if (this.unlockedMTV) return;
    this.unlockedMTV = true;

    const ctx = this.ctx;
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2 + 50;

    for (let i = 0; i < 50; i++) {
      const rx = cx + (Math.random() - 0.5) * 1100;
      const ry = cy + (Math.random() - 0.5) * 650;
      const rad = Math.random() * 100 + 30;
      const colors = ['#ff0055', '#ffff00', '#00ffff', '#ffffff'];
      const col = colors[Math.floor(Math.random() * colors.length)];

      const grad = ctx.createRadialGradient(rx, ry, 0, rx, ry, rad);
      grad.addColorStop(0, hexToRgba(col, 0.85));
      grad.addColorStop(1, hexToRgba(col, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(rx, ry, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(cx, cy);

    const pathM = this.getStencilPath('m', 2.2);
    const pathTV = this.getStencilPath('tv', 2.2);

    ctx.fillStyle = '#ffff00';
    ctx.shadowColor = '#ffff00';
    ctx.shadowBlur = 35;
    ctx.fill(pathM);

    ctx.fillStyle = '#ff0055';
    ctx.shadowColor = '#ff0055';
    ctx.shadowBlur = 40;
    ctx.fill(pathTV);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8;
    ctx.stroke(pathM);
    ctx.stroke(pathTV);

    ctx.restore();
  }

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

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const px = x1 + (x2 - x1) * t;
        const py = y1 + (y2 - y1) * t;
        mCtx.drawImage(this.brushCanvas, px - sprayRadius, py - sprayRadius);
        this.checkTargetHit(px, py);
      }

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
        this.checkTargetHit(px, py);
      }
    }
  }
}