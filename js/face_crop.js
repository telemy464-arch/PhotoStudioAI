/**
 * Face Crop & Alignment Module
 * Auto-detects face position and calculates official passport/stamp photo crop margins
 * Using MediaPipe Face Detection + Alpha Mask Cutout Analysis
 * 
 * Follows User Reference Specifications (media_1790276812047.webp & media_1790276812100.jpg):
 * 1. PASSPORT (35mm x 45mm @ 300 DPI = 413 x 531 px):
 *    - Top Margin (Top edge to Crown): 2 - 5 mm (target: 3.5 mm = ~7.78% of height)
 *    - Head Height (Crown to Chin): 32 - 36 mm (target: 33.5 mm = ~74.44% of height)
 *    - Bottom Margin (Chin to Bottom): >= 7 mm (target: 8.0 mm = ~17.78% of height)
 *    - Eye Level: 26 - 28 mm from bottom (target: 27.4 mm from bottom = ~40% from top)
 *    - Center Positioning: Head centered horizontally in frame
 * 
 * 2. STAMP (20mm x 25mm @ 300 DPI = 236 x 295 px):
 *    - Top Margin (Top edge to Crown): 2.5 mm (10% of height)
 *    - Head Height (Crown to Chin): 17.5 mm (70% of height)
 *    - Bottom Margin (Chin to Bottom): 5.0 mm (20% of height)
 *    - Center Positioning: Head centered horizontally in frame
 * 
 * HAIR IS 100% PROTECTED AND NEVER CLIPPED!
 */

class FaceCropper {
  constructor() {
    this.faceDetection = null;
    this.isInitialized = false;
    this.initPromise = null;
    this.pendingResolve = null;
    this.pendingReject = null;

    // ONLY 2 SIZES PER USER SPECIFICATION:
    this.PHOTO_PRESETS = {
      passport_bd: {
        name: 'Passport (35 x 45 mm)',
        widthMm: 35,
        heightMm: 45,
        aspectRatio: 35 / 45, // ~0.7778
        // At 300 DPI: (35 / 25.4) * 300 ≈ 413, (45 / 25.4) * 300 ≈ 531
        pixelWidth: 413,
        pixelHeight: 531,
        // Reference: media_1790276812047.webp (Photo: 35x45mm, Top Margin: 2-5mm, Head: 32-36mm, Bottom: >=7mm)
        targetHeadMm: 33.5,
        headRatio: 33.5 / 45, // ~0.7444 (33.5mm / 45mm)
        topMarginMm: 3.5,
        topMarginRatio: 3.5 / 45, // ~0.0778 (3.5mm / 45mm headroom)
        bottomMarginMm: 8.0,
      },
      stamp: {
        name: 'Stamp Size (20 x 25 mm)',
        widthMm: 20,
        heightMm: 25,
        aspectRatio: 20 / 25, // 0.8000
        // At 300 DPI: (20 / 25.4) * 300 ≈ 236, (25 / 25.4) * 300 ≈ 295
        pixelWidth: 236,
        pixelHeight: 295,
        targetHeadMm: 17.5,
        headRatio: 17.5 / 25, // 0.7000 (17.5mm / 25mm)
        topMarginMm: 2.5,
        topMarginRatio: 2.5 / 25, // 0.1000 (2.5mm / 25mm headroom)
        bottomMarginMm: 5.0,
      },
    };
  }

  async init() {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve) => {
      try {
        if (typeof FaceDetection === 'undefined') {
          console.warn('FaceDetection library not loaded.');
          resolve(false);
          return;
        }

        this.faceDetection = new FaceDetection({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`,
        });

        this.faceDetection.setOptions({
          model: 'short',
          minDetectionConfidence: 0.5,
        });

        this.faceDetection.onResults((results) => {
          if (this.pendingResolve) {
            this.pendingResolve(results.detections || []);
            this.pendingResolve = null;
            this.pendingReject = null;
          }
        });

        this.isInitialized = true;
        console.log('FaceCropper initialized successfully.');
        resolve(true);
      } catch (err) {
        console.error('Failed to init FaceCropper:', err);
        resolve(false);
      }
    });

    return this.initPromise;
  }

  /**
   * Detect face in image/canvas/video
   */
  async detectFace(inputElement) {
    await this.init();
    if (!this.faceDetection) {
      return [];
    }

    return new Promise((resolve, reject) => {
      this.pendingResolve = resolve;
      this.pendingReject = reject;
      this.faceDetection.send({ image: inputElement }).catch((err) => {
        if (this.pendingReject) {
          this.pendingReject(err);
          this.pendingResolve = null;
          this.pendingReject = null;
        }
      });
    });
  }

  /**
   * Measure the actual physical crown (top of head/hair) and chin coordinates.
   * If sourceCutout (transparent canvas with subject) is available, it analyzes
   * alpha channel rows to detect the EXACT top-most hair pixel!
   */
  measureTrueCrownAndChin(imgWidth, imgHeight, detection, sourceCutout = null) {
    let faceCenterX = imgWidth / 2;
    let eyeCenterY = imgHeight * 0.38;
    let headWidth = imgWidth * 0.35;
    let chinY = imgHeight * 0.75;
    let tiltAngle = 0;

    if (detection) {
      if (detection.landmarks && detection.landmarks.length >= 2) {
        const rightEye = detection.landmarks[0];
        const leftEye = detection.landmarks[1];

        if (rightEye && leftEye) {
          const dx = (leftEye.x - rightEye.x) * imgWidth;
          const dy = (leftEye.y - rightEye.y) * imgHeight;
          tiltAngle = Math.atan2(dy, dx) * (180 / Math.PI);
          tiltAngle = Math.round(tiltAngle * 10) / 10;

          faceCenterX = ((rightEye.x + leftEye.x) / 2) * imgWidth;
          eyeCenterY = ((rightEye.y + leftEye.y) / 2) * imgHeight;
        }
      }

      if (detection.boundingBox) {
        const box = detection.boundingBox;
        const boxX = box.xCenter * imgWidth;
        const boxY = box.yCenter * imgHeight;
        const boxW = box.width * imgWidth;
        const boxH = box.height * imgHeight;

        if (!detection.landmarks || detection.landmarks.length < 2) {
          faceCenterX = boxX;
          eyeCenterY = boxY - boxH * 0.12;
        }
        headWidth = Math.max(boxW, boxH * 0.90);

        // Chin calculation: MediaPipe box bottom or mouth landmark
        const boxBottom = boxY + boxH / 2;
        if (detection.landmarks && detection.landmarks.length >= 4) {
          const nose = detection.landmarks[2];
          const mouth = detection.landmarks[3];
          if (mouth && nose) {
            const noseY = nose.y * imgHeight;
            const mouthY = mouth.y * imgHeight;
            const dNoseMouth = Math.max(15, mouthY - noseY);
            chinY = Math.max(boxBottom, mouthY + dNoseMouth * 1.15);
          } else {
            chinY = boxBottom;
          }
        } else {
          chinY = boxBottom;
        }
      }
    }

    // Distance from eyes to chin
    const dEyeChin = Math.max(25, chinY - eyeCenterY);

    // Default anatomical crown: human skull + hair volume is ~1.32x eye-to-chin distance
    let crownY = Math.round(eyeCenterY - dEyeChin * 1.32);

    // If sourceCutout (transparent canvas with subject) is provided, scan the actual alpha pixels!
    if (sourceCutout && (sourceCutout.getContext || (sourceCutout.width && sourceCutout.height))) {
      try {
        let scanCanvas = sourceCutout;
        if (!sourceCutout.getContext) {
          scanCanvas = document.createElement('canvas');
          scanCanvas.width = imgWidth;
          scanCanvas.height = imgHeight;
          const sCtx = scanCanvas.getContext('2d');
          sCtx.drawImage(sourceCutout, 0, 0, imgWidth, imgHeight);
        }

        const sCtx = scanCanvas.getContext('2d');
        const minX = Math.max(0, Math.floor(faceCenterX - headWidth * 0.70));
        const maxX = Math.min(imgWidth - 1, Math.ceil(faceCenterX + headWidth * 0.70));
        const scanWidth = maxX - minX + 1;
        const scanHeight = Math.max(1, Math.min(imgHeight, Math.floor(eyeCenterY)));

        if (scanWidth > 0 && scanHeight > 0) {
          const imgData = sCtx.getImageData(minX, 0, scanWidth, scanHeight);
          const data = imgData.data;

          for (let y = 0; y < scanHeight; y++) {
            let solidCount = 0;
            for (let x = 0; x < scanWidth; x++) {
              const alpha = data[(y * scanWidth + x) * 4 + 3];
              if (alpha > 35) {
                solidCount++;
              }
            }
            // 3 solid pixels in a row confirms the true physical top of the hair
            if (solidCount >= 3) {
              // Ensure crownY takes the highest point (min Y) between scanned hair and anatomical crown
              crownY = Math.min(y, crownY);
              break;
            }
          }
        }
      } catch (err) {
        console.warn('Alpha scan fallback to anatomical crown:', err);
      }
    }

    const headHeight = Math.max(30, chinY - crownY);

    return {
      faceCenterX: Math.round(faceCenterX),
      eyeCenterY: Math.round(eyeCenterY),
      chinY: Math.round(chinY),
      crownY: Math.round(crownY),
      headHeight: Math.round(headHeight),
      headWidth: Math.round(headWidth),
      tiltAngle,
    };
  }

  /**
   * Calculate standard photo crop rectangle based on detected face and actual crown
   * @param {number} imgWidth
   * @param {number} imgHeight
   * @param {Object} detection - MediaPipe detection object
   * @param {string} presetKey - 'passport_bd' | 'stamp'
   * @param {HTMLCanvasElement|HTMLImageElement} sourceCutout - Optional transparent cutout
   * @returns {Object}
   */
  calculateCrop(imgWidth, imgHeight, detection, presetKey = 'passport_bd', sourceCutout = null) {
    const preset = this.PHOTO_PRESETS[presetKey] || this.PHOTO_PRESETS.passport_bd;
    const targetAspect = preset.aspectRatio;

    const metrics = this.measureTrueCrownAndChin(imgWidth, imgHeight, detection, sourceCutout);

    // Official reference specifications:
    // Head occupies preset.headRatio (Passport: 74.4% = 33.5mm, Stamp: 70.0% = 17.5mm)
    // Top margin above crown is preset.topMarginRatio (Passport: 7.78% = 3.5mm, Stamp: 10.0% = 2.5mm)
    const targetHeadRatio = preset.headRatio || 0.7444;
    const topMarginRatio = preset.topMarginRatio || 0.0778;

    const cropHeight = Math.round(metrics.headHeight / targetHeadRatio);
    const cropWidth = Math.round(cropHeight * targetAspect);

    // Center horizontally on subject face
    const cropX = Math.round(metrics.faceCenterX - cropWidth / 2);

    // Position vertically so crown is exactly topMarginRatio down from top
    const cropY = Math.round(metrics.crownY - cropHeight * topMarginRatio);

    return {
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      tiltAngle: metrics.tiltAngle,
      faceDetected: !!detection,
      faceCenterX: metrics.faceCenterX,
      eyeCenterY: metrics.eyeCenterY,
      chinY: metrics.chinY,
      crownY: metrics.crownY,
      headHeight: metrics.headHeight,
    };
  }

  /**
   * Render final cropped and adjusted photo onto a high-res 300 DPI canvas
   * Full-bleed solid background rendering with zero rotated border artifacts!
   * @param {HTMLCanvasElement|HTMLImageElement} sourceCutout - Transparent cutout or composite
   * @param {Object} cropRect - from calculateCrop
   * @param {Object} adjustments - { zoom: 1.0, panX: 0, panY: 0, rotation: 0, autoStraighten: true, brightness: 100, contrast: 100 }
   * @param {string} presetKey - 'passport_bd' | 'stamp'
   * @param {string} bgColor - optional fill color (e.g. '#ffffff', '#3b82f6')
   * @param {HTMLImageElement|HTMLCanvasElement} originalImage - Optional raw original image
   * @returns {HTMLCanvasElement}
   */
  renderFinalPhoto(sourceCutout, cropRect, adjustments = {}, presetKey = 'passport_bd', bgColor = '#ffffff', originalImage = null) {
    const preset = this.PHOTO_PRESETS[presetKey] || this.PHOTO_PRESETS.passport_bd;
    const outCanvas = document.createElement('canvas');
    outCanvas.width = preset.pixelWidth;
    outCanvas.height = preset.pixelHeight;
    const ctx = outCanvas.getContext('2d');

    // Enable high quality image smoothing (bicubic / high quality)
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const isOriginalBg = bgColor === 'original';

    // 1. Fill full-bleed background across the entire canvas first
    if (!isOriginalBg && bgColor && bgColor !== 'transparent') {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, outCanvas.width, outCanvas.height);
    } else {
      ctx.clearRect(0, 0, outCanvas.width, outCanvas.height);
    }

    ctx.save();

    // 2. Apply brightness & contrast filters
    const brightness = adjustments.brightness !== undefined ? adjustments.brightness : 100;
    const contrast = adjustments.contrast !== undefined ? adjustments.contrast : 100;
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;

    // 3. Coordinate translation to destination canvas center
    const outW = outCanvas.width;
    const outH = outCanvas.height;

    const destCenterX = outW / 2 + (adjustments.panX || 0);
    const destCenterY = outH / 2 + (adjustments.panY || 0);

    ctx.translate(destCenterX, destCenterY);

    // 4. Calculate effective rotation: manual rotation + auto-straighten counter-tilt
    let effectiveRotation = adjustments.rotation || 0;
    if (adjustments.autoStraighten && cropRect && cropRect.tiltAngle) {
      // Clamp auto-straighten to a safe subtle range (+/- 4.0 degrees).
      // Large angles (> 4.5 deg) are usually distorted detections or full-body posture,
      // which twists the subject's neck if rotated forcibly.
      const clampedTilt = Math.max(-4.0, Math.min(4.0, cropRect.tiltAngle));
      effectiveRotation -= clampedTilt;
    }

    if (effectiveRotation !== 0) {
      ctx.rotate((effectiveRotation * Math.PI) / 180);
    }

    // 5. Apply zoom scaling
    let extraScaleForBg = 1.0;
    if (isOriginalBg && effectiveRotation !== 0) {
      const rad = Math.abs(effectiveRotation * Math.PI / 180);
      extraScaleForBg = Math.cos(rad) + Math.sin(rad) * (outW / outH) + 0.05;
    }

    const zoom = (adjustments.zoom || 1.0) * extraScaleForBg;
    ctx.scale(zoom, zoom);

    // 6. Scale factor from crop space to output canvas space
    const scale = outH / cropRect.cropHeight;

    // Crop center in source image coordinates
    const srcCenterX = cropRect.cropX + cropRect.cropWidth / 2;
    const srcCenterY = cropRect.cropY + cropRect.cropHeight / 2;

    const imgToDraw = (isOriginalBg && originalImage) ? originalImage : sourceCutout;

    // 7. Draw full image/cutout centered around srcCenterX, srcCenterY
    // Drawing the full cutout guarantees:
    // - Hair is never clipped! (Top margin is strictly preserved)
    // - Shoulders & chest naturally extend to the edges!
    // - Zero black lines or corner triangles!
    ctx.drawImage(
      imgToDraw,
      -srcCenterX * scale,
      -srcCenterY * scale,
      imgToDraw.width * scale,
      imgToDraw.height * scale
    );

    ctx.restore();
    return outCanvas;
  }
}

// Global instance
window.faceCropper = new FaceCropper();
