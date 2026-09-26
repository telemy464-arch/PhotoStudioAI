/**
 * PhotoStudio AI - HD Image Enhancer & Studio Touchup Module
 * Professional Studio Quality:
 * 1. Gentle Edge-Preserving Skin Smoothing (Removes noise, grain, and blemishes without blurring eyes/hair)
 * 2. Thresholded Unsharp Mask (USM) (Sharpens real edges like eyelashes and hair, leaving smooth skin untouched)
 * 3. Studio Tone & Lighting (Soft shadow recovery, balanced contrast, no burnt posterization)
 */

class ImageEnhancer {
  constructor() {
    this.isEnhanceActive = true;
  }

  /**
   * Apply studio-grade portrait enhancement
   * @param {HTMLCanvasElement} sourceCanvas
   * @param {Object} options - { sharpness: 0.35, brightnessBoost: 1.02, contrastBoost: 1.03, skinSmooth: true }
   * @returns {HTMLCanvasElement} enhanced canvas
   */
  enhanceHD(sourceCanvas, options = {}) {
    const sharpness = options.sharpness !== undefined ? Math.min(0.45, options.sharpness * 0.35) : 0.30;
    const brightnessBoost = options.brightnessBoost !== undefined ? Math.min(1.06, options.brightnessBoost) : 1.02;
    const contrastBoost = options.contrastBoost !== undefined ? Math.min(1.05, options.contrastBoost) : 1.03;
    const doSkinSmooth = options.skinSmooth !== undefined ? options.skinSmooth : true;

    const width = sourceCanvas.width;
    const height = sourceCanvas.height;

    // Working canvas
    const workCanvas = document.createElement('canvas');
    workCanvas.width = width;
    workCanvas.height = height;
    const ctx = workCanvas.getContext('2d');
    ctx.drawImage(sourceCanvas, 0, 0);

    // 1. Studio Lighting & Tone Curve
    this.applyStudioLighting(ctx, width, height, brightnessBoost, contrastBoost);

    // 2. Smooth Skin Denoising (Edge-preserving surface smooth on ALL pixels)
    if (doSkinSmooth) {
      this.applySmoothSkin(workCanvas, width, height);
    }

    // 3. Selective Thresholded Unsharp Mask (Only sharpens real edges, zero skin grain)
    if (sharpness > 0.05) {
      return this.applyUnsharpMask(workCanvas, sharpness, 8);
    }

    return workCanvas;
  }

  /**
   * Balanced studio lighting: gentle shadow lift, balanced dynamic range without color burning
   */
  applyStudioLighting(ctx, width, height, brightnessBoost = 1.02, contrastBoost = 1.03) {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const len = data.length;

    // Gentle S-curve contrast and soft shadow lift
    for (let i = 0; i < len; i += 4) {
      const a = data[i + 3];
      if (a === 0) continue;

      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      // Soft shadow lift (gentle 4-5% max in dark facial shadows)
      if (lum < 110) {
        const factor = (1 - lum / 110) * 6;
        r += factor;
        g += factor * 0.95;
        b += factor * 0.85;
      }

      // Soft contrast around midpoint 128
      r = (r - 128) * contrastBoost + 128;
      g = (g - 128) * contrastBoost + 128;
      b = (b - 128) * contrastBoost + 128;

      // Soft brightness
      r *= brightnessBoost;
      g *= brightnessBoost;
      b *= brightnessBoost;

      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
    }

    ctx.putImageData(imgData, 0, 0);
  }

  /**
   * Fast, edge-aware skin smoothing that removes noise/acne/grain without blurring facial features
   * Uses gentle surface blur blending across ALL pixels without checkerboard artifacts
   */
  applySmoothSkin(canvas, width, height) {
    const ctx = canvas.getContext('2d');
    const origData = ctx.getImageData(0, 0, width, height);
    const src = origData.data;

    // Create a softly blurred copy
    const blurCanvas = document.createElement('canvas');
    blurCanvas.width = width;
    blurCanvas.height = height;
    const bCtx = blurCanvas.getContext('2d');
    bCtx.filter = 'blur(2px)';
    bCtx.drawImage(canvas, 0, 0);
    const blurData = bCtx.getImageData(0, 0, width, height).data;

    const len = src.length;
    const edgeThreshold = 18; // If color difference > 18, it's an edge (eyes, hair, mouth, glasses)

    for (let i = 0; i < len; i += 4) {
      if (src[i + 3] === 0) continue;

      const diffR = Math.abs(src[i] - blurData[i]);
      const diffG = Math.abs(src[i + 1] - blurData[i + 1]);
      const diffB = Math.abs(src[i + 2] - blurData[i + 2]);
      const maxDiff = Math.max(diffR, diffG, diffB);

      // If flat or subtle texture (skin), blend smoothly towards blurred version
      if (maxDiff < edgeThreshold) {
        const blend = (1 - maxDiff / edgeThreshold) * 0.45; // 45% smooth blend
        src[i] = Math.round(src[i] * (1 - blend) + blurData[i] * blend);
        src[i + 1] = Math.round(src[i + 1] * (1 - blend) + blurData[i + 1] * blend);
        src[i + 2] = Math.round(src[i + 2] * (1 - blend) + blurData[i + 2] * blend);
      }
      // If strong edge (eyes, hair, lips), keep 100% original sharp pixel!
    }

    ctx.putImageData(origData, 0, 0);
  }

  /**
   * Thresholded Unsharp Mask (USM)
   * Only sharpens real structural edges (pupils, lashes, hair, collar).
   * Skin noise (|diff| < threshold) is NEVER sharpened, preventing speckles and burnt dots!
   */
  applyUnsharpMask(canvas, amount = 0.35, threshold = 8) {
    const width = canvas.width;
    const height = canvas.height;
    const outCanvas = document.createElement('canvas');
    outCanvas.width = width;
    outCanvas.height = height;
    const outCtx = outCanvas.getContext('2d');

    // Create high-pass reference blurred copy
    const blurCanvas = document.createElement('canvas');
    blurCanvas.width = width;
    blurCanvas.height = height;
    const blurCtx = blurCanvas.getContext('2d');
    blurCtx.filter = 'blur(1.2px)';
    blurCtx.drawImage(canvas, 0, 0);

    const origData = canvas.getContext('2d').getImageData(0, 0, width, height).data;
    const blurData = blurCtx.getImageData(0, 0, width, height).data;

    const finalImgData = outCtx.createImageData(width, height);
    const finalData = finalImgData.data;
    const len = origData.length;

    for (let i = 0; i < len; i += 4) {
      const a = origData[i + 3];
      finalData[i + 3] = a;

      if (a === 0) continue;

      const diffR = origData[i] - blurData[i];
      const diffG = origData[i + 1] - blurData[i + 1];
      const diffB = origData[i + 2] - blurData[i + 2];
      const maxDiff = Math.max(Math.abs(diffR), Math.abs(diffG), Math.abs(diffB));

      // CRITICAL: Only sharpen when difference exceeds edge threshold!
      // This completely eliminates black speckles and pixelated skin noise!
      if (maxDiff >= threshold) {
        const factor = Math.min(amount, 0.40);
        finalData[i] = Math.max(0, Math.min(255, origData[i] + diffR * factor));
        finalData[i + 1] = Math.max(0, Math.min(255, origData[i + 1] + diffG * factor));
        finalData[i + 2] = Math.max(0, Math.min(255, origData[i + 2] + diffB * factor));
      } else {
        // Skin surface stays silky smooth
        finalData[i] = origData[i];
        finalData[i + 1] = origData[i + 1];
        finalData[i + 2] = origData[i + 2];
      }
    }

    outCtx.putImageData(finalImgData, 0, 0);
    return outCanvas;
  }
}

// Global instance
window.imageEnhancer = new ImageEnhancer();
