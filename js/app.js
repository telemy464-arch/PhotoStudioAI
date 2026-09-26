/**
 * Main Application Orchestrator
 * Connects UI, Camera, AI Segmenter, Face Cropper, HD Enhancer, Eraser Tool, and Print Export modules.
 */

document.addEventListener('DOMContentLoaded', () => {
  // App State
  const state = {
    currentMode: 'upload', // 'upload' | 'camera' | 'editor'
    rawSourceImage: null, // HTMLImageElement or HTMLCanvasElement
    bgProcessedImage: null, // Cutout composite canvas
    personCutout: null, // Isolated transparent person cutout
    selectedBgColor: '#ffffff', // Current background color
    selectedBgName: 'Official White',
    adjustments: {
      zoom: 1.0,
      rotation: 0,
      panX: 0,
      panY: 0,
      brightness: 100,
      contrast: 100,
      sharpness: 100, // %
      light: 104, // %
      edgeChoke: 2, // px erosion to slice off halos & stains
      autoStraighten: true,
      aiEnhance: true,
    },
    faceDetection: null,
    passportCropRect: null,
    stampCropRect: null,
    currentSheetLayout: '4r_4_passport',
    showCutMarks: true,
  };

  // DOM Elements
  const tabUploadBtn = document.getElementById('tab-upload-btn');
  const tabCameraBtn = document.getElementById('tab-camera-btn');
  const uploadSection = document.getElementById('upload-section');
  const cameraSection = document.getElementById('camera-section');
  const editorSection = document.getElementById('editor-section');
  const photoFileInput = document.getElementById('photo-file-input');
  const dropZone = document.getElementById('drop-zone');
  const loadSampleBtn = document.getElementById('load-sample-btn');

  // Camera elements
  const webcamVideo = document.getElementById('webcam-video');
  const cameraOvalGuide = document.getElementById('camera-oval-guide');
  const cameraStatusText = document.getElementById('camera-status-text');
  const cameraStatusDot = document.getElementById('camera-status-dot');
  const cameraFlipBtn = document.getElementById('camera-flip-btn');
  const takePhotoBtn = document.getElementById('take-photo-btn');
  const closeCameraBtn = document.getElementById('close-camera-btn');
  const autoCaptureToggle = document.getElementById('auto-capture-toggle');

  // AI Smart Tools & Status
  const autoStraightenToggleBtn = document.getElementById('auto-straighten-toggle-btn');
  const straightenStatusText = document.getElementById('straighten-status-text');
  const straightenBadge = document.getElementById('straighten-badge');
  const aiEnhanceToggleBtn = document.getElementById('ai-enhance-toggle-btn');
  const enhanceBadge = document.getElementById('enhance-badge');
  const adjustEdgeChoke = document.getElementById('adjust-edge-choke');
  const edgeChokeValText = document.getElementById('edge-choke-val-text');
  const cloudRestoreFaceBtn = document.getElementById('cloud-restore-face-btn');
  const fixBrokenFaceBtn = document.getElementById('fix-broken-face-btn');
  const autoSkinRepairToggle = document.getElementById('auto-skin-repair-toggle');

  // Studio Touch-up & Skin Healing Tool Elements
  const toggleSkinHealBtn = document.getElementById('toggle-skin-heal-btn');
  const skinHealBtnText = document.getElementById('skin-heal-btn-text');
  const toggleEraserBtn = document.getElementById('toggle-eraser-btn');
  const eraserBtnText = document.getElementById('eraser-btn-text');
  const eraserControlsBar = document.getElementById('eraser-controls-bar');
  const eraserSizeSlider = document.getElementById('eraser-size-slider');
  const brushSizeValText = document.getElementById('brush-size-val-text');
  const eraserUndoBtn = document.getElementById('eraser-undo-btn');
  const brushCloseBtn = document.getElementById('brush-close-btn');
  const brushModeBadge = document.getElementById('brush-mode-badge');
  const brushHintText = document.getElementById('brush-hint-text');

  // Editor elements
  const editorRetakeBtn = document.getElementById('editor-retake-btn');
  const currentBgNameEl = document.getElementById('current-bg-name');
  const bgColorBtns = document.querySelectorAll('.bg-color-btn');
  const customColorPicker = document.getElementById('custom-color-picker');

  // Sliders
  const adjustZoom = document.getElementById('adjust-zoom');
  const adjustRotate = document.getElementById('adjust-rotate');
  const adjustPanX = document.getElementById('adjust-pan-x');
  const adjustPanY = document.getElementById('adjust-pan-y');
  const adjustBrightness = document.getElementById('adjust-brightness');
  const adjustContrast = document.getElementById('adjust-contrast');
  const adjustSharpness = document.getElementById('adjust-sharpness');
  const adjustLight = document.getElementById('adjust-light');
  const resetAdjustmentsBtn = document.getElementById('reset-adjustments-btn');

  const zoomValText = document.getElementById('zoom-val-text');
  const rotateValText = document.getElementById('rotate-val-text');
  const panXValText = document.getElementById('pan-x-val-text');
  const panYValText = document.getElementById('pan-y-val-text');
  const brightValText = document.getElementById('bright-val-text');
  const contrastValText = document.getElementById('contrast-val-text');
  const sharpnessValText = document.getElementById('sharpness-val-text');
  const lightValText = document.getElementById('light-val-text');

  // Preview Canvases
  const passportCanvas = document.getElementById('passport-preview-canvas');
  const stampCanvas = document.getElementById('stamp-preview-canvas');

  // Single Downloads
  const downloadPassportJpgBtn = document.getElementById('download-passport-jpg-btn');
  const downloadPassportPngBtn = document.getElementById('download-passport-png-btn');
  const downloadStampJpgBtn = document.getElementById('download-stamp-jpg-btn');
  const downloadStampPngBtn = document.getElementById('download-stamp-png-btn');

  // Print & PDF Modal elements
  const openPrintModalBtn = document.getElementById('open-print-modal-btn');
  const quickPrintPassportBtn = document.getElementById('quick-print-passport-btn');
  const printModal = document.getElementById('print-modal');
  const closePrintModalBtn = document.getElementById('close-print-modal-btn');
  const modalCancelBtn = document.getElementById('modal-cancel-btn');
  const sheetLayoutSelect = document.getElementById('sheet-layout-select');
  const sheetCutMarksCheckbox = document.getElementById('sheet-cut-marks-checkbox');
  const modalSheetPreviewCanvas = document.getElementById('modal-sheet-preview-canvas');
  const modalDownloadSheetBtn = document.getElementById('modal-download-sheet-btn');
  const modalDownloadPdfBtn = document.getElementById('modal-download-pdf-btn');
  const modalDirectPrintBtn = document.getElementById('modal-direct-print-btn');

  // Free AI API Modal elements
  const openApiSettingsBtn = document.getElementById('open-api-settings-btn');
  const apiModal = document.getElementById('api-modal');
  const closeApiModalBtn = document.getElementById('close-api-modal-btn');
  const cancelApiSettingsBtn = document.getElementById('cancel-api-settings-btn');
  const saveApiSettingsBtn = document.getElementById('save-api-settings-btn');
  const engineLocal = document.getElementById('engine-local');
  const engineCloud = document.getElementById('engine-cloud');
  const apiKeyGroup = document.getElementById('api-key-group');
  const removebgApiKeyInput = document.getElementById('removebg-api-key-input');

  // Documentation Modal elements
  const openDocsBtn = document.getElementById('open-docs-btn');
  const footerDocsBtn = document.getElementById('footer-docs-btn');
  const docsModal = document.getElementById('docs-modal');
  const closeDocsModalBtn = document.getElementById('close-docs-modal-btn');
  const closeDocsModalFooterBtn = document.getElementById('close-docs-modal-footer-btn');

  // Loading overlay
  const loadingOverlay = document.getElementById('loading-overlay');
  const loadingTitle = document.getElementById('loading-title');
  const loadingDesc = document.getElementById('loading-desc');

  // Helper: Show/Hide Loading
  function showLoading(title, desc) {
    loadingTitle.textContent = title || 'প্রসেসিং হচ্ছে...';
    loadingDesc.textContent = desc || 'অনুগ্রহ করে অপেক্ষা করুন';
    loadingOverlay.classList.remove('hidden');
  }

  function hideLoading() {
    loadingOverlay.classList.add('hidden');
  }

  // -------------------------------------------------------------
  // Mode Switching
  // -------------------------------------------------------------
  function setMode(mode) {
    state.currentMode = mode;

    if (mode === 'upload') {
      tabUploadBtn.className = 'flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 bg-brand-600 text-white shadow-sm';
      tabCameraBtn.className = 'flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100';
      uploadSection.classList.remove('hidden');
      cameraSection.classList.add('hidden');
      window.cameraManager.stopCamera();
    } else if (mode === 'camera') {
      tabCameraBtn.className = 'flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 bg-brand-600 text-white shadow-sm';
      tabUploadBtn.className = 'flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100';
      cameraSection.classList.remove('hidden');
      uploadSection.classList.add('hidden');
      startLiveCamera();
    } else if (mode === 'editor') {
      uploadSection.classList.add('hidden');
      cameraSection.classList.add('hidden');
      editorSection.classList.remove('hidden');
      window.cameraManager.stopCamera();
    }
  }

  tabUploadBtn.addEventListener('click', () => setMode('upload'));
  tabCameraBtn.addEventListener('click', () => setMode('camera'));

  // -------------------------------------------------------------
  // Camera Setup & Tracking Callbacks
  // -------------------------------------------------------------
  window.cameraManager.setVideoElement(webcamVideo);

  window.cameraManager.onAlignedCallback = ({ isAligned, message }) => {
    cameraStatusText.textContent = message;
    if (isAligned) {
      cameraOvalGuide.classList.add('aligned');
      cameraStatusDot.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse';
    } else {
      cameraOvalGuide.classList.remove('aligned');
      cameraStatusDot.className = 'w-2 h-2 rounded-full bg-amber-400 animate-ping';
    }
  };

  window.cameraManager.onCaptureCallback = (capturedCanvas) => {
    processSourceImage(capturedCanvas);
  };

  async function startLiveCamera() {
    try {
      showLoading('ক্যামেরা চালু হচ্ছে...', 'অনুগ্রহ করে ক্যামেরা পারমিশন এলাও (Allow) করুন');
      await window.cameraManager.startCamera('user');
      hideLoading();
    } catch (err) {
      hideLoading();
      alert('ক্যামেরা চালু করা সম্ভব হয়নি। অনুগ্রহ করে ব্রাউজার সেটিংসে গিয়ে ক্যামেরার অনুমতি দিন।');
      setMode('upload');
    }
  }

  cameraFlipBtn.addEventListener('click', async () => {
    showLoading('ক্যামেরা সুইচ হচ্ছে...');
    try {
      await window.cameraManager.switchCamera();
    } catch (e) {
      alert('ক্যামেরা সুইচ করতে সমস্যা হয়েছে।');
    }
    hideLoading();
  });

  takePhotoBtn.addEventListener('click', () => {
    window.cameraManager.captureSnapshot();
  });

  closeCameraBtn.addEventListener('click', () => {
    setMode('upload');
  });

  autoCaptureToggle.addEventListener('change', (e) => {
    window.cameraManager.autoCaptureEnabled = e.target.checked;
  });

  // -------------------------------------------------------------
  // File Upload & Drag-and-Drop
  // -------------------------------------------------------------
  photoFileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      loadImageFromFile(e.target.files[0]);
    }
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('border-brand-500', 'bg-blue-50/50');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('border-brand-500', 'bg-blue-50/50');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-brand-500', 'bg-blue-50/50');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      loadImageFromFile(e.dataTransfer.files[0]);
    }
  });

  function loadImageFromFile(file) {
    showLoading('ছবি লোড হচ্ছে...', 'ফাইলের ডেটা রিড করা হচ্ছে');
    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = () => {
        processSourceImage(img);
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Load sample demo portrait (intentionally tilted 3.5° to demonstrate auto-straighten)
  loadSampleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    createAndLoadSampleImage();
  });

  function createAndLoadSampleImage() {
    showLoading('ডেমো ছবি তৈরি হচ্ছে...', 'টেস্ট পোর্ট্রেট জেনারেট করা হচ্ছে');
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 1000;
    const ctx = canvas.getContext('2d');

    // Background: Gradient indoor wall
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 1000);
    bgGrad.addColorStop(0, '#e2e8f0');
    bgGrad.addColorStop(1, '#cbd5e1');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 800, 1000);

    ctx.save();
    // Tilt slightly (3.5 degrees) to demonstrate auto-straightening
    ctx.translate(400, 500);
    ctx.rotate((3.5 * Math.PI) / 180);
    ctx.translate(-400, -500);

    // Shoulders / Suit jacket
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.ellipse(400, 950, 360, 280, 0, 0, Math.PI * 2);
    ctx.fill();

    // Shirt collar
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(350, 680);
    ctx.lineTo(400, 780);
    ctx.lineTo(450, 680);
    ctx.closePath();
    ctx.fill();

    // Neck
    ctx.fillStyle = '#f6d0b3';
    ctx.fillRect(360, 580, 80, 120);

    // Head / Face oval
    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.ellipse(400, 480, 140, 180, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = '#1f2937';
    ctx.beginPath();
    ctx.ellipse(400, 380, 155, 120, 0, Math.PI, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.ellipse(350, 460, 12, 8, 0, 0, Math.PI * 2);
    ctx.ellipse(450, 460, 12, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyebrows
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(330, 440);
    ctx.lineTo(370, 440);
    ctx.moveTo(430, 440);
    ctx.lineTo(470, 440);
    ctx.stroke();

    // Nose
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(400, 470);
    ctx.lineTo(395, 510);
    ctx.lineTo(405, 510);
    ctx.stroke();

    // Smile
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(400, 535, 28, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();

    ctx.restore();

    const img = new Image();
    img.onload = () => {
      processSourceImage(img);
    };
    img.src = canvas.toDataURL('image/jpeg', 0.95);
  }

  // -------------------------------------------------------------
  // Processing Pipeline (Face Detect + Background Segmentation)
  // -------------------------------------------------------------
  async function processSourceImage(source) {
    state.rawSourceImage = source;
    showLoading('এআই ফেস ডিটেকশন ও পারফেক্ট পেন-কাট প্রসেসিং...', 'ছায়া ও দাগ মুক্ত করা হচ্ছে');

    try {
      // Step 1: Detect face to find optimal crop coordinates and tilt angle
      const detections = await window.faceCropper.detectFace(source);
      state.faceDetection = detections && detections.length > 0 ? detections[0] : null;

      const srcW = source.naturalWidth || source.videoWidth || source.width;
      const srcH = source.naturalHeight || source.videoHeight || source.height;

      state.passportCropRect = window.faceCropper.calculateCrop(srcW, srcH, state.faceDetection, 'passport_bd');
      state.stampCropRect = window.faceCropper.calculateCrop(srcW, srcH, state.faceDetection, 'stamp');

      // Update Auto-Straighten UI status
      const tilt = state.passportCropRect ? state.passportCropRect.tiltAngle : 0;
      if (Math.abs(tilt) >= 0.4) {
        straightenStatusText.textContent = `মাথা বাঁকা ছিল: ${tilt}° (সোজা করা হয়েছে)`;
      } else {
        straightenStatusText.textContent = `মাথা সোজা আছে (0.0° অনুভূমিক)`;
      }

      // Step 2: Extract AI transparent cutout (rembg or MediaPipe)
      await extractPersonCutout();

      // Step 3: Render both preview canvases with official framing & HD enhancement
      updatePreviews();

      // Transition to editor
      hideLoading();
      setMode('editor');
    } catch (err) {
      console.error('Processing error:', err);
      hideLoading();
      alert('ছবিটি প্রসেস করতে কিছু সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    }
  }

  async function extractPersonCutout() {
    if (!state.rawSourceImage) return;
    try {
      state.personCutout = await window.backgroundSegmenter.getPersonCutout(
        state.rawSourceImage,
        state.adjustments.edgeChoke !== undefined ? state.adjustments.edgeChoke : 2,
        state.faceDetection
      );
    } catch (e) {
      console.warn('Background segmentation error, fallback to raw source:', e);
      state.personCutout = state.rawSourceImage;
    }

    // Refine crop with the actual physical cutout alpha mask to guarantee 100% hair protection & exact reference sizes
    if (state.personCutout && state.rawSourceImage) {
      const srcW = state.rawSourceImage.naturalWidth || state.rawSourceImage.videoWidth || state.rawSourceImage.width;
      const srcH = state.rawSourceImage.naturalHeight || state.rawSourceImage.videoHeight || state.rawSourceImage.height;
      state.passportCropRect = window.faceCropper.calculateCrop(
        srcW,
        srcH,
        state.faceDetection,
        'passport_bd',
        state.personCutout
      );
      state.stampCropRect = window.faceCropper.calculateCrop(
        srcW,
        srcH,
        state.faceDetection,
        'stamp',
        state.personCutout
      );
    }
  }

  // -------------------------------------------------------------
  // Update Preview Canvases with HD Enhancer
  // -------------------------------------------------------------
  function updatePreviews() {
    const sourceToUse = state.personCutout || state.rawSourceImage;
    if (!sourceToUse) return;

    // 1. Render Passport Photo (35x45mm at 300 DPI)
    let pCanvas = window.faceCropper.renderFinalPhoto(
      sourceToUse,
      state.passportCropRect,
      state.adjustments,
      'passport_bd',
      state.selectedBgColor,
      state.rawSourceImage
    );

    // 2. Render Stamp Photo (20x25mm at 300 DPI)
    let sCanvas = window.faceCropper.renderFinalPhoto(
      sourceToUse,
      state.stampCropRect,
      state.adjustments,
      'stamp',
      state.selectedBgColor,
      state.rawSourceImage
    );

    // 3. Apply AI HD Enhancement if active
    if (state.adjustments.aiEnhance && window.imageEnhancer) {
      pCanvas = window.imageEnhancer.enhanceHD(pCanvas, {
        sharpness: state.adjustments.sharpness / 100,
        brightnessBoost: state.adjustments.light / 100,
        contrastBoost: 1.05,
        skinSmooth: true,
      });

      sCanvas = window.imageEnhancer.enhanceHD(sCanvas, {
        sharpness: state.adjustments.sharpness / 100,
        brightnessBoost: state.adjustments.light / 100,
        contrastBoost: 1.05,
        skinSmooth: true,
      });
    }

    // Draw on DOM canvases
    const pCtx = passportCanvas.getContext('2d');
    passportCanvas.width = pCanvas.width;
    passportCanvas.height = pCanvas.height;
    pCtx.drawImage(pCanvas, 0, 0);

    const sCtx = stampCanvas.getContext('2d');
    stampCanvas.width = sCanvas.width;
    stampCanvas.height = sCanvas.height;
    sCtx.drawImage(sCanvas, 0, 0);

    // Also update modal sheet preview if open
    if (!printModal.classList.contains('hidden')) {
      updateModalSheetPreview();
    }
  }

  // -------------------------------------------------------------
  // AI Smart Tools Button Toggles & Edge Choke Slider
  // -------------------------------------------------------------
  autoStraightenToggleBtn.addEventListener('click', () => {
    state.adjustments.autoStraighten = !state.adjustments.autoStraighten;
    if (state.adjustments.autoStraighten) {
      straightenBadge.textContent = 'ON';
      straightenBadge.className = 'px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-800';
      autoStraightenToggleBtn.classList.add('border-indigo-600');
      autoStraightenToggleBtn.classList.remove('border-slate-300');
    } else {
      straightenBadge.textContent = 'OFF';
      straightenBadge.className = 'px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 text-slate-700';
      autoStraightenToggleBtn.classList.remove('border-indigo-600');
      autoStraightenToggleBtn.classList.add('border-slate-300');
    }
    updatePreviews();
  });

  aiEnhanceToggleBtn.addEventListener('click', () => {
    state.adjustments.aiEnhance = !state.adjustments.aiEnhance;
    if (state.adjustments.aiEnhance) {
      enhanceBadge.textContent = 'ON';
      enhanceBadge.className = 'px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-800';
      aiEnhanceToggleBtn.classList.add('border-indigo-600');
      aiEnhanceToggleBtn.classList.remove('border-slate-300');
    } else {
      enhanceBadge.textContent = 'OFF';
      enhanceBadge.className = 'px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 text-slate-700';
      aiEnhanceToggleBtn.classList.remove('border-indigo-600');
      aiEnhanceToggleBtn.classList.add('border-slate-300');
    }
    updatePreviews();
  });

  // Online Cloud AI Face Restoration (Unblur & Broken Face Repair)
  async function performFaceRestoration(mode = 'blurry_face') {
    if (!state.rawSourceImage) {
      alert('অনুগ্রহ করে প্রথমে একটি ছবি আপলোড করুন।');
      return;
    }

    if (!navigator.onLine) {
      alert('ইন্টারনেট সংযোগ পাওয়া যায়নি। অনলাইন এআই ফেস রিস্টোরেশনের জন্য ইন্টারনেট প্রয়োজন। অনুগ্রহ করে ইন্টারনেট কানেকশন অন করুন।');
      return;
    }

    const isBroken = mode === 'broken_face';
    if (isBroken) {
      showLoading(
        'এআই ভাঙ্গা মুখ মেরামত চলছে...',
        '১০০% ফ্রি অনলাইন এআই (RestoreFormer++ / GFPGAN) দিয়ে কাটা, ফাটা, খামচি ও খোসা ওঠা মুখ পুনর্গঠন করা হচ্ছে (অনুগ্রহ করে অপেক্ষা করুন)...'
      );
    } else {
      showLoading(
        'অনলাইন এআই ফেস রিস্টোরেশন চলছে...',
        'ক্লাউড CodeFormer AI দিয়ে পুরনো ও ঝাপসা ফেস নতুনের মতো পরিষ্কার করা হচ্ছে (অনুগ্রহ করে ২০-৩০ সেকেন্ড অপেক্ষা করুন)...'
      );
    }

    try {
      // Convert rawSourceImage to Blob
      let blob = null;
      if (state.rawSourceImage instanceof HTMLCanvasElement) {
        blob = await new Promise((res) => state.rawSourceImage.toBlob(res, 'image/jpeg', 0.95));
      } else {
        const c = document.createElement('canvas');
        c.width = state.rawSourceImage.naturalWidth || state.rawSourceImage.width;
        c.height = state.rawSourceImage.naturalHeight || state.rawSourceImage.height;
        const ctx = c.getContext('2d');
        ctx.drawImage(state.rawSourceImage, 0, 0);
        blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.95));
      }

      const formData = new FormData();
      formData.append('image', blob, 'face.jpg');
      formData.append('mode', mode);
      formData.append('fidelity', isBroken ? '0.2' : '0.6');
      const shouldRepairSkin = isBroken || (autoSkinRepairToggle ? autoSkinRepairToggle.checked : true);
      formData.append('repair_skin', shouldRepairSkin ? 'true' : 'false');

      // Send face landmarks and bounding box from MediaPipe for sub-millimeter symmetry alignment
      if (state.faceDetection) {
        if (state.faceDetection.landmarks && state.faceDetection.landmarks.length > 0) {
          formData.append('face_landmarks', JSON.stringify(state.faceDetection.landmarks));
        }
        if (state.faceDetection.boundingBox) {
          formData.append('face_box', JSON.stringify(state.faceDetection.boundingBox));
        }
      }

      const res = await fetch('/api/restore-face', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'অনলাইন এআই ফেস রিস্টোরেশনের জন্য ইন্টারনেট সংযোগ প্রয়োজন।');
      }

      const restoredBlob = await res.blob();
      const restoredUrl = URL.createObjectURL(restoredBlob);

      const restoredImg = new Image();
      restoredImg.onload = async () => {
        state.rawSourceImage = restoredImg;
        // Re-detect face & update segmentation with reference sizes and face-core guard
        const detections = await window.faceCropper.detectFace(restoredImg);
        state.faceDetection = detections && detections.length > 0 ? detections[0] : null;

        await extractPersonCutout();
        updatePreviews();
        hideLoading();
        setTimeout(() => {
          if (isBroken) {
            alert('✅ ভাঙ্গা মুখ সফলভাবে মেরামত হয়েছে! ফাটা, ছেঁড়া ও নষ্ট অংশ ফ্রি এআই দিয়ে নিখুঁত ফেস হিসেবে রিস্টোর করা হয়েছে।');
          } else {
            alert('✅ ফেস রিস্টোরেশন ও স্কিন মেরামত সফল হয়েছে! ঝাপসা মুখ পরিষ্কার হয়ে নিখুঁত ছবি তৈরি হয়েছে।');
          }
        }, 150);
      };
      restoredImg.onerror = () => {
        hideLoading();
        alert('রিস্টোর করা ছবি লোড করতে সমস্যা হয়েছে।');
      };
      restoredImg.src = restoredUrl;
    } catch (err) {
      console.error('Face restoration error:', err);
      hideLoading();
      alert('ফেস রিস্টোরেশন ব্যর্থ হয়েছে: ' + (err.message || 'ইন্টারনেট কানেকশন চেক করে আবার চেষ্টা করুন।'));
    }
  }

  // Bind Buttons
  if (cloudRestoreFaceBtn) {
    cloudRestoreFaceBtn.addEventListener('click', () => performFaceRestoration('blurry_face'));
  }
  if (fixBrokenFaceBtn) {
    fixBrokenFaceBtn.addEventListener('click', () => performFaceRestoration('broken_face'));
  }

  // Edge Choke Trim Slider
  adjustEdgeChoke.addEventListener('input', async (e) => {
    const val = parseInt(e.target.value, 10);
    state.adjustments.edgeChoke = val;
    edgeChokeValText.textContent = `${val}px`;
    showLoading('বর্ডার ট্রিম ও পেন-কাট রিফাইন হচ্ছে...', 'ছায়া ও দাগ দূর করা হচ্ছে');
    await extractPersonCutout();
    updatePreviews();
    hideLoading();
  });

  // -------------------------------------------------------------
  // Studio Touch-up Tool (AI Skin Healing & Background Eraser)
  // -------------------------------------------------------------
  if (window.eraserTool) {
    window.eraserTool.attach(passportCanvas, () => {
      // Sync to stamp canvas
      const sCtx = stampCanvas.getContext('2d');
      sCtx.drawImage(passportCanvas, 0, 0, stampCanvas.width, stampCanvas.height);
      if (!printModal.classList.contains('hidden')) {
        updateModalSheetPreview();
      }
    });
  }

  function updateBrushUI(mode, isActive) {
    if (!isActive) {
      if (eraserControlsBar) {
        eraserControlsBar.classList.add('hidden');
        eraserControlsBar.classList.remove('flex');
      }
      if (toggleSkinHealBtn) {
        toggleSkinHealBtn.classList.remove('bg-emerald-600', 'text-white');
        toggleSkinHealBtn.classList.add('bg-emerald-50', 'text-emerald-900');
        skinHealBtnText.textContent = '✨ AI স্কিন হিলিং ব্রাশ';
      }
      if (toggleEraserBtn) {
        toggleEraserBtn.classList.remove('bg-rose-600', 'text-white');
        toggleEraserBtn.classList.add('bg-white', 'text-slate-700');
        eraserBtnText.textContent = '🧹 ব্যাকগ্রাউন্ড ইরেজার';
      }
      return;
    }

    if (eraserControlsBar) {
      eraserControlsBar.classList.remove('hidden');
      eraserControlsBar.classList.add('flex');
    }

    if (mode === 'skin_heal') {
      if (toggleSkinHealBtn) {
        toggleSkinHealBtn.classList.add('bg-emerald-600', 'text-white');
        toggleSkinHealBtn.classList.remove('bg-emerald-50', 'text-emerald-900');
        skinHealBtnText.textContent = '🛑 হিলিং বন্ধ করুন';
      }
      if (toggleEraserBtn) {
        toggleEraserBtn.classList.remove('bg-rose-600', 'text-white');
        toggleEraserBtn.classList.add('bg-white', 'text-slate-700');
        eraserBtnText.textContent = '🧹 ব্যাকগ্রাউন্ড ইরেজার';
      }
      if (brushModeBadge) {
        brushModeBadge.textContent = 'স্কিন হিলিং মোড';
        brushModeBadge.className = 'px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300';
      }
      if (brushHintText) {
        brushHintText.textContent = 'ক্যানভাসে দাগ বা খোসা ওঠা স্থানে ক্লিক বা ব্রাশ করুন';
      }
      if (eraserSizeSlider) {
        eraserSizeSlider.className = 'w-20 accent-emerald-600 cursor-pointer';
      }
    } else {
      if (toggleEraserBtn) {
        toggleEraserBtn.classList.add('bg-rose-600', 'text-white');
        toggleEraserBtn.classList.remove('bg-white', 'text-slate-700');
        eraserBtnText.textContent = '🛑 ইরেজার বন্ধ করুন';
      }
      if (toggleSkinHealBtn) {
        toggleSkinHealBtn.classList.remove('bg-emerald-600', 'text-white');
        toggleSkinHealBtn.classList.add('bg-emerald-50', 'text-emerald-900');
        skinHealBtnText.textContent = '✨ AI স্কিন হিলিং ব্রাশ';
      }
      if (brushModeBadge) {
        brushModeBadge.textContent = 'ইরেজার মোড';
        brushModeBadge.className = 'px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300';
      }
      if (brushHintText) {
        brushHintText.textContent = 'ব্যাকগ্রাউন্ড বা অতিরিক্ত প্রান্ত মুছে ফেলুন';
      }
      if (eraserSizeSlider) {
        eraserSizeSlider.className = 'w-20 accent-rose-600 cursor-pointer';
      }
    }
  }

  if (toggleSkinHealBtn) {
    toggleSkinHealBtn.addEventListener('click', () => {
      const willBeActive = !(window.eraserTool.isActive && window.eraserTool.mode === 'skin_heal');
      window.eraserTool.setActive(willBeActive, 'skin_heal');
      updateBrushUI('skin_heal', willBeActive);
    });
  }

  if (toggleEraserBtn) {
    toggleEraserBtn.addEventListener('click', () => {
      const willBeActive = !(window.eraserTool.isActive && window.eraserTool.mode === 'eraser');
      window.eraserTool.setActive(willBeActive, 'eraser');
      updateBrushUI('eraser', willBeActive);
    });
  }

  if (brushCloseBtn) {
    brushCloseBtn.addEventListener('click', () => {
      window.eraserTool.setActive(false);
      updateBrushUI(window.eraserTool.mode, false);
    });
  }

  if (eraserSizeSlider) {
    eraserSizeSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      window.eraserTool.setBrushSize(val);
      if (brushSizeValText) brushSizeValText.textContent = `${val}px`;
    });
  }

  if (eraserUndoBtn) {
    eraserUndoBtn.addEventListener('click', () => {
      window.eraserTool.undo();
    });
  }

  // -------------------------------------------------------------
  // Background Color Selector Actions (Instantaneous - 0ms delay!)
  // -------------------------------------------------------------
  bgColorBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const color = btn.getAttribute('data-color');
      const name = btn.getAttribute('data-name');
      if (!color) return;

      bgColorBtns.forEach((b) => {
        b.classList.remove('active', 'border-brand-600', 'ring-2', 'ring-brand-500/20');
        b.classList.add('border-transparent');
      });
      btn.classList.add('active', 'border-brand-600', 'ring-2', 'ring-brand-500/20');
      btn.classList.remove('border-transparent');

      state.selectedBgColor = color;
      state.selectedBgName = name || color;
      currentBgNameEl.textContent = state.selectedBgName;
      window.activeStudioBgColor = color;

      // Instant update - no AI reprocessing required!
      updatePreviews();
    });
  });

  customColorPicker.addEventListener('input', (e) => {
    const color = e.target.value;
    state.selectedBgColor = color;
    state.selectedBgName = `Custom (${color})`;
    currentBgNameEl.textContent = state.selectedBgName;
    window.activeStudioBgColor = color;

    bgColorBtns.forEach((b) => {
      b.classList.remove('active', 'border-brand-600', 'ring-2', 'ring-brand-500/20');
      b.classList.add('border-transparent');
    });
    customColorPicker.parentElement.classList.add('active', 'border-brand-600', 'ring-2', 'ring-brand-500/20');

    // Instant update
    updatePreviews();
  });

  // -------------------------------------------------------------
  // Adjustment Sliders Listeners
  // -------------------------------------------------------------
  adjustZoom.addEventListener('input', (e) => {
    state.adjustments.zoom = parseFloat(e.target.value);
    zoomValText.textContent = `${Math.round(state.adjustments.zoom * 100)}%`;
    updatePreviews();
  });

  adjustRotate.addEventListener('input', (e) => {
    state.adjustments.rotation = parseFloat(e.target.value);
    rotateValText.textContent = `${state.adjustments.rotation}°`;
    updatePreviews();
  });

  adjustPanX.addEventListener('input', (e) => {
    state.adjustments.panX = parseInt(e.target.value, 10);
    panXValText.textContent = `${state.adjustments.panX}px`;
    updatePreviews();
  });

  adjustPanY.addEventListener('input', (e) => {
    state.adjustments.panY = parseInt(e.target.value, 10);
    panYValText.textContent = `${state.adjustments.panY}px`;
    updatePreviews();
  });

  adjustBrightness.addEventListener('input', (e) => {
    state.adjustments.brightness = parseInt(e.target.value, 10);
    brightValText.textContent = `${state.adjustments.brightness}%`;
    updatePreviews();
  });

  adjustContrast.addEventListener('input', (e) => {
    state.adjustments.contrast = parseInt(e.target.value, 10);
    contrastValText.textContent = `${state.adjustments.contrast}%`;
    updatePreviews();
  });

  adjustSharpness.addEventListener('input', (e) => {
    state.adjustments.sharpness = parseInt(e.target.value, 10);
    sharpnessValText.textContent = `${state.adjustments.sharpness}%`;
    updatePreviews();
  });

  adjustLight.addEventListener('input', (e) => {
    state.adjustments.light = parseInt(e.target.value, 10);
    lightValText.textContent = `${state.adjustments.light}%`;
    updatePreviews();
  });

  resetAdjustmentsBtn.addEventListener('click', async () => {
    state.adjustments = {
      zoom: 1.0,
      rotation: 0,
      panX: 0,
      panY: 0,
      brightness: 100,
      contrast: 100,
      sharpness: 100,
      light: 104,
      edgeChoke: 2,
      autoStraighten: true,
      aiEnhance: true,
    };
    adjustZoom.value = 1.0;
    adjustRotate.value = 0;
    adjustPanX.value = 0;
    adjustPanY.value = 0;
    adjustBrightness.value = 100;
    adjustContrast.value = 100;
    adjustSharpness.value = 100;
    adjustLight.value = 104;
    adjustEdgeChoke.value = 2;

    zoomValText.textContent = '100%';
    rotateValText.textContent = '0°';
    panXValText.textContent = '0px';
    panYValText.textContent = '0px';
    brightValText.textContent = '100%';
    contrastValText.textContent = '100%';
    sharpnessValText.textContent = '100%';
    lightValText.textContent = '104%';
    edgeChokeValText.textContent = '2px';

    straightenBadge.textContent = 'ON';
    straightenBadge.className = 'px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-800';
    autoStraightenToggleBtn.classList.add('border-indigo-600');

    enhanceBadge.textContent = 'ON';
    enhanceBadge.className = 'px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-800';
    aiEnhanceToggleBtn.classList.add('border-indigo-600');

    if (window.eraserTool && window.eraserTool.isActive) {
      window.eraserTool.setActive(false);
      eraserBtnText.textContent = '🧹 ম্যানুয়াল ইরেজার ব্রাশ অন করুন';
      toggleEraserBtn.classList.remove('bg-rose-50', 'border-rose-400', 'text-rose-700');
      eraserControlsBar.classList.add('hidden');
    }

    updatePreviews();
  });

  editorRetakeBtn.addEventListener('click', () => {
    if (window.eraserTool && window.eraserTool.isActive) {
      window.eraserTool.setActive(false);
      eraserBtnText.textContent = '🧹 ম্যানুয়াল ইরেজার ব্রাশ অন করুন';
      toggleEraserBtn.classList.remove('bg-rose-50', 'border-rose-400', 'text-rose-700');
      eraserControlsBar.classList.add('hidden');
    }
    setMode('upload');
  });

  // -------------------------------------------------------------
  // Single Photo Downloads
  // -------------------------------------------------------------
  downloadPassportJpgBtn.addEventListener('click', () => {
    window.printExportManager.downloadSingle(passportCanvas, 'jpg', 'passport_photo_35x45mm');
  });

  downloadPassportPngBtn.addEventListener('click', () => {
    window.printExportManager.downloadSingle(passportCanvas, 'png', 'passport_photo_35x45mm');
  });

  downloadStampJpgBtn.addEventListener('click', () => {
    window.printExportManager.downloadSingle(stampCanvas, 'jpg', 'stamp_photo_20x25mm');
  });

  downloadStampPngBtn.addEventListener('click', () => {
    window.printExportManager.downloadSingle(stampCanvas, 'png', 'stamp_photo_20x25mm');
  });

  // -------------------------------------------------------------
  // Print & PDF Sheet Modal
  // -------------------------------------------------------------
  function openPrintModal() {
    printModal.classList.remove('hidden');
    updateModalSheetPreview();
  }

  function closePrintModal() {
    printModal.classList.add('hidden');
  }

  function updateModalSheetPreview() {
    const layout = sheetLayoutSelect.value;
    const cutMarks = sheetCutMarksCheckbox.checked;
    const fullSheet = window.printExportManager.generateSheetCanvas(passportCanvas, stampCanvas, layout, cutMarks);

    modalSheetPreviewCanvas.width = fullSheet.width;
    modalSheetPreviewCanvas.height = fullSheet.height;
    const ctx = modalSheetPreviewCanvas.getContext('2d');
    ctx.drawImage(fullSheet, 0, 0);
  }

  openPrintModalBtn.addEventListener('click', openPrintModal);
  closePrintModalBtn.addEventListener('click', closePrintModal);
  modalCancelBtn.addEventListener('click', closePrintModal);

  sheetLayoutSelect.addEventListener('change', updateModalSheetPreview);
  sheetCutMarksCheckbox.addEventListener('change', updateModalSheetPreview);

  // Quick print passport
  quickPrintPassportBtn.addEventListener('click', () => {
    window.printExportManager.triggerDirectPrint(passportCanvas, stampCanvas, '4r_4_passport', true);
  });

  // Modal actions
  modalDownloadSheetBtn.addEventListener('click', () => {
    const layout = sheetLayoutSelect.value;
    const cutMarks = sheetCutMarksCheckbox.checked;
    const fullSheet = window.printExportManager.generateSheetCanvas(passportCanvas, stampCanvas, layout, cutMarks);
    window.printExportManager.downloadSingle(fullSheet, 'jpg', `photo_print_sheet_${layout}`);
  });

  modalDownloadPdfBtn.addEventListener('click', async () => {
    const layout = sheetLayoutSelect.value;
    const cutMarks = sheetCutMarksCheckbox.checked;
    showLoading('পিডিএফ তৈরি হচ্ছে...', 'ল্যাব কোয়ালিটি ভেক্টর পেপার জেনারেট হচ্ছে');
    await window.printExportManager.exportPDF(passportCanvas, stampCanvas, layout, cutMarks);
    hideLoading();
  });

  modalDirectPrintBtn.addEventListener('click', () => {
    const layout = sheetLayoutSelect.value;
    const cutMarks = sheetCutMarksCheckbox.checked;
    window.printExportManager.triggerDirectPrint(passportCanvas, stampCanvas, layout, cutMarks);
  });

  // -------------------------------------------------------------
  // Free AI API Modal Handlers
  // -------------------------------------------------------------
  function openApiModal() {
    const engine = window.backgroundSegmenter.activeEngine;
    const key = window.backgroundSegmenter.apiKey;

    if (engine === 'cloud') {
      engineCloud.checked = true;
      apiKeyGroup.classList.remove('hidden');
    } else {
      engineLocal.checked = true;
      apiKeyGroup.classList.add('hidden');
    }
    removebgApiKeyInput.value = key;
    apiModal.classList.remove('hidden');
  }

  function closeApiModal() {
    apiModal.classList.add('hidden');
  }

  engineLocal.addEventListener('change', () => {
    apiKeyGroup.classList.add('hidden');
  });

  engineCloud.addEventListener('change', () => {
    apiKeyGroup.classList.remove('hidden');
  });

  openApiSettingsBtn.addEventListener('click', openApiModal);
  closeApiModalBtn.addEventListener('click', closeApiModal);
  cancelApiSettingsBtn.addEventListener('click', closeApiModal);

  saveApiSettingsBtn.addEventListener('click', async () => {
    const isCloud = engineCloud.checked;
    const key = removebgApiKeyInput.value.trim();

    if (isCloud && !key) {
      alert('অনুগ্রহ করে Remove.bg এর API Key প্রদান করুন অথবা বিল্ট-ইন অফলাইন এআই নির্বাচন করুন।');
      return;
    }

    const engine = isCloud ? 'cloud' : 'choke';
    window.backgroundSegmenter.setApiSettings(key, engine);
    closeApiModal();

    // If an image is currently loaded, reprocess with chosen engine
    if (state.rawSourceImage) {
      showLoading('নতুন এআই ইঞ্জিন দিয়ে প্রসেসিং হচ্ছে...', 'পারফেক্ট পেন-কাট তৈরি হচ্ছে');
      await renderBackgroundComposite();
      updatePreviews();
      hideLoading();
    }
  });

  // -------------------------------------------------------------
  // Online AI Studio Assistant (Option B) Logic
  // -------------------------------------------------------------
  const AI_STUDIO_PROMPTS = {
    broken_face: "Ultra-detailed studio portrait photograph, restore broken face, fix cuts, scratches, skin flaws and blemishes. Perfectly symmetric natural eyes, clear facial features, realistic smooth skin texture, 8k resolution, professional passport lighting, sharp focus, authentic human photography.",
    navy_suit: "Professional formal portrait photograph, replace clothing with a tailored dark navy blue business suit, crisp white collar dress shirt, and executive navy blue patterned tie. Clean studio lighting, sharp details, official passport attire, realistic 8k photography.",
    black_blazer: "High quality studio portrait, replace outfit with a sharp modern black blazer suit jacket and crisp white dress shirt with neat collar. Elegant studio lighting, clean background, sharp fabric texture, realistic executive portrait, 8k.",
    modest_hijab: "Professional passport portrait photograph, modest elegant formal dress with beautifully draped clean solid color hijab headscarf. Natural facial skin tone, sharp clear eyes, gentle studio lighting, 8k resolution, realistic portrait.",
    studio_lighting: "Ultra high resolution 8k studio portrait photography, studio three-point lighting, crystal clear eye details, natural skin tone, unblur and sharpen, professional commercial photography, masterpiece, hyper-realistic."
  };

  function showStudioToast(title, msg, type = 'success') {
    const toast = document.getElementById('studio-toast');
    const toastTitle = document.getElementById('studio-toast-title');
    const toastMsg = document.getElementById('studio-toast-msg');
    const toastIcon = document.getElementById('studio-toast-icon');
    if (!toast) return;

    if (toastTitle) toastTitle.textContent = title;
    if (toastMsg) toastMsg.textContent = msg;
    if (toastIcon) {
      if (type === 'success') {
        toastIcon.className = 'w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 text-base';
        toastIcon.innerHTML = '<i class="fa-solid fa-check"></i>';
      } else if (type === 'info') {
        toastIcon.className = 'w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 text-base';
        toastIcon.innerHTML = '<i class="fa-solid fa-circle-info"></i>';
      } else {
        toastIcon.className = 'w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 text-base';
        toastIcon.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
      }
    }

    toast.classList.remove('translate-y-12', 'opacity-0', 'pointer-events-none');
    if (window._studioToastTimer) clearTimeout(window._studioToastTimer);
    window._studioToastTimer = setTimeout(() => {
      toast.classList.add('translate-y-12', 'opacity-0', 'pointer-events-none');
    }, 3800);
  }

  async function copyTextToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (e) {
        console.warn('navigator.clipboard.writeText failed:', e);
      }
    }
    try {
      const t = document.createElement('textarea');
      t.value = text;
      t.style.position = 'fixed';
      t.style.opacity = '0';
      document.body.appendChild(t);
      t.focus();
      t.select();
      const success = document.execCommand('copy');
      document.body.removeChild(t);
      return success;
    } catch (err) {
      console.error('Fallback copy failed:', err);
      return false;
    }
  }

  function openAIPortal() {
    const portalUrl = 'https://www.dola.com/chat/';
    const w = window.open(portalUrl, 'AIStudioPortal', 'width=1120,height=820,menubar=no,status=no,toolbar=no');
    if (!w || w.closed || typeof w.closed === 'undefined') {
      window.open(portalUrl, '_blank');
    }
    showStudioToast(
      'এআই পোর্টাল ওপেন হয়েছে!',
      'ইনগ্রেডিয়েন্ট ছবিটি আপলোড করুন এবং প্রম্পট পেস্ট (Ctrl+V) করে সেন্ড করুন।',
      'info'
    );
  }

  async function copyOrDownloadIngredientPhoto() {
    const source = state.rawSourceImage || state.personCutout;
    if (!source) {
      showStudioToast(
        'ছবি পাওয়া যায়নি',
        'অনুগ্রহ করে প্রথমে আপনার মূল ছবি আপলোড করুন অথবা ড্রপ করুন।',
        'warning'
      );
      return;
    }

    const c = document.createElement('canvas');
    c.width = source.naturalWidth || source.videoWidth || source.width;
    c.height = source.naturalHeight || source.videoHeight || source.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(source, 0, 0);

    let clipboardSuccess = false;
    if (navigator.clipboard && navigator.clipboard.write && window.ClipboardItem) {
      try {
        const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
        if (blob) {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          clipboardSuccess = true;
        }
      } catch (err) {
        console.warn('Clipboard image copy failed, downloading instead:', err);
      }
    }

    // Also download so user has file on disk
    if (window.printExportManager && window.printExportManager.downloadSingle) {
      window.printExportManager.downloadSingle(c, 'jpg', 'ingredient_reference_photo');
    }

    if (clipboardSuccess) {
      showStudioToast(
        'ছবি কপি ও সেভ হয়েছে!',
        'ছবি ক্লিপবোর্ডে কপি হয়েছে (পোর্টালে Ctrl+V পেস্ট করুন) এবং ফোল্ডারেও সেভ হয়েছে।'
      );
    } else {
      showStudioToast(
        'ছবি সেভ হয়েছে!',
        'ইনগ্রেডিয়েন্ট ছবিটি ডাউনলোড ফোল্ডারে সেভ হয়েছে। এটি এআই পোর্টালে ড্রপ বা আপলোড করুন।'
      );
    }
  }

  function ingestAIResultFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      alert('অনুগ্রহ করে একটি সঠিক ছবির ফাইল (JPG/PNG) দিন।');
      return;
    }
    showLoading('এআই ছবি প্রসেস হচ্ছে...', 'স্বয়ংক্রিয় ব্যাকগ্রাউন্ড রিমুভ ও পাসপোর্ট-স্ট্যাম্প সাইজ প্রস্তুত হচ্ছে');
    loadImageFromFile(file);
    showStudioToast(
      'এআই ছবি গ্রহণ করা হয়েছে!',
      'স্বয়ংক্রিয়ভাবে ব্যাকগ্রাউন্ড রিমুভ ও পারফেক্ট পাসপোর্ট সাইজ তৈরি হচ্ছে।'
    );
  }

  // Setup prompt boxes with default text
  const uploadAiPromptBox = document.getElementById('upload-ai-prompt-box');
  const editorAiPromptBox = document.getElementById('editor-ai-prompt-box');
  if (uploadAiPromptBox) uploadAiPromptBox.value = AI_STUDIO_PROMPTS.broken_face;
  if (editorAiPromptBox) editorAiPromptBox.value = AI_STUDIO_PROMPTS.broken_face;

  // Preset Buttons Handling
  document.querySelectorAll('.ai-preset-chip').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const presetKey = btn.getAttribute('data-preset');
      const promptText = AI_STUDIO_PROMPTS[presetKey] || '';

      // Update active states in all preset lists
      document.querySelectorAll(`.ai-preset-chip[data-preset="${presetKey}"]`).forEach((b) => {
        const parent = b.closest('.ai-prompt-preset-list');
        if (parent) {
          parent.querySelectorAll('.ai-preset-chip').forEach((el) => {
            el.classList.remove('active', 'bg-indigo-600', 'text-white', 'border-indigo-400/40');
            el.classList.add('bg-white/10', 'text-slate-200', 'border-white/10');
          });
        }
        b.classList.add('active', 'bg-indigo-600', 'text-white', 'border-indigo-400/40');
        b.classList.remove('bg-white/10', 'text-slate-200', 'border-white/10');
      });

      if (uploadAiPromptBox) uploadAiPromptBox.value = promptText;
      if (editorAiPromptBox) editorAiPromptBox.value = promptText;
    });
  });

  // Copy Prompt Actions
  document.querySelectorAll('.copy-ai-prompt-action').forEach((btn) => {
    btn.addEventListener('click', async () => {
      let textToCopy = '';
      if (state.currentMode === 'editor' && editorAiPromptBox && editorAiPromptBox.value) {
        textToCopy = editorAiPromptBox.value;
      } else if (uploadAiPromptBox && uploadAiPromptBox.value) {
        textToCopy = uploadAiPromptBox.value;
      } else if (editorAiPromptBox && editorAiPromptBox.value) {
        textToCopy = editorAiPromptBox.value;
      }

      if (!textToCopy) textToCopy = AI_STUDIO_PROMPTS.broken_face;

      const ok = await copyTextToClipboard(textToCopy);
      if (ok) {
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check mr-1"></i><span>কপি হয়েছে!</span>';
        btn.classList.add('bg-emerald-700');
        setTimeout(() => {
          btn.innerHTML = originalHTML;
          btn.classList.remove('bg-emerald-700');
        }, 2200);

        showStudioToast(
          'প্রম্পট কপি হয়েছে!',
          'এআই পোর্টালে গিয়ে পেস্ট (Ctrl+V) করুন এবং ছবি সহ সেন্ড করুন।'
        );
      } else {
        showStudioToast('কপি ব্যর্থ হয়েছে', 'অনুগ্রহ করে টেক্সটটি ম্যানুয়ালি সিলেক্ট করে কপি করুন।', 'warning');
      }
    });
  });

  // Copy Ingredient Photo Actions
  document.querySelectorAll('.copy-ingredient-photo-action').forEach((btn) => {
    btn.addEventListener('click', () => {
      copyOrDownloadIngredientPhoto();
    });
  });

  // Open Portal Actions
  document.querySelectorAll('.open-ai-portal-action').forEach((btn) => {
    btn.addEventListener('click', () => {
      openAIPortal();
    });
  });

  // Dropzones Setup for AI Result
  document.querySelectorAll('.ai-ingest-dropzone').forEach((zone) => {
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('border-emerald-400', 'bg-emerald-950/40');
    });

    zone.addEventListener('dragleave', () => {
      zone.classList.remove('border-emerald-400', 'bg-emerald-950/40');
    });

    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('border-emerald-400', 'bg-emerald-950/40');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        ingestAIResultFile(e.dataTransfer.files[0]);
      }
    });
  });

  document.querySelectorAll('.ai-ingest-file-input').forEach((input) => {
    input.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        ingestAIResultFile(e.target.files[0]);
      }
    });
  });

  // Global Image Paste (Ctrl+V) Listener
  window.addEventListener('paste', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
      return;
    }
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          ingestAIResultFile(file);
          break;
        }
      }
    }
  });

  // Editor Drawer Toggle
  const editorAiToggleBtn = document.getElementById('editor-ai-assistant-toggle-btn');
  const editorAiDrawer = document.getElementById('editor-ai-assistant-drawer');
  const editorAiArrowIcon = document.getElementById('editor-ai-arrow-icon');

  if (editorAiToggleBtn && editorAiDrawer) {
    editorAiToggleBtn.addEventListener('click', () => {
      const isHidden = editorAiDrawer.classList.contains('hidden');
      if (isHidden) {
        editorAiDrawer.classList.remove('hidden');
        if (editorAiArrowIcon) editorAiArrowIcon.classList.add('rotate-180');
      } else {
        editorAiDrawer.classList.add('hidden');
        if (editorAiArrowIcon) editorAiArrowIcon.classList.remove('rotate-180');
      }
    });
  }

  // Header Nav Launcher Button
  const navAiAssistantBtn = document.getElementById('nav-ai-assistant-btn');
  if (navAiAssistantBtn) {
    navAiAssistantBtn.addEventListener('click', () => {
      if (state.currentMode === 'editor') {
        if (editorAiDrawer && editorAiDrawer.classList.contains('hidden')) {
          editorAiDrawer.classList.remove('hidden');
          if (editorAiArrowIcon) editorAiArrowIcon.classList.add('rotate-180');
        }
        editorAiDrawer.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        const panel = document.getElementById('upload-ai-assistant-panel');
        if (panel) {
          panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    });
  }

  // -------------------------------------------------------------
  // In-App Auto-Update Handlers
  // -------------------------------------------------------------
  const checkUpdateBtn = document.getElementById('check-update-btn');
  const updateModal = document.getElementById('update-modal');
  const closeUpdateModalBtn = document.getElementById('close-update-modal-btn');
  const closeUpdateModalFooterBtn = document.getElementById('close-update-modal-footer-btn');
  const currentVerBadge = document.getElementById('current-ver-badge');
  const latestVerBadge = document.getElementById('latest-ver-badge');
  const updateChangelogGroup = document.getElementById('update-changelog-group');
  const updateChangelogText = document.getElementById('update-changelog-text');
  const updateMsgText = document.getElementById('update-msg-text');
  const applyUpdateBtn = document.getElementById('apply-update-btn');
  const updateAvailableDot = document.getElementById('update-available-dot');
  const navVerText = document.getElementById('nav-ver-text');

  async function checkAppUpdate(silent = false) {
    if (!silent) {
      if (updateModal) updateModal.classList.remove('hidden');
      if (latestVerBadge) latestVerBadge.textContent = 'চেক করা হচ্ছে...';
      if (updateMsgText) updateMsgText.textContent = 'গিটহাব থেকে আপডেটের তথ্য যাচাই করা হচ্ছে...';
      if (applyUpdateBtn) applyUpdateBtn.classList.add('hidden');
    }

    try {
      const res = await fetch('/api/check-update');
      const data = await res.json();

      if (data.local_version && navVerText) {
        navVerText.textContent = `v${data.local_version}`;
      }
      if (currentVerBadge && data.local_version) {
        currentVerBadge.textContent = `v${data.local_version}`;
      }

      if (data.has_update) {
        if (updateAvailableDot) updateAvailableDot.classList.remove('hidden');
        if (latestVerBadge) latestVerBadge.textContent = `v${data.remote_version} (নতুন ভার্সন!)`;
        if (updateChangelogGroup && data.changelog) {
          updateChangelogGroup.classList.remove('hidden');
          if (updateChangelogText) updateChangelogText.textContent = data.changelog;
        }
        if (updateMsgText) {
          updateMsgText.innerHTML = '<span class="text-indigo-600 font-bold">🎉 একটি নতুন আপডেট পাওয়া গেছে!</span> এক ক্লিকেই আপডেট করতে নিচের বাটনে চাপ দিন।';
        }
        if (applyUpdateBtn) applyUpdateBtn.classList.remove('hidden');

        if (!silent) {
          showStudioToast('নতুন আপডেট উপলব্ধ!', `ভার্সন v${data.remote_version} পাওয়া গেছে।`, 'info');
        }
      } else {
        if (updateAvailableDot) updateAvailableDot.classList.add('hidden');
        if (latestVerBadge) latestVerBadge.textContent = `v${data.local_version} (লেটেস্ট)`;
        if (updateChangelogGroup) updateChangelogGroup.classList.add('hidden');
        if (updateMsgText) {
          if (data.error) {
            updateMsgText.textContent = data.error;
          } else {
            updateMsgText.textContent = '✅ আপনি সর্বশেষ ভার্সন ব্যবহার করছেন। কোনো আপডেটের প্রয়োজন নেই।';
          }
        }
        if (applyUpdateBtn) applyUpdateBtn.classList.add('hidden');
      }
    } catch (err) {
      console.warn('Update check failed:', err);
      if (!silent && updateMsgText) {
        updateMsgText.textContent = 'আপডেট সার্ভারের সাথে সংযোগ করা যায়নি। ইন্টারনেট সংযোগ চেক করুন।';
      }
    }
  }

  async function applyAppUpdate() {
    if (!applyUpdateBtn) return;
    const originalHTML = applyUpdateBtn.innerHTML;
    applyUpdateBtn.disabled = true;
    applyUpdateBtn.innerHTML = '<i class="fa-solid fa-spinner animate-spin mr-1"></i><span>আপডেট ডাউনলোড হচ্ছে...</span>';

    try {
      const res = await fetch('/api/apply-update', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        if (updateMsgText) {
          updateMsgText.innerHTML = '<span class="text-emerald-600 font-bold">✅ ' + (data.message || 'আপডেট সম্পন্ন হয়েছে!') + '</span> ২ সেকেন্ডের মধ্যে পেজ রিলোড হবে...';
        }
        showStudioToast('আপডেট সফল!', 'সফটওয়্যার সফলভাবে আপডেট হয়েছে। পেজ রিলোড হচ্ছে...', 'success');
        setTimeout(() => {
          window.location.reload();
        }, 2200);
      } else {
        alert('আপডেট ব্যর্থ হয়েছে: ' + (data.error || 'অজানা ত্রুটি'));
        applyUpdateBtn.disabled = false;
        applyUpdateBtn.innerHTML = originalHTML;
      }
    } catch (err) {
      alert('আপডেট প্রসেস চলাকালে সমস্যা হয়েছে: ' + err.message);
      applyUpdateBtn.disabled = false;
      applyUpdateBtn.innerHTML = originalHTML;
    }
  }

  if (checkUpdateBtn) {
    checkUpdateBtn.addEventListener('click', () => checkAppUpdate(false));
  }
  if (closeUpdateModalBtn) {
    closeUpdateModalBtn.addEventListener('click', () => updateModal.classList.add('hidden'));
  }
  if (closeUpdateModalFooterBtn) {
    closeUpdateModalFooterBtn.addEventListener('click', () => updateModal.classList.add('hidden'));
  }
  if (applyUpdateBtn) {
    applyUpdateBtn.addEventListener('click', applyAppUpdate);
  }

  // Check update silently in background after 3s on startup
  setTimeout(() => {
    checkAppUpdate(true);
  }, 3000);

  // -------------------------------------------------------------
  // Documentation Modal Handlers
  // -------------------------------------------------------------
  function openDocsModal() {
    if (docsModal) docsModal.classList.remove('hidden');
  }

  function closeDocsModal() {
    if (docsModal) docsModal.classList.add('hidden');
  }

  if (openDocsBtn) openDocsBtn.addEventListener('click', openDocsModal);
  if (footerDocsBtn) footerDocsBtn.addEventListener('click', openDocsModal);
  if (closeDocsModalBtn) closeDocsModalBtn.addEventListener('click', closeDocsModal);
  if (closeDocsModalFooterBtn) closeDocsModalFooterBtn.addEventListener('click', closeDocsModal);
  if (docsModal) {
    docsModal.addEventListener('click', (e) => {
      if (e.target === docsModal) closeDocsModal();
    });
  }
});

