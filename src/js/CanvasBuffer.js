export class CanvasBuffer {
  constructor(width = 2048, height = 2048) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d');
    
    this.resetToCorporateGrid();
  }

  resetToCorporateGrid() {
    const { width, height } = this.canvas;
    const ctx = this.ctx;

    // Fondo gris corporativo rígido
    ctx.fillStyle = '#1e1e22';
    ctx.fillRect(0, 0, width, height);

    // Retícula suiza plana
    ctx.strokeStyle = '#2d2d35';
    ctx.lineWidth = 4;
    const gridSize = 128;

    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Texto institucional
    ctx.fillStyle = '#3f3f4a';
    ctx.font = 'bold 36px monospace';
    ctx.fillText('STRICT CORPORATE DESIGN SYSTEM // NO UNAUTHORIZED ART', 80, 100);
  }

  drawStencil(type, uvX, uvY) {
    const x = uvX * this.canvas.width;
    const y = (1 - uvY) * this.canvas.height; // Conversión de coordenadas UV a píxeles 2D
    const ctx = this.ctx;

    ctx.save();
    ctx.translate(x, y);

    if (type === 'm') {
      // Bloque "M"
      ctx.rotate((Math.random() - 0.5) * 0.3);
      ctx.fillStyle = '#ff0055';
      ctx.fillRect(-120, -100, 70, 200);
      ctx.fillRect(50, -100, 70, 200);
      ctx.beginPath();
      ctx.moveTo(-50, -100);
      ctx.lineTo(0, -20);
      ctx.lineTo(50, -100);
      ctx.lineTo(50, -20);
      ctx.lineTo(-50, -20);
      ctx.fill();

      // Sombra proyectada tipo aerosol
      ctx.fillStyle = '#00ffff';
      ctx.fillRect(-110, -90, 15, 180);
    } else if (type === 'tv') {
      // Glifo "TV"
      ctx.rotate((Math.random() - 0.5) * 0.5);
      ctx.fillStyle = '#ffff00';
      ctx.font = '900 190px Impact, sans-serif';
      ctx.shadowColor = '#ff0055';
      ctx.shadowBlur = 30;
      ctx.fillText('TV', -90, 60);
    } else if (type === 'spray') {
      // Salpicadura de aerosol radial
      const particles = 120;
      ctx.fillStyle = Math.random() > 0.5 ? '#00ffff' : '#ff0055';
      for (let i = 0; i < particles; i++) {
        const radiusOffset = Math.random() * 120;
        const angle = Math.random() * Math.PI * 2;
        const px = Math.cos(angle) * radiusOffset;
        const py = Math.sin(angle) * radiusOffset;
        const particleSize = Math.random() * 6 + 1;

        ctx.beginPath();
        ctx.arc(px, py, particleSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }
}