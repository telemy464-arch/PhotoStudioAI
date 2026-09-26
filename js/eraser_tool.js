/**
 * Studio Touch-up & AI Skin Healing Tool
 * Supports two powerful studio tools:
 * 1. AI Skin Healing Brush: Repairs missing skin, peeled paper, tears, and blemishes with surrounding skin texture.
 * 2. Background Eraser: Erases background edges or halos to transparent or background color.
 */

class EraserTool {
  constructor() {
    this.isActive = false;
    this.mode = 'eraser'; // 'eraser' or 'skin_heal'
    this.brushSize = 16;
    this.targetCanvas = null;
    this.historyStack = [];
    this.maxHistory = 15;
    this.isDrawing = false;
    this.onUpdateCallback = null;
    this.cursorCircle = null;
  }

  attach(canvas, onUpdateCallback) {
    this.targetCanvas = canvas;
    this.onUpdateCallback = onUpdateCallback;
    this.createCursorCircle();
    this.bindEvents();
  }

  createCursorCircle() {
    if (this.cursorCircle) return;
    this.cursorCircle = document.createElement('div');
    this.cursorCircle.id = 'eraser-cursor';
    this.cursorCircle.className = 'fixed pointer-events-none rounded-full border-2 border-red-500 bg-red-500/20 z-50 hidden transform -translate-x-1/2 -translate-y-1/2 shadow-sm transition-colors duration-150';
    document.body.appendChild(this.cursorCircle);
  }

  setMode(mode) {
    this.mode = mode === 'skin_heal' ? 'skin_heal' : 'eraser';
    this.updateCursorStyle();
  }

  updateCursorStyle() {
    if (!this.cursorCircle) return;
    if (this.mode === 'skin_heal') {
      this.cursorCircle.className = 'fixed pointer-events-none rounded-full border-2 border-emerald-500 bg-emerald-500/20 z-50 transform -translate-x-1/2 -translate-y-1/2 shadow-sm transition-colors duration-150';
    } else {
      this.cursorCircle.className = 'fixed pointer-events-none rounded-full border-2 border-red-500 bg-red-500/20 z-50 transform -translate-x-1/2 -translate-y-1/2 shadow-sm transition-colors duration-150';
    }
    this.updateCursorSize();
    if (!this.isActive) {
      this.cursorCircle.classList.add('hidden');
    }
  }

  updateCursorSize() {
    if (!this.cursorCircle) return;
    this.cursorCircle.style.width = `${this.brushSize}px`;
    this.cursorCircle.style.height = `${this.brushSize}px`;
  }

  setActive(active, mode = null) {
    this.isActive = active;
    if (mode) {
      this.setMode(mode);
    }
    if (this.targetCanvas) {
      this.targetCanvas.style.cursor = active ? 'crosshair' : 'default';
    }
    if (!active && this.cursorCircle) {
      this.cursorCircle.classList.add('hidden');
    } else if (active && this.cursorCircle) {
      this.cursorCircle.classList.remove('hidden');
    }
  }

  setBrushSize(size) {
    this.brushSize = Math.max(4, Math.min(60, size));
    this.updateCursorSize();
  }

  saveState() {
    if (!this.targetCanvas) return;
    if (this.historyStack.length >= this.maxHistory) {
      this.historyStack.shift();
    }
    const copy = document.createElement('canvas');
    copy.width = this.targetCanvas.width;
    copy.height = this.targetCanvas.height;
    copy.getContext('2d').drawImage(this.targetCanvas, 0, 0);
    this.historyStack.push(copy);
  }

  undo() {
    if (this.historyStack.length === 0 || !this.targetCanvas) return false;
    const previous = this.historyStack.pop();
    const ctx = this.targetCanvas.getContext('2d');
    ctx.clearRect(0, 0, this.targetCanvas.width, this.targetCanvas.height);
    ctx.drawImage(previous, 0, 0);
    if (this.onUpdateCallback) {
      this.onUpdateCallback();
    }
    return true;
  }

  getPointerPos(e) {
    const rect = this.targetCanvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const scaleX = this.targetCanvas.width / rect.width;
    const scaleY = this.targetCanvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
      screenX: clientX,
      screenY: clientY,
    };
  }

  eraseAt(x, y, eraseColor = '#ffffff') {
    if (!this.targetCanvas) return;
    const ctx = this.targetCanvas.getContext('2d');
    ctx.save();

    if (eraseColor === 'transparent') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, this.brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = eraseColor;
      ctx.beginPath();
      ctx.arc(x, y, this.brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * AI Skin Healing & Inpaint:
   * Smoothly interpolates the circular brush interior from the surrounding annular ring of healthy skin/texture.
   */
  healAt(cx, cy) {
    if (!this.targetCanvas) return;
    const ctx = this.targetCanvas.getContext('2d');
    const r = Math.round(this.brushSize / 2);
    const ring = Math.max(3, Math.round(r * 0.45));
    const fullR = r + ring;

    const minX = Math.max(0, Math.floor(cx - fullR));
    const minY = Math.max(0, Math.floor(cy - fullR));
    const maxX = Math.min(this.targetCanvas.width, Math.ceil(cx + fullR));
    const maxY = Math.min(this.targetCanvas.height, Math.ceil(cy + fullR));
    const w = maxX - minX;
    const h = maxY - minY;
    if (w <= 0 || h <= 0) return;

    const imgData = ctx.getImageData(minX, minY, w, h);
    const data = imgData.data;

    // Collect healthy boundary samples from the outer ring (between r and fullR)
    const boundaryPixels = [];
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const realX = minX + px;
        const realY = minY + py;
        const dist = Math.hypot(realX - cx, realY - cy);
        if (dist >= r && dist <= fullR) {
          const idx = (py * w + px) * 4;
          if (data[idx + 3] > 40) {
            boundaryPixels.push({
              x: realX,
              y: realY,
              r: data[idx],
              g: data[idx + 1],
              b: data[idx + 2],
            });
          }
        }
      }
    }

    if (boundaryPixels.length < 4) return;

    // Subsample for fast 60fps responsiveness
    const step = Math.max(1, Math.floor(boundaryPixels.length / 32));
    const samples = [];
    for (let i = 0; i < boundaryPixels.length; i += step) {
      samples.push(boundaryPixels[i]);
    }

    // Fill the brush area
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const realX = minX + px;
        const realY = minY + py;
        const dist = Math.hypot(realX - cx, realY - cy);
        if (dist < r) {
          let totalW = 0;
          let sumR = 0, sumG = 0, sumB = 0;
          for (let i = 0; i < samples.length; i++) {
            const s = samples[i];
            const d = Math.hypot(realX - s.x, realY - s.y) + 0.5;
            const weight = 1.0 / (d * d);
            totalW += weight;
            sumR += s.r * weight;
            sumG += s.g * weight;
            sumB += s.b * weight;
          }

          const idx = (py * w + px) * 4;
          const feather = dist > r * 0.65 ? (r - dist) / (r * 0.35) : 1.0;
          const noise = (Math.random() - 0.5) * 5;

          const targetR = Math.min(255, Math.max(0, sumR / totalW + noise));
          const targetG = Math.min(255, Math.max(0, sumG / totalW + noise));
          const targetB = Math.min(255, Math.max(0, sumB / totalW + noise));

          data[idx] = Math.round(data[idx] * (1 - feather) + targetR * feather);
          data[idx + 1] = Math.round(data[idx + 1] * (1 - feather) + targetG * feather);
          data[idx + 2] = Math.round(data[idx + 2] * (1 - feather) + targetB * feather);
          data[idx + 3] = 255;
        }
      }
    }

    ctx.putImageData(imgData, minX, minY);
  }

  applyTouchup(pos) {
    if (this.mode === 'skin_heal') {
      this.healAt(pos.x, pos.y);
    } else {
      const bgColor = window.activeStudioBgColor || '#ffffff';
      this.eraseAt(pos.x, pos.y, bgColor);
    }
  }

  bindEvents() {
    if (!this.targetCanvas) return;

    const onPointerDown = (e) => {
      if (!this.isActive) return;
      e.preventDefault();
      this.saveState();
      this.isDrawing = true;
      const pos = this.getPointerPos(e);
      this.applyTouchup(pos);
      if (this.onUpdateCallback) this.onUpdateCallback();
    };

    const onPointerMove = (e) => {
      if (!this.isActive) return;
      const pos = this.getPointerPos(e);

      if (this.cursorCircle) {
        this.cursorCircle.classList.remove('hidden');
        this.cursorCircle.style.left = `${pos.screenX}px`;
        this.cursorCircle.style.top = `${pos.screenY}px`;
      }

      if (this.isDrawing) {
        e.preventDefault();
        this.applyTouchup(pos);
        if (this.onUpdateCallback) this.onUpdateCallback();
      }
    };

    const onPointerUp = () => {
      this.isDrawing = false;
    };

    const onPointerLeave = () => {
      this.isDrawing = false;
      if (this.cursorCircle) {
        this.cursorCircle.classList.add('hidden');
      }
    };

    // Mouse events
    this.targetCanvas.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    this.targetCanvas.addEventListener('mouseleave', onPointerLeave);

    // Touch events for mobile
    this.targetCanvas.addEventListener('touchstart', onPointerDown, { passive: false });
    this.targetCanvas.addEventListener('touchmove', onPointerMove, { passive: false });
    this.targetCanvas.addEventListener('touchend', onPointerUp);

    // Ctrl+Z Undo shortcut
    window.addEventListener('keydown', (e) => {
      if (this.isActive && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        this.undo();
      }
    });
  }
}

// Global instance
window.eraserTool = new EraserTool();
