/**
 * Segmenter Module
 * Handles AI-powered background removal and solid color compositing
 * 
 * Pipeline Priority (100% Automatic):
 * 1. Local Python Studio AI (rembg / u2net): Flawless, stain-free, hair-strand precision
 * 2. Optional Remove.bg Cloud API (if configured by user)
 * 3. Browser-Native MediaPipe + Morphological Edge Choke (Erosion) Fallback
 */

class BackgroundSegmenter {
  constructor() {
    this.selfieSegmentation = null;
    this.isInitialized = false;
    this.initPromise = null;
    this.pendingResolve = null;
    this.pendingReject = null;
    this.currentMask = null;
    this.apiKey = localStorage.getItem('photo_ai_removebg_key') || '';
    this.activeEngine = localStorage.getItem('photo_ai_engine') || 'auto'; // 'auto' | 'cloud' | 'local_browser'
    this.edgeChokeAmount = 2; // Default 2px inward choke to slice off all edge halos/stains
    this.hasServerRembg = null; // Checked on startup
  }

  setEngine(engine) {
    this.activeEngine = engine;
    localStorage.setItem('photo_ai_engine', engine);
  }

  setEdgeChoke(pixels) {
    this.edgeChokeAmount = Math.max(0, Math.min(6, parseInt(pixels, 10)));
  }

  setApiSettings(apiKey, engine) {
    this.apiKey = apiKey.trim();
    this.activeEngine = engine;
    localStorage.setItem('photo_ai_removebg_key', this.apiKey);
    localStorage.setItem('photo_ai_engine', this.activeEngine);
  }

  /**
   * Check if local Python rembg API is reachable
   */
  async checkServerStatus() {
    if (this.hasServerRembg !== null) return this.hasServerRembg;
    try {
      const res = await fetch('/api/status', { method: 'GET', signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        const data = await res.json();
        this.hasServerRembg = !!data.has_rembg;
        console.log('Local Server AI status:', data);
        return this.hasServerRembg;
      }
    } catch (e) {
      this.hasServerRembg = false;
    }
    return false;
  }

  /**
   * Process via local Python rembg server API (Flawless Studio Quality)
   */
  async removeBgWithServer(sourceImage) {
    const canvas = document.createElement('canvas');
    canvas.width = sourceImage.naturalWidth || sourceImage.width;
    canvas.height = sourceImage.naturalHeight || sourceImage.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(sourceImage, 0, 0);

    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.95));
    const formData = new FormData();
    formData.append('image', blob, 'portrait.jpg');

    const response = await fetch('/api/remove-bg', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const outBlob = await response.blob();
    const outImg = new Image();
    await new Promise((res, rej) => {
      outImg.onload = res;
      outImg.onerror = rej;
      outImg.src = URL.createObjectURL(outBlob);
    });

    const resultCanvas = document.createElement('canvas');
    resultCanvas.width = canvas.width;
    resultCanvas.height = canvas.height;
    resultCanvas.getContext('2d').drawImage(outImg, 0, 0, canvas.width, canvas.height);
    return resultCanvas;
  }

  /**
   * Initialize MediaPipe Selfie Segmentation (Fallback)
   */
  async init() {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve) => {
      try {
        if (typeof SelfieSegmentation === 'undefined') {
          console.warn('SelfieSegmentation script not loaded yet.');
          resolve(false);
          return;
        }

        this.selfieSegmentation = new SelfieSegmentation({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
        });

        this.selfieSegmentation.setOptions({
          modelSelection: 1, // High accuracy mode
        });

        this.selfieSegmentation.onResults((results) => {
          if (this.pendingResolve) {
            this.currentMask = results.segmentationMask;
            this.pendingResolve(results);
            this.pendingResolve = null;
            this.pendingReject = null;
          }
        });

        this.isInitialized = true;
        resolve(true);
      } catch (err) {
        console.error('Failed to initialize BackgroundSegmenter:', err);
        resolve(false);
      }
    });

    return this.initPromise;
  }

  /**
   * Process image with MediaPipe
   */
  async process(inputElement) {
    await this.init();
    if (!this.selfieSegmentation) {
      throw new Error('AI Segmentation model is not available.');
    }

    return new Promise((resolve, reject) => {
      this.pendingResolve = resolve;
      this.pendingReject = reject;
      this.selfieSegmentation.send({ image: inputElement }).catch((err) => {
        if (this.pendingReject) {
          this.pendingReject(err);
          this.pendingResolve = null;
          this.pendingReject = null;
        }
      });
    });
  }

  /**
   * Fast 2D Morphological Mask Erosion (Edge Choke)
   */
  erodeMask(maskCanvas, radius = 2) {
    if (radius <= 0) return maskCanvas;

    const width = maskCanvas.width;
    const height = maskCanvas.height;
    const ctx = maskCanvas.getContext('2d');
    const srcData = ctx.getImageData(0, 0, width, height);
    const src = srcData.data;

    const tempBuffer = new Uint8Array(width * height);
    const threshold = 120;

    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        let minVal = 255;
        const startX = Math.max(0, x - radius);
        const endX = Math.min(width - 1, x + radius);

        for (let nx = startX; nx <= endX; nx++) {
          const val = src[(rowOffset + nx) * 4];
          if (val < minVal) minVal = val;
          if (minVal === 0) break;
        }
        tempBuffer[rowOffset + x] = minVal < threshold ? 0 : minVal;
      }
    }

    const outData = ctx.createImageData(width, height);
    const dst = outData.data;

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        let minVal = 255;
        const startY = Math.max(0, y - radius);
        const endY = Math.min(height - 1, y + radius);

        for (let ny = startY; ny <= endY; ny++) {
          const val = tempBuffer[ny * width + x];
          if (val < minVal) minVal = val;
          if (minVal === 0) break;
        }

        const idx = (y * width + x) * 4;
        dst[idx] = minVal;
        dst[idx + 1] = minVal;
        dst[idx + 2] = minVal;
        dst[idx + 3] = minVal;
      }
    }

    ctx.putImageData(outData, 0, 0);

    const smoothCanvas = document.createElement('canvas');
    smoothCanvas.width = width;
    smoothCanvas.height = height;
    const sCtx = smoothCanvas.getContext('2d');
    sCtx.filter = 'blur(0.8px)';
    sCtx.drawImage(maskCanvas, 0, 0);

    return smoothCanvas;
  }

  /**
   * Remove background using Remove.bg Cloud API
   */
  async removeBgWithCloudAPI(sourceImage) {
    if (!this.apiKey) {
      throw new Error('No Remove.bg API Key provided.');
    }

    const canvas = document.createElement('canvas');
    canvas.width = sourceImage.naturalWidth || sourceImage.width;
    canvas.height = sourceImage.naturalHeight || sourceImage.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(sourceImage, 0, 0);

    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.95));

    const formData = new FormData();
    formData.append('image_file', blob);
    formData.append('size', 'auto');

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': this.apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.errors?.[0]?.title || `API Error: ${response.status}`);
    }

    const outBlob = await response.blob();
    const outImg = new Image();
    await new Promise((res, rej) => {
      outImg.onload = res;
      outImg.onerror = rej;
      outImg.src = URL.createObjectURL(outBlob);
    });

    const resultCanvas = document.createElement('canvas');
    resultCanvas.width = canvas.width;
    resultCanvas.height = canvas.height;
    resultCanvas.getContext('2d').drawImage(outImg, 0, 0, canvas.width, canvas.height);
    return resultCanvas;
  }

  /**
   * Defringe algorithm: removes background color bleeding and halos from edge pixels
   */
  applyDefringe(personCanvas) {
    const width = personCanvas.width;
    const height = personCanvas.height;
    const ctx = personCanvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];

      if (alpha < 35) {
        data[i + 3] = 0;
        continue;
      }

      if (alpha < 240) {
        const norm = alpha / 255;
        const crispAlpha = norm * norm * (3 - 2 * norm);
        data[i + 3] = Math.round(crispAlpha * 255);

        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;

        if (lum < 75 && alpha < 190) {
          data[i] = Math.min(255, r + 30);
          data[i + 1] = Math.min(255, g + 30);
          data[i + 2] = Math.min(255, b + 30);
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return personCanvas;
  }

  /**
   * Protect facial core from being accidentally erased by background removal.
   * On old, faded, torn, or low-res photos, AI can mistake skin highlights or paper scratches
   * for background. This guarantees that eyes, nose, cheeks, and mouth are 100% solid & intact.
   * Supports both single person and couple/dual portrait detections.
   */
  protectFaceCore(personCanvas, sourceImage, faceDetection) {
    if (!faceDetection || !personCanvas) return;
    const detections = Array.isArray(faceDetection) ? faceDetection : [faceDetection];
    for (const det of detections) {
      this._protectSingleFace(personCanvas, sourceImage, det);
    }
  }

  _protectSingleFace(personCanvas, sourceImage, faceDetection) {
    if (!faceDetection || !personCanvas) return;
    const width = personCanvas.width;
    const height = personCanvas.height;

    let centerX, centerY, radiusX, radiusY;
    if (faceDetection.boundingBox) {
      const box = faceDetection.boundingBox;
      centerX = box.xCenter * width;
      centerY = box.yCenter * height;
      radiusX = (box.width * width) * 0.44;
      radiusY = (box.height * height) * 0.50;
    } else if (faceDetection.landmarks && faceDetection.landmarks.length >= 4) {
      const nose = faceDetection.landmarks[2];
      centerX = nose.x * width;
      centerY = nose.y * height;
      radiusX = width * 0.16;
      radiusY = height * 0.20;
    } else {
      return;
    }

    const pCtx = personCanvas.getContext('2d');
    const pData = pCtx.getImageData(0, 0, width, height);
    const pArr = pData.data;

    const sCanvas = document.createElement('canvas');
    sCanvas.width = width;
    sCanvas.height = height;
    const sCtx = sCanvas.getContext('2d');
    sCtx.drawImage(sourceImage, 0, 0, width, height);
    const sArr = sCtx.getImageData(0, 0, width, height).data;

    const minX = Math.max(0, Math.floor(centerX - radiusX));
    const maxX = Math.min(width - 1, Math.ceil(centerX + radiusX));
    const minY = Math.max(0, Math.floor(centerY - radiusY));
    const maxY = Math.min(height - 1, Math.ceil(centerY + radiusY));

    let restoredCount = 0;
    for (let y = minY; y <= maxY; y++) {
      const dy = (y - centerY) / radiusY;
      for (let x = minX; x <= maxX; x++) {
        const dx = (x - centerX) / radiusX;
        if (dx * dx + dy * dy <= 1.0) {
          const idx = (y * width + x) * 4;
          // If pixel was made transparent inside the core face region, restore it completely!
          if (pArr[idx + 3] < 220) {
            pArr[idx] = sArr[idx];
            pArr[idx + 1] = sArr[idx + 1];
            pArr[idx + 2] = sArr[idx + 2];
            pArr[idx + 3] = 255;
            restoredCount++;
          }
        }
      }
    }
    if (restoredCount > 0) {
      pCtx.putImageData(pData, 0, 0);
      console.log(`[FaceGuard] Restored ${restoredCount} core facial pixels from accidental background removal.`);
    }
  }

  /**
   * Extract transparent person cutout with alpha channel (no background fill)
   */
  async getPersonCutout(sourceImage, edgeChoke = null, faceDetection = null) {
    const width = sourceImage.naturalWidth || sourceImage.videoWidth || sourceImage.width;
    const height = sourceImage.naturalHeight || sourceImage.videoHeight || sourceImage.height;

    let personCanvas = null;

    // 1. Try Remove.bg Cloud API if explicitly configured
    if (this.activeEngine === 'cloud' && this.apiKey) {
      try {
        personCanvas = await this.removeBgWithCloudAPI(sourceImage);
      } catch (err) {
        console.warn('Cloud API failed, falling back to local studio AI:', err);
      }
    }

    // 2. Automatic: Try Local Python rembg (u2net Deep Matting) for flawless stain-free cut
    if (!personCanvas && this.activeEngine !== 'local_browser') {
      try {
        console.log('Using Local Studio AI (rembg)...');
        personCanvas = await this.removeBgWithServer(sourceImage);
        console.log('Local Studio AI (rembg) succeeded!');
      } catch (err) {
        console.warn('Local Python rembg not available, falling back to MediaPipe Edge Choke:', err);
      }
    }

    // 3. Fallback: Built-in MediaPipe AI + Morphological Edge Choke
    if (!personCanvas) {
      console.log('Using MediaPipe + Edge Choke fallback...');
      const results = await this.process(sourceImage);
      const rawMask = results.segmentationMask;

      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = width;
      maskCanvas.height = height;
      const maskCtx = maskCanvas.getContext('2d');
      maskCtx.drawImage(rawMask, 0, 0, width, height);

      const choke = edgeChoke !== null ? edgeChoke : this.edgeChokeAmount;
      const cleanMaskCanvas = this.erodeMask(maskCanvas, choke);

      personCanvas = document.createElement('canvas');
      personCanvas.width = width;
      personCanvas.height = height;
      const personCtx = personCanvas.getContext('2d');

      personCtx.drawImage(cleanMaskCanvas, 0, 0, width, height);
      personCtx.globalCompositeOperation = 'source-in';
      personCtx.drawImage(sourceImage, 0, 0, width, height);
      personCtx.globalCompositeOperation = 'source-over';

      this.applyDefringe(personCanvas);
    }

    // Guarantee that facial core is 100% protected and intact
    if (personCanvas && faceDetection) {
      this.protectFaceCore(personCanvas, sourceImage, faceDetection);
    }

    return personCanvas;
  }

  /**
   * Composite person cutout over specified background color
   * 100% AUTOMATIC: Uses local Python rembg deep learning first for pen-cut perfection!
   */
  async replaceBackground(sourceImage, bgColor = '#ffffff', edgeBlur = 0.8, edgeChoke = null) {
    const width = sourceImage.naturalWidth || sourceImage.videoWidth || sourceImage.width;
    const height = sourceImage.naturalHeight || sourceImage.videoHeight || sourceImage.height;

    const outCanvas = document.createElement('canvas');
    outCanvas.width = width;
    outCanvas.height = height;
    const outCtx = outCanvas.getContext('2d');

    if (bgColor === 'original') {
      outCtx.drawImage(sourceImage, 0, 0, width, height);
      return outCanvas;
    }

    const personCanvas = await this.getPersonCutout(sourceImage, edgeChoke);

    // Fill background with chosen solid color
    if (bgColor !== 'transparent') {
      outCtx.fillStyle = bgColor;
      outCtx.fillRect(0, 0, width, height);
    } else {
      outCtx.clearRect(0, 0, width, height);
    }

    // Draw clean cutout person on top
    outCtx.drawImage(personCanvas, 0, 0, width, height);

    return outCanvas;
  }
}

// Global instance
window.backgroundSegmenter = new BackgroundSegmenter();
