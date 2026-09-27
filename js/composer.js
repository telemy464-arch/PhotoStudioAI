/**
 * PhotoStudio AI - Computer Compose & Document Studio Module (js/composer.js)
 * High-performance AI Document Generation, OCR Handwriting Transcription,
 * A4 Studio Print & Word (.doc) Export.
 * Powered by Free Gemini API, Puter.js, and Offline Bangladeshi Studio Templates.
 */

(function () {
  'use strict';

  // State
  const composerState = {
    attachedFiles: [], // { id, name, size, type, isImage, isText, isPdf, dataUrl, textContent }
    geminiApiKey: localStorage.getItem('composer_gemini_api_key') || '',
    selectedEngine: localStorage.getItem('composer_selected_engine') || 'auto', // 'auto' | 'gemini' | 'puter'
    isComposing: false,
    currentRawText: '',
    currentDocTitle: 'কম্পিউটার কম্পোজ ডকুমেন্ট',
  };

  // DOM Elements cache
  let promptInput,
    attachmentsTray,
    fileInput,
    submitBtn,
    clearBtn,
    addFileBtn,
    printableSheet,
    docTitleEl,
    printBtn,
    downloadDocBtn,
    downloadTxtBtn,
    copyBtn,
    openDolaBtn,
    openGeminiBtn,
    engineStatusPill,
    engineLabelEl,
    composerApiModal,
    openSettingsBtn,
    closeSettingsBtn,
    cancelSettingsBtn,
    saveSettingsBtn,
    geminiKeyInput;

  // Initialize Composer Module
  function initComposer() {
    promptInput = document.getElementById('compose-prompt-input');
    attachmentsTray = document.getElementById('compose-attachments-tray');
    fileInput = document.getElementById('compose-file-input');
    submitBtn = document.getElementById('compose-submit-btn');
    clearBtn = document.getElementById('compose-clear-btn');
    addFileBtn = document.getElementById('compose-add-file-btn');
    printableSheet = document.getElementById('compose-printable-sheet');
    docTitleEl = document.getElementById('compose-doc-title');
    printBtn = document.getElementById('compose-print-btn');
    downloadDocBtn = document.getElementById('compose-download-doc-btn');
    downloadTxtBtn = document.getElementById('compose-download-txt-btn');
    copyBtn = document.getElementById('compose-copy-btn');
    openDolaBtn = document.getElementById('open-dola-portal-btn');
    openGeminiBtn = document.getElementById('open-gemini-portal-btn');
    engineStatusPill = document.getElementById('composer-engine-status-pill');
    engineLabelEl = document.getElementById('composer-engine-label');

    composerApiModal = document.getElementById('composer-api-modal');
    openSettingsBtn = document.getElementById('open-composer-settings-btn');
    closeSettingsBtn = document.getElementById('close-composer-api-modal-btn');
    cancelSettingsBtn = document.getElementById('cancel-composer-api-btn');
    saveSettingsBtn = document.getElementById('save-composer-api-btn');
    geminiKeyInput = document.getElementById('composer-gemini-key-input');

    if (!promptInput || !submitBtn) return;

    // Load saved settings
    if (geminiKeyInput && composerState.geminiApiKey) {
      geminiKeyInput.value = composerState.geminiApiKey;
    }
    updateEngineBadge();

    // Event Listeners
    submitBtn.addEventListener('click', handleComposeSubmit);
    fileInput.addEventListener('change', handleFileInputChange);
    clearBtn.addEventListener('click', handleClearPrompt);

    if (addFileBtn) {
      addFileBtn.addEventListener('click', () => fileInput.click());
    }

    if (printBtn) {
      printBtn.addEventListener('click', printComposeDocument);
    }

    if (downloadDocBtn) {
      downloadDocBtn.addEventListener('click', downloadAsWordDoc);
    }

    if (downloadTxtBtn) {
      downloadTxtBtn.addEventListener('click', downloadAsTextFile);
    }

    if (copyBtn) {
      copyBtn.addEventListener('click', copyComposedText);
    }

    if (openDolaBtn) {
      openDolaBtn.addEventListener('click', () => openExternalPortal('dola'));
    }

    if (openGeminiBtn) {
      openGeminiBtn.addEventListener('click', () => openExternalPortal('gemini'));
    }

    // Preset Chips
    document.querySelectorAll('#composer-preset-chips button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const preset = btn.getAttribute('data-preset');
        applyPreset(preset);
      });
    });

    // Formatting Toolbar Buttons
    document.querySelectorAll('.format-cmd-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const cmd = btn.getAttribute('data-cmd');
        const val = btn.getAttribute('data-val') || null;
        if (cmd) {
          document.execCommand(cmd, false, val);
          printableSheet.focus();
        }
      });
    });

    // Modal Events
    if (openSettingsBtn) {
      openSettingsBtn.addEventListener('click', openSettingsModal);
    }
    if (engineStatusPill) {
      engineStatusPill.addEventListener('click', openSettingsModal);
    }
    if (closeSettingsBtn) {
      closeSettingsBtn.addEventListener('click', closeSettingsModal);
    }
    if (cancelSettingsBtn) {
      cancelSettingsBtn.addEventListener('click', closeSettingsModal);
    }
    if (saveSettingsBtn) {
      saveSettingsBtn.addEventListener('click', saveSettings);
    }

    // Auto-grow textarea
    promptInput.addEventListener('input', () => {
      promptInput.style.height = 'auto';
      promptInput.style.height = Math.max(64, Math.min(220, promptInput.scrollHeight)) + 'px';
    });
  }

  // Update Status Pill UI
  function updateEngineBadge() {
    if (!engineLabelEl) return;
    if (composerState.geminiApiKey) {
      engineLabelEl.textContent = 'AI Engine: Gemini Pro / Flash (Active)';
    } else if (composerState.selectedEngine === 'puter') {
      engineLabelEl.textContent = 'AI Engine: Puter.js (Zero-Key)';
    } else {
      engineLabelEl.textContent = 'AI Engine: Puter / Gemini Free';
    }
  }

  // Preset Prompts
  const PRESET_DATA = {
    leave_app: {
      title: 'ছুটির দরখাস্ত',
      prompt: 'অফিসের/প্রতিষ্ঠানের প্রধান বরাবর ৩ দিনের শারীরিক অসুস্থতাজনিত অনুপস্থিতির ছুটির জন্য একটি মার্জিত ও আনুষ্ঠানিক আবেদনপত্র তৈরি করুন।',
    },
    job_app: {
      title: 'চাকরির আবেদনপত্র',
      prompt: 'একটি স্বনামধন্য প্রতিষ্ঠানে "অফিস সহকারী ও কম্পিউটার অপারেটর" পদের জন্য আবেদনপত্র তৈরি করুন। শিক্ষাগত যোগ্যতা ও অভিজ্ঞতার সারসংক্ষেপ সহ প্রমিত ফরম্যাটে লিখুন।',
    },
    biodata_cv: {
      title: 'পূর্ণাঙ্গ জীবনবৃত্তান্ত (CV)',
      prompt: 'চাকরি বা বিয়ের জন্য একটি পূর্ণাঙ্গ জীবনবৃত্তান্ত (Curriculum Vitae / Biodata) তৈরি করুন। নাম, পিতা-মাতা, বর্তমান ও স্থায়ী ঠিকানা, শিক্ষাগত যোগ্যতার ছক (SSC, HSC, Degree), কম্পিউটার দক্ষতা ও রেফারেন্সের স্পষ্ট বিবরণ দিন।',
    },
    rent_agree: {
      title: 'বাসা ভাড়ার চুক্তিপত্র',
      prompt: 'বাড়িওয়ালা (১ম পক্ষ) ও ভাড়াটিয়া (২য় পক্ষ)-এর মধ্যে একটি স্ট্যান্ডার্ড বাসা ভাড়ার চুক্তিপত্র (Rental Agreement) তৈরি করুন। মাসিক ভাড়া, অগ্রিম জামানত, মেয়াদ এবং নোটিশ পিরিয়ডের শর্তাবলী স্পষ্টভাবে সংযুক্ত করুন।',
    },
    certificate: {
      title: 'অভিজ্ঞতার প্রত্যয়নপত্র',
      prompt: 'প্রতিষ্ঠানের পক্ষ থেকে কর্মরত একজন কর্মকর্তা/কর্মচারীর জন্য সন্তোষজনক দায়িত্ব পালন ও চারিত্রিক প্রশংসাপত্র / অভিজ্ঞতার প্রত্যয়নপত্র তৈরি করুন।',
    },
    ocr_handwriting: {
      title: 'হাতের লেখা ও ছবি দেখে টাইপ',
      prompt: 'সংযুক্ত ছবি বা কাগজের লেখাটি যত্নসহকারে সম্পূর্ণ পড়ুন এবং হুবহু নির্ভুল বানান ও ফরম্যাটে কম্পিউটার কম্পোজ করে সাজিয়ে দিন।',
    },
    translation: {
      title: 'ইংরেজি থেকে বাংলা অনুবাদ',
      prompt: 'সংযুক্ত ইংরেজি লেখা বা নির্দেশাবলী সহজ, প্রাতিষ্ঠানিক ও সাবলীল প্রমিত বাংলায় নির্ভুলভাবে অনুবাদ করে সাজিয়ে দিন।',
    },
  };

  function applyPreset(key) {
    const data = PRESET_DATA[key];
    if (!data || !promptInput) return;

    promptInput.value = data.prompt;
    promptInput.focus();
    promptInput.style.height = 'auto';
    promptInput.style.height = Math.max(64, Math.min(220, promptInput.scrollHeight)) + 'px';

    showStudioToast('প্রিসেট যুক্ত হয়েছে', `"${data.title}" প্রম্পট ইনপুট বক্সে বসে গেছে।`);
  }

  // File Input Handler
  function handleFileInputChange(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    files.forEach((file) => {
      const fileId = 'file_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const isImg = file.type.startsWith('image/');
      const isTxt = file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md');
      const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');

      const fileObj = {
        id: fileId,
        rawFile: file,
        name: file.name,
        size: formatFileSize(file.size),
        type: file.type || 'application/octet-stream',
        isImage: isImg,
        isText: isTxt,
        isPdf: isPdf,
        dataUrl: null,
        textContent: '',
      };

      if (isImg || isPdf) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          fileObj.dataUrl = evt.target.result;
          renderAttachmentChips();
        };
        reader.readAsDataURL(file);
      } else if (isTxt) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          fileObj.textContent = evt.target.result;
          renderAttachmentChips();
        };
        reader.readAsText(file);
      } else {
        // Generic file: read as dataURL for upload
        const reader = new FileReader();
        reader.onload = (evt) => {
          fileObj.dataUrl = evt.target.result;
          renderAttachmentChips();
        };
        reader.readAsDataURL(file);
      }

      composerState.attachedFiles.push(fileObj);
    });

    renderAttachmentChips();
    // Reset file input so same file can be re-selected if removed
    fileInput.value = '';
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  function renderAttachmentChips() {
    if (!attachmentsTray) return;

    if (!composerState.attachedFiles.length) {
      attachmentsTray.classList.add('hidden');
      attachmentsTray.innerHTML = '';
      return;
    }

    attachmentsTray.classList.remove('hidden');
    attachmentsTray.innerHTML = '';

    composerState.attachedFiles.forEach((f) => {
      const chip = document.createElement('div');
      chip.className =
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-indigo-200 text-xs text-slate-700 shadow-sm';

      let iconHtml = '<i class="fa-solid fa-file text-slate-400"></i>';
      if (f.isImage && f.dataUrl) {
        iconHtml = `<img src="${f.dataUrl}" class="w-5 h-5 rounded object-cover border border-slate-200" />`;
      } else if (f.isImage) {
        iconHtml = '<i class="fa-solid fa-file-image text-indigo-500"></i>';
      } else if (f.isPdf) {
        iconHtml = '<i class="fa-solid fa-file-pdf text-rose-500"></i>';
      } else if (f.isText) {
        iconHtml = '<i class="fa-solid fa-file-lines text-blue-500"></i>';
      }

      chip.innerHTML = `
        ${iconHtml}
        <span class="max-w-[150px] truncate font-medium text-slate-800" title="${f.name}">${f.name}</span>
        <span class="text-[10px] text-slate-400">(${f.size})</span>
        <button type="button" class="remove-chip-btn text-slate-400 hover:text-rose-500 ml-1 transition" title="মুছে ফেলুন">
          <i class="fa-solid fa-xmark"></i>
        </button>
      `;

      chip.querySelector('.remove-chip-btn').addEventListener('click', () => {
        composerState.attachedFiles = composerState.attachedFiles.filter((item) => item.id !== f.id);
        renderAttachmentChips();
      });

      attachmentsTray.appendChild(chip);
    });
  }

  function handleClearPrompt() {
    if (promptInput) {
      promptInput.value = '';
      promptInput.style.height = '64px';
    }
    composerState.attachedFiles = [];
    renderAttachmentChips();
  }

  // Settings Modal Handlers
  function openSettingsModal() {
    if (composerApiModal) {
      if (geminiKeyInput) geminiKeyInput.value = composerState.geminiApiKey;
      const radios = composerApiModal.querySelectorAll('input[name="composer_engine"]');
      radios.forEach((r) => {
        if (r.value === composerState.selectedEngine) r.checked = true;
      });
      composerApiModal.classList.remove('hidden');
    }
  }

  function closeSettingsModal() {
    if (composerApiModal) {
      composerApiModal.classList.add('hidden');
    }
  }

  function saveSettings() {
    if (geminiKeyInput) {
      composerState.geminiApiKey = geminiKeyInput.value.trim();
      localStorage.setItem('composer_gemini_api_key', composerState.geminiApiKey);
    }
    const checkedRadio = composerApiModal.querySelector('input[name="composer_engine"]:checked');
    if (checkedRadio) {
      composerState.selectedEngine = checkedRadio.value;
      localStorage.setItem('composer_selected_engine', composerState.selectedEngine);
    }
    updateEngineBadge();
    closeSettingsModal();
    showStudioToast('সেটিংস সংরক্ষিত হয়েছে', 'এআই ইঞ্জিন সফলভাবে আপডেট হয়েছে।');
  }

  // Main Submit Action
  async function handleComposeSubmit() {
    const rawPrompt = (promptInput?.value || '').trim();
    const hasFiles = composerState.attachedFiles.length > 0;

    if (!rawPrompt && !hasFiles) {
      alert('অনুগ্রহ করে কোনো প্রম্পট লিখুন অথবা "+" বাটনে ক্লিক করে ছবি/ফাইল যুক্ত করুন।');
      promptInput?.focus();
      return;
    }

    if (composerState.isComposing) return;
    composerState.isComposing = true;

    // Show loading state in A4 sheet
    renderLoadingSheet();

    // Scroll smoothly to preview container
    const resultContainer = document.getElementById('compose-result-container');
    if (resultContainer) {
      resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    try {
      let generatedText = '';

      // Prepare context with any text file content
      let fullPrompt = rawPrompt;
      const textAttachments = composerState.attachedFiles.filter((f) => f.isText && f.textContent);
      if (textAttachments.length > 0) {
        fullPrompt += '\n\n--- [সংযুক্ত ফাইলসমূহ থেকে প্রাপ্ত টেক্সট] ---\n';
        textAttachments.forEach((f) => {
          fullPrompt += `\n[ফাইল: ${f.name}]:\n${f.textContent}\n`;
        });
      }

      const imageAttachments = composerState.attachedFiles.filter((f) => f.isImage && f.dataUrl);

      // Strategy 1: If Gemini API key is configured or user chose Gemini (or has image/handwriting)
      if (composerState.geminiApiKey || (imageAttachments.length > 0 && composerState.geminiApiKey)) {
        try {
          console.log('[Composer] Calling Google Gemini API...');
          generatedText = await callGeminiApi(fullPrompt, imageAttachments, composerState.geminiApiKey);
        } catch (geminiErr) {
          console.warn('[Composer] Gemini API failed:', geminiErr);
          // If gemini fails, proceed to fallback
        }
      }

      // Strategy 2: If no output yet, try Puter.js browser AI
      if (!generatedText && window.puter && window.puter.ai) {
        try {
          console.log('[Composer] Calling Puter.js AI...');
          generatedText = await callPuterAi(fullPrompt);
        } catch (puterErr) {
          console.warn('[Composer] Puter.js failed:', puterErr);
        }
      }

      // Strategy 3: If still no output, try Backend Flask /api/ai-compose
      if (!generatedText) {
        try {
          console.log('[Composer] Calling Backend /api/ai-compose...');
          generatedText = await callBackendAi(fullPrompt, imageAttachments);
        } catch (backendErr) {
          console.warn('[Composer] Backend failed:', backendErr);
        }
      }

      // Strategy 4: Built-in Offline Bangladeshi Studio Template Engine
      if (!generatedText) {
        console.log('[Composer] Using Offline Bangladeshi Studio Template Engine...');
        generatedText = generateOfflineStudioDocument(fullPrompt);
      }

      // Display rendered document
      renderDocumentSheet(generatedText, rawPrompt);
      showStudioToast('কম্পোজ সম্পন্ন হয়েছে!', 'আপনি সরাসরি পেজে ক্লিক করে যেকোনো লেখা সম্পাদনা করতে পারেন।');
    } catch (err) {
      console.error('[Composer] Final error:', err);
      printableSheet.innerHTML = `
        <div class="text-center py-16 text-rose-600 space-y-3">
          <i class="fa-solid fa-triangle-exclamation text-4xl"></i>
          <h3 class="text-base font-bold">কম্পোজ করতে সমস্যা হয়েছে</h3>
          <p class="text-xs text-slate-600 max-w-md mx-auto">${err.message || 'অনুগ্রহ করে আবার চেষ্টা করুন।'}</p>
        </div>
      `;
    } finally {
      composerState.isComposing = false;
    }
  }

  // -------------------------------------------------------------
  // AI Engines
  // -------------------------------------------------------------

  // Tier 1: Google Gemini API (Multimodal, handwriting, text)
  async function callGeminiApi(promptText, images, apiKey) {
    const systemPrompt = `You are an elite, highly professional Bengali Computer Studio Composer and Document Specialist (কম্পিউটার দোকান ও স্টুডিও কম্পোজার).
Your task is to produce 100% complete, flawless, formal documents in standard Bangladeshi official format (প্রমিত বাংলা).
Output ONLY the final document with clean formatting:
- Proper date, recipient (বরাবর), subject (বিষয়), salutation (জনাব/মহোদয়), body paragraphs, closing, and signature blocks.
- If the user asks for a CV/Biodata, use a clean table format for educational qualifications and neat bullet points.
- If images or handwriting are provided, transcribe and type the text accurately with correct Bengali spelling.
- Do NOT include conversational filler like "Here is your document:". Provide only the ready-to-print document text.`;

    const parts = [{ text: systemPrompt + '\n\n[User Request / Instruction]:\n' + promptText }];

    // Add multimodal image parts
    images.forEach((img) => {
      if (img.dataUrl && img.dataUrl.includes(',')) {
        const mimeType = img.type || 'image/jpeg';
        const base64Data = img.dataUrl.split(',')[1];
        parts.push({
          inline_data: {
            mime_type: mimeType,
            data: base64Data,
          },
        });
      }
    });

    const payload = {
      contents: [{ parts: parts }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2500,
      },
    };

    // Try models in order: gemini-2.5-flash -> gemini-2.0-flash -> gemini-1.5-flash
    const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    let lastError = null;

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data = await res.json();
          const candidate = data.candidates && data.candidates[0];
          if (candidate && candidate.content && candidate.content.parts) {
            const outText = candidate.content.parts.map((p) => p.text).join('\n');
            if (outText.trim()) return outText;
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          lastError = new Error(errData.error?.message || `HTTP ${res.status}`);
        }
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error('Gemini API call failed.');
  }

  // Tier 2: Puter.js Browser AI
  async function callPuterAi(promptText) {
    if (!window.puter || !window.puter.ai || !window.puter.ai.chat) {
      throw new Error('Puter.js not loaded');
    }

    const fullInstruction = `You are a professional Bangladeshi Computer Studio Document Specialist.
Create a complete, formal, beautifully structured Bengali document (ছুটির দরখাস্ত, চাকরির আবেদন, জীবনবৃত্তান্ত, চুক্তিপত্র ইত্যাদি) based on the user request.
Output only the finished document ready for A4 printing with date, subject, salutation, paragraphs, and signature.
User Request:
${promptText}`;

    const res = await window.puter.ai.chat(fullInstruction);
    if (!res) throw new Error('Empty response from Puter.js');

    if (typeof res === 'string') return res;
    if (res.message && res.message.content) return res.message.content;
    if (res.text) return res.text;
    return JSON.stringify(res);
  }

  // Tier 3: Backend Flask Server /api/ai-compose
  async function callBackendAi(promptText, images) {
    const payload = {
      prompt: promptText,
      api_key: composerState.geminiApiKey || '',
      images: images.map((img) => ({
        type: img.type || 'image/jpeg',
        base64: img.dataUrl ? img.dataUrl.split(',')[1] : '',
      })),
    };

    const res = await fetch('/api/ai-compose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error('Backend compose API responded with ' + res.status);
    const data = await res.json();
    if (!data.success || !data.content) {
      throw new Error(data.error || 'Backend failed to generate content');
    }
    return data.content;
  }

  // Tier 4: Built-in Offline Bangladeshi Studio Template Engine
  function generateOfflineStudioDocument(promptText) {
    const todayBn = getBanglaDate();
    const lower = promptText.toLowerCase();

    // 1. Leave Application (ছুটির দরখাস্ত)
    if (
      lower.includes('ছুটি') ||
      lower.includes('ছুটির') ||
      lower.includes('দরখাস্ত') ||
      lower.includes('leave') ||
      lower.includes('অসুস্থ')
    ) {
      return `তারিখ: ${todayBn}

বরাবর,
মহাব্যবস্থাপক / প্রধান শিক্ষক,
[প্রতিষ্ঠানের নাম / বিদ্যালয়ের নাম লিখুন],
[ঠিকানা, ঢাকা - ১২০০]।

বিষয়: শারীরিক অসুস্থতাজনিত কারণে ছুটির জন্য আবেদন।

জনাব/মহোদয়,
যথাবিহিত সম্মান প্রদর্শনপূর্বক বিনীত নিবেদন এই যে, আমি আপনার প্রতিষ্ঠানে কর্মরত একজন নিয়মিত কর্মী / শিক্ষার্থী। গত [শুরুর তারিখ] হতে হঠাৎ তীব্র জ্বর ও শারীরিক অসুস্থতায় আক্রান্ত হওয়ার কারণে আমার পক্ষে যথাসময়ে উপস্থিত হয়ে দায়িত্ব পালন করা সম্ভব হয়নি। চিকিৎসকের পরামর্শ অনুযায়ী আমাকে আগামী [শেষের তারিখ] পর্যন্ত সম্পূর্ণ বিশ্রামে থাকার নির্দেশ দেওয়া হয়েছে।

অতএব, বিনীত প্রার্থনা এই যে, উপরোক্ত পরিস্থিতি বিবেচনাপূর্বক আমাকে উল্লেখিত [৩ দিনের] নৈমিত্তিক ছুটি মঞ্জুর করতে আপনার সদয় মর্জি হয়।

বিনীত নিবেদক,
[আপনার নাম]
পদবী / শ্রেণি: [অফিস সহকারী / ১০ম শ্রেণি]
মোবাইল: ০১৭XXXXXXXX
স্বাক্ষর: ____________________`;
    }

    // 2. Job Application (চাকরির আবেদন)
    if (
      lower.includes('চাকরি') ||
      lower.includes('আবেদন') ||
      lower.includes('নিয়োগ') ||
      lower.includes('পদ') ||
      lower.includes('job')
    ) {
      return `তারিখ: ${todayBn}

বরাবর,
ব্যবস্থাপনা পরিচালক / নিয়োগকারী কর্তৃপক্ষ,
[কোম্পানি বা প্রতিষ্ঠানের নাম],
[ঠিকানা, ঢাকা]।

বিষয়: "অফিস সহকারী ও কম্পিউটার অপারেটর" পদে নিয়োগের জন্য আবেদন।

জনাব/মহোদয়,
বিনীত নিবেদন এই যে, গত [বিজ্ঞপ্তির তারিখ] তারিখে দৈনিক পত্রিকায় প্রকাশিত বিজ্ঞপ্তির মাধ্যমে আমি জানতে পারলাম যে, আপনার স্বনামধন্য প্রতিষ্ঠানে "অফিস সহকারী ও কম্পিউটার অপারেটর" পদে কিছুসংখ্যক জনবল নিয়োগ করা হবে। আমি উক্ত পদের একজন যোগ্য ও আগ্রহী প্রার্থী হিসেবে আমার প্রয়োজনীয় শিক্ষাগত যোগ্যতা ও জীবনবৃত্তান্ত আপনার সদয় বিবেচনার জন্য নিচে পেশ করছি:

১. নাম: [আপনার পূর্ণ নাম]
২. পিতা: [পিতার নাম]
৩. মাতা: [মাতার নাম]
৪. শিক্ষাগত যোগ্যতা: স্নাতক / এইচএসসি পাস
৫. কম্পিউটার অভিজ্ঞতা: এমএস ওয়ার্ড, এক্সেল, ইন্টারনেট ও বাংলা-ইংরেজি টাইপিংয়ে দক্ষ।

সংযুক্তি:
১. জীবনবৃত্তান্ত (CV) - ১ কপি
২. শিক্ষাগত যোগ্যতার সনদের সত্যায়িত কপি
৩. জাতীয় পরিচয়পত্রের কপি ও ২ কপি পাসপোর্ট সাইজ ছবি

অতএব, আকুল প্রার্থনা এই যে, আমাকে উক্ত পদে নিয়োগের নিমিত্তে লিখিত ও মৌখিক পরীক্ষায় অংশগ্রহণের সুযোগ দানে আপনার সদয় বিবেচনা কামনা করছি।

বিনীত নিবেদক,
[আপনার পূর্ণ নাম]
মোবাইল: ০১৮XXXXXXXX
স্বাক্ষর: ____________________`;
    }

    // 3. Biodata / CV (জীবনবৃত্তান্ত)
    if (
      lower.includes('সিভি') ||
      lower.includes('জীবনবৃত্তান্ত') ||
      lower.includes('বায়োডাটা') ||
      lower.includes('cv') ||
      lower.includes('biodata')
    ) {
      return `# পূর্ণাঙ্গ জীবনবৃত্তান্ত (CURRICULUM VITAE)

**নাম:** [আপনার পূর্ণ নাম]  
**মোবাইল:** ০১৭XXXXXXXX | **ইমেইল:** yourname@email.com  
**বর্তমান ঠিকানা:** বাসা নং- [ ], রোড নং- [ ], [এলাকা], ঢাকা।  
**স্থায়ী ঠিকানা:** গ্রাম- [ ], ডাকঘর- [ ], উপজেলা- [ ], জেলা- [ ]।  

---

### ব্যক্তিগত তথ্যাবলী:
- **পিতার নাম:** [পিতার পূর্ণ নাম]
- **মাতার নাম:** [মাতার পূর্ণ নাম]
- **জন্ম তারিখ:** [০১/০১/২০০০]
- **জাতীয়তা:** বাংলাদেশী (জন্মসূত্রে)
- **ধর্ম:** ইসলাম / সনাতন
- **বৈবাহিক অবস্থা:** অবিবাহিত / বিবাহিত
- **জাতীয় পরিচয়পত্র নং:** [১২৩৪৫৬৭৮৯০]

---

### শিক্ষাগত যোগ্যতা:
| পরীক্ষার নাম | বিভাগ / গ্রুপ | পাসের সন | প্রাপ্ত জিপিএ/বিভাগ | বোর্ড / বিশ্ববিদ্যালয় |
|---|---|---|---|---|
| স্নাতক (বিএ/বিএসসি) | মানবিক / বিজ্ঞান | ২০২০ | ৩.২৫ | জাতীয় বিশ্ববিদ্যালয় |
| এইচ.এস.সি (HSC) | বিজ্ঞান / ব্যবসায় শিক্ষা | ২০১৬ | ৪.৫০ | ঢাকা বোর্ড |
| এস.এস.সি (SSC) | সাধারণ | ২০১৪ | ৪.৭৫ | ঢাকা বোর্ড |

---

### কম্পিউটার ও অন্যান্য দক্ষতা:
- বাংলা ও দ্রুত ইংরেজি টাইপিং (কম্পিউটার কম্পোজ)।
- মাইক্রোসফট অফিস (MS Word, Excel, PowerPoint) ও ফটোশপ বেসিক।
- ইন্টারনেট ব্রাউজিং, ইমেইল ও ডাটা এন্ট্রি কার্যক্রম।

**স্বাক্ষর ও তারিখ:**  
____________________`;
    }

    // 4. Rental Agreement (ভাড়ার চুক্তিপত্র)
    if (
      lower.includes('ভাড়া') ||
      lower.includes('চুক্তি') ||
      lower.includes('চুক্তিপত্র') ||
      lower.includes('বাড়িওয়ালা') ||
      lower.includes('rent')
    ) {
      return `# দ্বিপাক্ষিক বাসা ভাড়ার চুক্তিপত্র

**১ম পক্ষ (বাড়ির মালিক):**  
নাম: [মালিকের নাম], পিতা: [পিতার নাম], জাতীয় পরিচয়পত্র: [XXXXXXXXXX], ঠিকানা: [পূর্ণ ঠিকানা]।  

**২য় পক্ষ (ভাড়াটিয়া):**  
নাম: [ভাড়াটিয়ার নাম], পিতা: [পিতার নাম], জাতীয় পরিচয়পত্র: [XXXXXXXXXX], স্থায়ী ঠিকানা: [পূর্ণ ঠিকানা]।  

পরম করুনাময় মহান সৃষ্টিকর্তার নাম স্মরণ করিয়া অদ্য [${todayBn}] তারিখে উভয় পক্ষ স্বেচ্ছায় ও সুস্থ মস্তিষ্কে এই চুক্তি সম্পাদন করিতেছেন:

### শর্তাবলী:
১. **ভাড়ার মেয়াদ:** এই চুক্তিপত্র আগামী [০১ মাস] হইতে পরবর্তী [১ (এক) বছর] পর্যন্ত বলবৎ থাকিবে।
২. **মাসিক ভাড়া:** ফ্ল্যাটটির মাসিক ভাড়া বাবদ সর্বমোট **[১৫,০০০/- (পনেরো হাজার)]** টাকা নির্ধারিত হইল। প্রতি মাসের ৫ তারিখের মধ্যে ভাড়া পরিশোধ করিতে হইবে।
৩. **অগ্রিম জামানত:** ২য় পক্ষ ১ম পক্ষকে অগ্রিম জামানত বাবদ **[৩০,০০০/- (ত্রিশ হাজার)]** টাকা নগদ প্রদান করিলেন। চুক্তি শেষে সম্পূর্ণ অর্থ ফেরতযোগ্য।
৪. **বিদ্যুৎ ও গ্যাস বিল:** বিদ্যুৎ ও ইউটিলিটি বিল ২য় পক্ষ ব্যবহার অনুযায়ী যথাসময়ে নিজ দায়িত্বে পরিশোধ করিবেন।
৫. **চুক্তি বাতিল:** কোনো পক্ষ চুক্তি বাতিল করিতে চাহিলে অন্য পক্ষকে ন্যূনতম ২ (দুই) মাস পূর্বে লিখিত নোটিশ প্রদান করিতে হইবে।

উভয় পক্ষ এই চুক্তিপত্রের শর্তাবলী মনোযোগসহ পাঠ করিয়া সানন্দে নিজ নিজ স্বাক্ষর প্রদান করিলেন।

**১ম পক্ষের স্বাক্ষর (মালিক):** ____________________  
**২য় পক্ষের স্বাক্ষর (ভাড়াটিয়া):** ____________________  
**সাক্ষীগণের স্বাক্ষর:** ১. ____________________  ২. ____________________`;
    }

    // Default: Professional Official Note/Letter
    return `তারিখ: ${todayBn}

বরাবর,
সংশ্লিষ্ট কর্তৃপক্ষ / মহোদয়,
[প্রতিষ্ঠানের নাম ও ঠিকানা]।

বিষয়: ${promptText.substring(0, 50)} প্রসঙ্গে।

জনাব,
সবিনয় নিবেদন এই যে, আমি আপনার অবগতির জন্য জানাচ্ছি যে, ${promptText}

অতএব, মহোদয়ের নিকট আকুল প্রার্থনা, বিষয়টি সুবিবেচনাপূর্বক প্রয়োজনীয় ব্যবস্থা গ্রহণে আপনার সদয় মর্জি কামনা করছি।

ধন্যবাদান্তে,
[আপনার নাম]
[মোবাইল / ঠিকানা]
স্বাক্ষর: ____________________`;
  }

  // -------------------------------------------------------------
  // Rendering & Formatting
  // -------------------------------------------------------------

  function renderLoadingSheet() {
    if (!printableSheet) return;
    printableSheet.innerHTML = `
      <div class="flex flex-col items-center justify-center py-28 space-y-4">
        <div class="w-14 h-14 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
        <div class="text-center space-y-1">
          <h3 class="text-base font-bold text-slate-800">এআই প্রফেশনাল ডকুমেন্ট কম্পোজ করছে...</h3>
          <p class="text-xs text-slate-500">আপনার প্রম্পট ও ফাইল বিশ্লেষণ করে নিখুঁত A4 পেপারে সাজানো হচ্ছে</p>
        </div>
      </div>
    `;
  }

  function renderDocumentSheet(rawText, userPrompt) {
    if (!printableSheet) return;

    composerState.currentRawText = rawText;

    // Detect Title
    let title = 'কম্পিউটার কম্পোজ ডকুমেন্ট';
    if (userPrompt.includes('ছুটি')) title = 'ছুটির দরখাস্ত';
    else if (userPrompt.includes('চাকরি')) title = 'চাকরির আবেদনপত্র';
    else if (userPrompt.includes('সিভি') || userPrompt.includes('জীবনবৃত্তান্ত')) title = 'জীবনবৃত্তান্ত (CV)';
    else if (userPrompt.includes('ভাড়া') || userPrompt.includes('চুক্তি')) title = 'বাসা ভাড়ার চুক্তিপত্র';
    else if (userPrompt.includes('প্রত্যয়ন')) title = 'প্রত্যয়নপত্র';

    composerState.currentDocTitle = title;
    if (docTitleEl) docTitleEl.textContent = title + ' (A4 শিট প্রিভিউ)';

    // Convert markdown to clean HTML
    const formattedHtml = markdownToHtml(rawText);

    printableSheet.innerHTML = `
      <div class="document-content-wrapper space-y-3 leading-relaxed text-slate-900">
        ${formattedHtml}
      </div>
    `;
  }

  // Lightweight Markdown to HTML Converter
  function markdownToHtml(md) {
    if (!md) return '';

    let html = md;

    // Escape HTML tags to prevent XSS
    html = html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Markdown Tables
    html = html.replace(/\n(\|.+?\|\n\|[-:\s|]+?\|\n(?:\|.+?\|\n?)+)/g, (match, tableText) => {
      const rows = tableText.trim().split('\n');
      if (rows.length < 2) return match;

      const headerCols = rows[0]
        .split('|')
        .slice(1, -1)
        .map((c) => `<th>${c.trim()}</th>`)
        .join('');
      let tbodyHtml = '';

      for (let i = 2; i < rows.length; i++) {
        const rowCols = rows[i]
          .split('|')
          .slice(1, -1)
          .map((c) => `<td>${c.trim()}</td>`)
          .join('');
        tbodyHtml += `<tr>${rowCols}</tr>`;
      }

      return `<table class="w-full my-4 border-collapse border border-slate-300">
        <thead><tr class="bg-slate-100 font-bold">${headerCols}</tr></thead>
        <tbody>${tbodyHtml}</tbody>
      </table>`;
    });

    // Headings
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-base font-bold text-slate-900 mt-4 mb-1">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold text-slate-900 mt-4 mb-2 pb-1 border-b border-slate-200">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-xl font-black text-slate-900 text-center mb-4">$1</h1>');

    // Bold & Italic
    html = html.replace(/\*\*\*(.*?)\*\*\*/gim, '<b><i>$1</i></b>');
    html = html.replace(/\*\*(.*?)\*\*/gim, '<b>$1</b>');
    html = html.replace(/\*(.*?)\*/gim, '<i>$1</i>');

    // Horizontal Rules
    html = html.replace(/^\s*---\s*$/gim, '<hr class="my-4 border-slate-200" />');

    // Unordered Lists
    html = html.replace(/^\s*-\s+(.*$)/gim, '<li class="ml-4 list-disc">$1</li>');

    // Convert double newlines into paragraphs
    const paragraphs = html.split(/\n\s*\n/);
    html = paragraphs
      .map((p) => {
        p = p.trim();
        if (
          !p.startsWith('<h1') &&
          !p.startsWith('<h2') &&
          !p.startsWith('<h3') &&
          !p.startsWith('<table') &&
          !p.startsWith('<hr')
        ) {
          return `<p class="mb-2 leading-relaxed">${p.replace(/\n/g, '<br />')}</p>`;
        }
        return p;
      })
      .join('\n');

    return html;
  }

  // -------------------------------------------------------------
  // Export & Action Functions
  // -------------------------------------------------------------

  // 1. A4 Print Document
  function printComposeDocument() {
    if (!printableSheet) return;

    document.body.classList.add('printing-compose');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-compose');
    }, 1200);
  }

  // 2. Download as Microsoft Word (.doc)
  function downloadAsWordDoc() {
    if (!printableSheet) return;

    const contentHtml = printableSheet.innerHTML;
    const title = composerState.currentDocTitle || 'Computer_Compose_Document';

    const wordDocHtml = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset='utf-8'>
<title>${title}</title>
<style>
  body {
    font-family: 'SolaimanLipi', 'Kalpurush', 'Segoe UI', Arial, sans-serif;
    font-size: 14pt;
    line-height: 1.7;
    color: #000000;
  }
  h1 { font-size: 18pt; text-align: center; margin-bottom: 12pt; font-weight: bold; }
  h2 { font-size: 16pt; margin-top: 14pt; margin-bottom: 8pt; font-weight: bold; }
  h3 { font-size: 14pt; margin-top: 12pt; margin-bottom: 6pt; font-weight: bold; }
  p { margin: 0 0 10pt 0; text-align: justify; }
  table { width: 100%; border-collapse: collapse; margin: 12pt 0; }
  th, td { border: 1px solid #777777; padding: 6pt 8pt; font-size: 12pt; }
  th { background-color: #f2f2f2; font-weight: bold; }
</style>
</head>
<body>
  ${contentHtml}
</body>
</html>`;

    const blob = new Blob(['\ufeff', wordDocHtml], {
      type: 'application/msword;charset=utf-8',
    });

    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = `${title.replace(/\s+/g, '_')}_${Date.now()}.doc`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    showStudioToast('Word ফাইল প্রস্তুত', 'Microsoft Word (.doc) ফাইল সফলভাবে ডাউনলোড হয়েছে।');
  }

  // 3. Download Plain Text (.txt)
  function downloadAsTextFile() {
    if (!printableSheet) return;

    const text = printableSheet.innerText || composerState.currentRawText;
    const title = composerState.currentDocTitle || 'Document';

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = `${title.replace(/\s+/g, '_')}_${Date.now()}.txt`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    showStudioToast('টেক্সট ফাইল প্রস্তুত', '.txt ফাইল ডাউনলোড হয়েছে।');
  }

  // 4. Copy to Clipboard
  function copyComposedText() {
    if (!printableSheet) return;

    const text = printableSheet.innerText || composerState.currentRawText;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        showStudioToast('টেক্সট কপি হয়েছে', 'সম্পূর্ণ ডকুমেন্ট ক্লিপবোর্ডে কপি করা হয়েছে।');
      })
      .catch(() => {
        showStudioToast('কপি ব্যর্থ হয়েছে', 'অনুগ্রহ করে ম্যানুয়ালি টেক্সট সিলেক্ট করে কপি করুন।', 'error');
      });
  }

  // 5. External AI Portals (Dola.com / Gemini Web)
  function openExternalPortal(portal) {
    const promptText = (promptInput?.value || '').trim();

    if (promptText) {
      navigator.clipboard.writeText(promptText).catch(() => {});
    }

    if (portal === 'dola') {
      window.open('https://web.dola.com', '_blank');
      showStudioToast('Dola.com ওপেন হয়েছে', 'আপনার প্রম্পটটি কপি করা হয়েছে! Dola পেজে গিয়ে পেস্ট (Ctrl+V) করুন।');
    } else if (portal === 'gemini') {
      window.open('https://gemini.google.com/app', '_blank');
      showStudioToast('Gemini Web ওপেন হয়েছে', 'আপনার প্রম্পটটি কপি করা হয়েছে! Gemini পেজে গিয়ে পেস্ট (Ctrl+V) করুন।');
    }
  }

  // Helper: Toast Notification
  function showStudioToast(title, msg, type = 'success') {
    const toast = document.getElementById('studio-toast');
    const toastTitle = document.getElementById('studio-toast-title');
    const toastMsg = document.getElementById('studio-toast-msg');
    const toastIcon = document.getElementById('studio-toast-icon');

    if (!toast) return;

    toastTitle.textContent = title;
    toastMsg.textContent = msg;

    if (type === 'error') {
      toastIcon.className =
        'w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center flex-shrink-0 text-base';
      toastIcon.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
    } else {
      toastIcon.className =
        'w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 text-base';
      toastIcon.innerHTML = '<i class="fa-solid fa-check"></i>';
    }

    toast.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-12');
    toast.classList.add('opacity-100', 'translate-y-0');

    clearTimeout(window.__composerToastTimer);
    window.__composerToastTimer = setTimeout(() => {
      toast.classList.remove('opacity-100', 'translate-y-0');
      toast.classList.add('opacity-0', 'pointer-events-none', 'translate-y-12');
    }, 3800);
  }

  function getBanglaDate() {
    const date = new Date();
    const bnNums = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    const bnMonths = [
      'জানুয়ারি',
      'ফেব্রুয়ারি',
      'মার্চ',
      'এপ্রিল',
      'মে',
      'জুন',
      'জুলাই',
      'আগস্ট',
      'সেপ্টেম্বর',
      'অক্টোবর',
      'নভেম্বর',
      'ডিসেম্বর',
    ];

    const toBn = (n) =>
      String(n)
        .split('')
        .map((d) => bnNums[d] || d)
        .join('');

    const day = toBn(date.getDate());
    const month = bnMonths[date.getMonth()];
    const year = toBn(date.getFullYear());

    return `${day} ${month}, ${year} ইং`;
  }

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initComposer);
  } else {
    initComposer();
  }

  // Export to global scope
  window.composerManager = {
    init: initComposer,
    applyPreset: applyPreset,
    printDoc: printComposeDocument,
    downloadWord: downloadAsWordDoc,
  };
})();
