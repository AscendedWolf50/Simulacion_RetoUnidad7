export class CanvasBuffer {
  constructor(width = 2048, height = 2048) {
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
    this.BUFFER_SCALE = this.PREVIEW_SCALE * ((2048 * 1.8) / (512 * 5.5)); // ≈ 0.654545
    
    this.resetToCorporateGrid();
  }

  // -----------------------------------------------------------------
  // AFICHE DE DISEÑO SUIZO (FONDO CORPORATIVO)
  // -----------------------------------------------------------------
  resetToCorporateGrid() {
    const { width, height } = this.canvas;
    const ctx = this.ctx;

    ctx.fillStyle = '#d8d8d6';
    ctx.fillRect(0, 0, width, height);

    ctx.lineWidth = 2;
    const margin = 120;
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

    for (let y = margin; y < height - margin; y += 160) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.beginPath();
      ctx.moveTo(margin, y);
      ctx.lineTo(width - margin, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#111115';
    ctx.font = '900 110px "Helvetica Neue", Helvetica, Arial, sans-serif';
    ctx.fillText('SWISS DESIGN', margin, 260);
    ctx.fillText('STANDARDS', margin, 370);

    ctx.fillStyle = '#55555e';
    ctx.font = '600 32px "Helvetica Neue", Helvetica, Arial, sans-serif';
    ctx.fillText('REGULATION 1981 // STRICT GRID ALIGNMENT REQUIRED', margin, 430);

    ctx.fillStyle = '#333338';
    ctx.font = '400 22px monospace';
    const sampleText = [
      "1.01 ALL GRAPHIC ELEMENTS MUST CONFORM TO THE 6-COLUMN GRID SYSTEM.",
      "1.02 UNAPPROVED EXPRESSION OR IRREVERENT COLORS ARE STRICTLY FORBIDDEN.",
      "1.03 MAINTAIN VISUAL BALANCE, ORDER, AND CONTROL AT ALL TIMES.",
      "1.04 DEVIATION FROM CORPORATE IDENTITY WILL RESULT IN SYSTEM REJECTION."
    ];

    sampleText.forEach((line, idx) => {
      ctx.fillText(line, margin, 520 + idx * 36);
    });

    ctx.strokeStyle = '#111115';
    ctx.lineWidth = 8;
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

  // -----------------------------------------------------------------
  // LÁMINA FÍSICA DEL STENCIL
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
  // APLICAR AEROSOL A TRAVÉS DE LAS PLANTILLAS
  // -----------------------------------------------------------------
  sprayPaint(uvX, uvY, color = '#ff0055', sprayRadius = 140, placedStencils = []) {
    const x = uvX * this.canvas.width;
    const y = (1 - uvY) * this.canvas.height;
    const ctx = this.ctx;

    if (placedStencils.length > 0) {
      placedStencils.forEach(stencil => {
        const stX = stencil.uvX * this.canvas.width;
        const stY = (1 - stencil.uvY) * this.canvas.height;

        const dist = Math.hypot(x - stX, y - stY);
        if (dist > sprayRadius + 250) return;

        const bboxSize = 500;
        const clipX = Math.max(0, stX - bboxSize / 2);
        const clipY = Math.max(0, stY - bboxSize / 2);

        const mCtx = this.maskCtx;
        mCtx.clearRect(clipX, clipY, bboxSize, bboxSize);

        mCtx.save();
        mCtx.translate(stX, stY);
        const path = this.getStencilPath(stencil.type, this.BUFFER_SCALE);
        mCtx.fillStyle = '#ffffff';
        mCtx.fill(path);
        mCtx.restore();

        mCtx.globalCompositeOperation = 'source-in';
        this.drawAerosolDots(mCtx, x, y, sprayRadius, color);
        mCtx.globalCompositeOperation = 'source-over';

        ctx.drawImage(
          this.maskCanvas,
          clipX, clipY, bboxSize, bboxSize,
          clipX, clipY, bboxSize, bboxSize
        );
      });
    } else {
      // Rociado libre directo en la pared si no hay plantillas fijadas
      this.drawAerosolDots(ctx, x, y, sprayRadius, color);
    }
  }

  drawAerosolDots(targetCtx, x, y, radius, color) {
    const dots = 80;
    targetCtx.fillStyle = color;
    targetCtx.beginPath();

    for (let i = 0; i < dots; i++) {
      const r = Math.random() * radius;
      const angle = Math.random() * Math.PI * 2;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      const dotSize = Math.random() * 3.8 + 0.8;

      targetCtx.moveTo(px + dotSize, py);
      targetCtx.arc(px, py, dotSize, 0, Math.PI * 2);
    }

    targetCtx.fill();
  }
}