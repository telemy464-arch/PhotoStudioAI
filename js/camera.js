/**
 * Camera Module
 * Handles live webcam / mobile camera streaming, face alignment guidance,
 * auto-capture, camera switching, and shutter effects.
 */

class CameraManager {
  constructor() {
    this.videoElement = null;
    this.stream = null;
    this.currentFacingMode = 'user'; // 'user' or 'environment'
    this.isStreaming = false;
    this.audioCtx = null;
    this.isDetecting = false;
    this.detectionInterval = null;
    this.onAlignedCallback = null;
    this.onCaptureCallback = null;

    // Auto-capture state
    this.autoCaptureEnabled = true;
    this.alignedStartTime = null;
    this.alignedRequiredDuration = 1500; // 1.5 seconds steady alignment
    this.countdownTimer = null;
    this.isCountingDown = false;
  }

  /**
   * Set video element reference
   */
  setVideoElement(element) {
    this.videoElement = element;
  }

  /**
   * Play synthesized camera shutter click sound using Web Audio API
   */
  playShutterSound() {
    try {
      if (!this.audioCtx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;

      // Click 1 (Mirror flip)
      const osc1 = this.audioCtx.createOscillator();
      const gain1 = this.audioCtx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(800, now);
      osc1.frequency.exponentialRampToValueAtTime(100, now + 0.04);
      gain1.gain.setValueAtTime(0.8, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
      osc1.connect(gain1);
      gain1.connect(this.audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.05);

      // Click 2 (Shutter curtain)
      const osc2 = this.audioCtx.createOscillator();
      const gain2 = this.audioCtx.createGain();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(450, now + 0.06);
      osc2.frequency.exponentialRampToValueAtTime(80, now + 0.12);
      gain2.gain.setValueAtTime(0.7, now + 0.06);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc2.connect(gain2);
      gain2.connect(this.audioCtx.destination);
      osc2.start(now + 0.06);
      osc2.stop(now + 0.13);
    } catch (e) {
      console.warn('AudioContext not allowed or not supported:', e);
    }
  }

  /**
   * Start camera stream
   * @param {string} facingMode - 'user' or 'environment'
   */
  async startCamera(facingMode = 'user') {
    this.stopCamera();
    this.currentFacingMode = facingMode;

    const constraints = {
      video: {
        facingMode: this.currentFacingMode,
        width: { ideal: 1920, min: 640 },
        height: { ideal: 1080, min: 480 },
      },
      audio: false,
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (this.videoElement) {
        this.videoElement.srcObject = this.stream;
        await this.videoElement.play();
        this.isStreaming = true;
        this.startFaceTracking();
      }
      return true;
    } catch (err) {
      console.error('Error opening camera:', err);
      throw err;
    }
  }

  /**
   * Stop camera stream and face tracking
   */
  stopCamera() {
    this.stopFaceTracking();
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
    this.isStreaming = false;
    this.cancelCountdown();
  }

  /**
   * Switch between front and back camera (useful on mobile)
   */
  async switchCamera() {
    const nextMode = this.currentFacingMode === 'user' ? 'environment' : 'user';
    return this.startCamera(nextMode);
  }

  /**
   * Start periodic face tracking to check alignment with the oval guide
   */
  startFaceTracking() {
    if (this.isDetecting) return;
    this.isDetecting = true;

    this.detectionInterval = setInterval(async () => {
      if (!this.isStreaming || !this.videoElement || this.videoElement.paused || this.videoElement.ended) {
        return;
      }

      if (this.videoElement.readyState >= 2) {
        try {
          const detections = await window.faceCropper.detectFace(this.videoElement);
          this.evaluateAlignment(detections);
        } catch (e) {
          // Ignore transient detection errors during frame drops
        }
      }
    }, 250); // Check 4 times per second for smooth battery-friendly detection
  }

  /**
   * Stop face tracking
   */
  stopFaceTracking() {
    this.isDetecting = false;
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }
    this.alignedStartTime = null;
  }

  /**
   * Evaluate if detected face is well-aligned within the oval guide
   */
  evaluateAlignment(detections) {
    if (!detections || detections.length === 0) {
      this.alignedStartTime = null;
      if (this.onAlignedCallback) {
        this.onAlignedCallback({ isAligned: false, message: 'Looking for face... (মুখের দিকে তাকান)' });
      }
      return;
    }

    const box = detections[0].boundingBox;
    // Bounding box coords are 0 to 1
    const faceCenterX = box.xCenter;
    const faceCenterY = box.yCenter;
    const faceW = box.width;
    const faceH = box.height;

    // Ideal center: x around 0.5 (0.42 to 0.58), y around 0.48 (0.38 to 0.58)
    const isCenteredX = faceCenterX >= 0.40 && faceCenterX <= 0.60;
    const isCenteredY = faceCenterY >= 0.35 && faceCenterY <= 0.60;

    // Ideal size: face height ~ 35% to 65% of camera frame
    const isGoodDistance = faceH >= 0.28 && faceH <= 0.70;

    let isAligned = isCenteredX && isCenteredY && isGoodDistance;
    let message = 'Align face inside the oval (মুখটি বৃত্তের মাঝে রাখুন)';

    if (!isGoodDistance) {
      if (faceH < 0.28) message = 'Come closer to the camera (একটু সামনে আসুন)';
      else message = 'Move slightly back (একটু পেছনে যান)';
    } else if (!isCenteredX || !isCenteredY) {
      message = 'Center your face (মুখ মাঝে রাখুন)';
    } else {
      message = 'Perfect! Hold still (পারফেক্ট! স্থির থাকুন)';
    }

    if (this.onAlignedCallback) {
      this.onAlignedCallback({ isAligned, message, box });
    }

    // Auto-capture trigger logic
    if (isAligned && this.autoCaptureEnabled && !this.isCountingDown) {
      if (!this.alignedStartTime) {
        this.alignedStartTime = Date.now();
      } else if (Date.now() - this.alignedStartTime >= this.alignedRequiredDuration) {
        // Face has been steady for 1.5 seconds -> trigger capture!
        this.startCountdown(2); // 2 second countdown
      }
    } else if (!isAligned) {
      this.alignedStartTime = null;
    }
  }

  /**
   * Start capture countdown timer (e.g. 3, 2, 1)
   */
  startCountdown(seconds = 3) {
    if (this.isCountingDown) return;
    this.isCountingDown = true;
    let count = seconds;

    const overlay = document.getElementById('camera-countdown-badge');
    if (overlay) {
      overlay.classList.remove('hidden');
      overlay.textContent = count;
    }

    this.countdownTimer = setInterval(() => {
      count--;
      if (count > 0) {
        if (overlay) overlay.textContent = count;
      } else {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
        this.isCountingDown = false;
        if (overlay) overlay.classList.add('hidden');
        this.captureSnapshot();
      }
    }, 1000);
  }

  cancelCountdown() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    this.isCountingDown = false;
    const overlay = document.getElementById('camera-countdown-badge');
    if (overlay) overlay.classList.add('hidden');
  }

  /**
   * Capture snapshot from current video frame
   */
  captureSnapshot() {
    if (!this.videoElement || !this.isStreaming) return null;

    this.playShutterSound();

    // Trigger visual flash
    const flashEl = document.createElement('div');
    flashEl.className = 'camera-flash';
    this.videoElement.parentElement.appendChild(flashEl);
    setTimeout(() => flashEl.remove(), 450);

    const canvas = document.createElement('canvas');
    canvas.width = this.videoElement.videoWidth || 1280;
    canvas.height = this.videoElement.videoHeight || 720;
    const ctx = canvas.getContext('2d');

    // If using user-facing camera, flip horizontally for natural mirror feel
    if (this.currentFacingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);

    if (this.onCaptureCallback) {
      this.onCaptureCallback(canvas);
    }

    return canvas;
  }
}

// Global instance
window.cameraManager = new CameraManager();
