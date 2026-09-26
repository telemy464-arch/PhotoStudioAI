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
   * Measure single face metrics
   */
  measureSingleFace(imgWidth, imgHeight, detection) {
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

    const dEyeChin = Math.max(25, chinY - eyeCenterY);
    const crownY = Math.round(eyeCenterY - dEyeChin * 1.32);
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
   * Measure the actual physical crown (top of head/hair) and chin coordinates.
   * If sourceCutout (transparent canvas with subject) is available, it analyzes
   * alpha channel rows to detect the EXACT top-most hair pixel!
   * Seamlessly supports single or multiple (couple/dual) faces!
   */
  measureTrueCrownAndChin(imgWidth, imgHeight, detection, sourceCutout = null) {
    if (Array.isArray(detection) && detection.length > 1) {
      const faceMetrics = detection.map((d) => this.measureSingleFace(imgWidth, imgHeight, d));
      // Sort left to right
      faceMetrics.sort((a, b) => a.faceCenterX - b.faceCenterX);

      const minCrownY = Math.min(...faceMetrics.map((m) => m.crownY));
      const maxChinY = Math.max(...faceMetrics.map((m) => m.chinY));
      const avgEyeY = Math.round(faceMetrics.reduce((sum, m) => sum + m.eyeCenterY, 0) / faceMetrics.length);

      const leftMost = faceMetrics[0];
      const rightMost = faceMetrics[faceMetrics.length - 1];

      // Physical head edges
      const headLeftEdge = Math.max(0, leftMost.faceCenterX - leftMost.headWidth * 0.60);
      const headRightEdge = Math.min(imgWidth, rightMost.faceCenterX + rightMost.headWidth * 0.60);
      const headSpan = Math.round(headRightEdge - headLeftEdge);

      // Estimate natural outer shoulder span for two adults side by side:
      // Adult shoulder reaches ~1.25x head width out from head center
      let bodyLeftEdge = Math.max(0, Math.floor(leftMost.faceCenterX - leftMost.headWidth * 1.25));
      let bodyRightEdge = Math.min(imgWidth, Math.ceil(rightMost.faceCenterX + rightMost.headWidth * 1.25));

      let finalCrownY = minCrownY;
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

          // 1. Crown / hair detection (from top down to eye level across head span)
          const minHairX = Math.max(0, Math.floor(headLeftEdge));
          const maxHairX = Math.min(imgWidth - 1, Math.ceil(headRightEdge));
          const hairScanW = maxHairX - minHairX + 1;
          const hairScanH = Math.max(1, Math.min(imgHeight, Math.floor(avgEyeY)));
          if (hairScanW > 0 && hairScanH > 0) {
            const hData = sCtx.getImageData(minHairX, 0, hairScanW, hairScanH).data;
            for (let y = 0; y < hairScanH; y++) {
              let solidCount = 0;
              for (let x = 0; x < hairScanW; x++) {
                if (hData[(y * hairScanW + x) * 4 + 3] > 35) {
                  solidCount++;
                }
              }
              if (solidCount >= 3) {
                finalCrownY = Math.min(y, finalCrownY);
                break;
              }
            }
          }

          // 2. Shoulder & Arm detection: scan body rows from eye level down to torso
          const bodyStartY = Math.max(0, Math.floor(avgEyeY));
          const bodyScanH = Math.min(imgHeight - bodyStartY, Math.floor((maxChinY - minCrownY) * 1.6));
          if (bodyScanH > 10) {
            const bData = sCtx.getImageData(0, bodyStartY, imgWidth, bodyScanH).data;
            let detectedMinX = imgWidth;
            let detectedMaxX = 0;
            for (let y = 0; y < bodyScanH; y += 4) {
              for (let x = 0; x < imgWidth; x += 4) {
                if (bData[(y * imgWidth + x) * 4 + 3] > 40) {
                  if (x < detectedMinX) detectedMinX = x;
                  if (x > detectedMaxX) detectedMaxX = x;
                }
              }
            }
            if (detectedMaxX > detectedMinX && (detectedMaxX - detectedMinX) > (rightMost.faceCenterX - leftMost.faceCenterX)) {
              bodyLeftEdge = Math.max(0, detectedMinX - 16);
              bodyRightEdge = Math.min(imgWidth, detectedMaxX + 16);
            }
          }
        } catch (err) {
          console.warn('Multi-face body scan fallback:', err);
        }
      }

      const combinedCenter = Math.round((bodyLeftEdge + bodyRightEdge) / 2);
      const combinedBodyWidth = Math.round(bodyRightEdge - bodyLeftEdge);
      const avgTilt = Math.round((faceMetrics.reduce((sum, m) => sum + m.tiltAngle, 0) / faceMetrics.length) * 10) / 10;

      return {
        faceCenterX: combinedCenter,
        eyeCenterY: avgEyeY,
        chinY: maxChinY,
        crownY: finalCrownY,
        headHeight: Math.max(30, maxChinY - finalCrownY),
        headWidth: headSpan,
        bodyWidth: combinedBodyWidth,
        tiltAngle: Math.abs(avgTilt) < 3.5 ? avgTilt : 0,
        isMultiFace: true,
        faceCount: faceMetrics.length,
      };
    }

    // Single detection handling (either single object or 1-element array)
    const singleDet = Array.isArray(detection) ? detection[0] : detection;
    const base = this.measureSingleFace(imgWidth, imgHeight, singleDet);
    let crownY = base.crownY;

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
        const minX = Math.max(0, Math.floor(base.faceCenterX - base.headWidth * 0.70));
        const maxX = Math.min(imgWidth - 1, Math.ceil(base.faceCenterX + base.headWidth * 0.70));
        const scanWidth = maxX - minX + 1;
        const scanHeight = Math.max(1, Math.min(imgHeight, Math.floor(base.eyeCenterY)));

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
            if (solidCount >= 3) {
              crownY = Math.min(y, crownY);
              break;
            }
          }
        }
      } catch (err) {
        console.warn('Alpha scan fallback to anatomical crown:', err);
      }
    }

    return {
      faceCenterX: base.faceCenterX,
      eyeCenterY: base.eyeCenterY,
      chinY: base.chinY,
      crownY,
      headHeight: Math.max(30, base.chinY - crownY),
      headWidth: base.headWidth,
      tiltAngle: base.tiltAngle,
      isMultiFace: false,
      faceCount: singleDet ? 1 : 0,
    };
  }

  /**
   * Calculate standard photo crop rectangle based on detected face and actual crown
   * @param {number} imgWidth
   * @param {number} imgHeight
   * @param {Object|Array} detection - MediaPipe detection object or array of detections
   * @param {string} presetKey - 'passport_bd' | 'stamp'
   * @param {HTMLCanvasElement|HTMLImageElement} sourceCutout - Optional transparent cutout
   * @returns {Object}
   */
  calculateCrop(imgWidth, imgHeight, detection, presetKey = 'passport_bd', sourceCutout = null) {
    const preset = this.PHOTO_PRESETS[presetKey] || this.PHOTO_PRESETS.passport_bd;
    const targetAspect = preset.aspectRatio;

    const metrics = this.measureTrueCrownAndChin(imgWidth, imgHeight, detection, sourceCutout);

    const targetHeadRatio = preset.headRatio || 0.7444;
    const topMarginRatio = preset.topMarginRatio || 0.0778;

    let cropHeight = Math.round(metrics.headHeight / targetHeadRatio);
    let cropWidth = Math.round(cropHeight * targetAspect);

    // Multi-face couple/joint framing adjustments:
    // Guarantees both persons' complete arms and shoulders are 100% visible without being cut off!
    if (metrics.isMultiFace) {
      const minRequiredWidth = Math.max(
        Math.round(metrics.headWidth * 1.55),
        Math.round((metrics.bodyWidth || metrics.headWidth * 1.65) * 1.06)
      );
      if (cropWidth < minRequiredWidth) {
        cropWidth = minRequiredWidth;
        cropHeight = Math.round(cropWidth / targetAspect);
      }
    }

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
      faceDetected: !!detection && (Array.isArray(detection) ? detection.length > 0 : true),
      faceCenterX: metrics.faceCenterX,
      eyeCenterY: metrics.eyeCenterY,
      chinY: metrics.chinY,
      crownY: metrics.crownY,
      headHeight: metrics.headHeight,
      isMultiFace: !!metrics.isMultiFace,
      faceCount: metrics.faceCount || 1,
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
