/**
 * DocFit - Main UI Controller
 * Manages state, event handlers, presets, conversions, and downloads.
 */

document.addEventListener('DOMContentLoaded', () => {
  // App State
  const state = {
    file: null,
    fileBuffer: null,
    fileType: null, // 'image', 'pdf', 'html'
    fileName: '',
    originalSizeKb: 0,
    originalWidth: 0,
    originalHeight: 0,
    originalDpi: 72,
    activePresetId: null,
    activeFormat: 'image/jpeg',
    resizeMode: 'percentage', // 'percentage', 'exact', 'crop'
    percentage: 100,
    exactWidth: 3.5,
    exactHeight: 4.5,
    exactUnit: 'cm',
    lockAspect: true,
    aspectRatio: '3.5:4.5',
    dpi: 300,
    enforceSize: true,
    minKb: 20,
    maxKb: 50,
    pdfPageSize: 'A4',
    selectedPdfPage: 1,
    totalPdfPages: 1,
    pdfPassword: '',
    pdfProtectChoice: 'none', // 'none', 'same', 'new'
    pdfDoc: null,
    activeCanvas: null,
    cropper: null,
    cropCoords: null,
    resultBlob: null,
    resultStats: null,
    batchResults: null,
    zipBlob: null
  };

  // DOM Elements
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const fileSummaryCard = document.getElementById('fileSummaryCard');
  const btnRemoveFile = document.getElementById('btnRemoveFile');
  const pdfControlsCard = document.getElementById('pdfControlsCard');
  const pdfPageSelect = document.getElementById('pdfPageSelect');
  const pdfTotalPages = document.getElementById('pdfTotalPages');
  const pdfPasswordCard = document.getElementById('pdfPasswordCard');
  const pdfPasswordInput = document.getElementById('pdfPasswordInput');
  const btnTogglePassword = document.getElementById('btnTogglePassword');
  const btnUnlockPdf = document.getElementById('btnUnlockPdf');
  const passwordErrorMsg = document.getElementById('passwordErrorMsg');
  const cardSamePassword = document.getElementById('cardSamePassword');
  const protectRadioButtons = document.querySelectorAll('input[name="pdfProtectRadio"]');
  const protectCardChoices = document.querySelectorAll('.protect-card-choice');
  const newPasswordPanel = document.getElementById('newPasswordPanel');
  const pdfNewPasswordInput = document.getElementById('pdfNewPasswordInput');
  const btnToggleNewPassword = document.getElementById('btnToggleNewPassword');
  const configSection = document.getElementById('configSection');
  const resultSection = document.getElementById('resultSection');
  const presetsContainer = document.getElementById('presetsContainer');

  // Format elements
  const formatChips = document.querySelectorAll('.format-chip');
  const formatHelperText = document.getElementById('formatHelperText');

  // Dimension & Mode elements
  const segButtons = document.querySelectorAll('.seg-btn');
  const panelPercentage = document.getElementById('panelPercentage');
  const panelExact = document.getElementById('panelExact');
  const panelCrop = document.getElementById('panelCrop');
  const scaleSlider = document.getElementById('scaleSlider');
  const scaleNumber = document.getElementById('scaleNumber');
  const pctChips = document.querySelectorAll('.chip-sm[data-pct]');
  const exactWidthInput = document.getElementById('exactWidthInput');
  const exactHeightInput = document.getElementById('exactHeightInput');
  const exactUnitSelect = document.getElementById('exactUnitSelect');
  const lockAspectCheckbox = document.getElementById('lockAspectCheckbox');
  const pixelCalcBadge = document.getElementById('pixelCalcBadge');
  const aspectRatioSelect = document.getElementById('aspectRatioSelect');
  const btnResetCrop = document.getElementById('btnResetCrop');
  const cropperWrapper = document.getElementById('cropperWrapper');

  // DPI elements
  const dpiChips = document.querySelectorAll('.dpi-chips .chip-sm');
  const customDpiInput = document.getElementById('customDpiInput');

  // Target Size elements
  const enforceSizeToggle = document.getElementById('enforceSizeToggle');
  const targetSizeInputsContainer = document.getElementById('targetSizeInputsContainer');
  const minKbInput = document.getElementById('minKbInput');
  const maxKbInput = document.getElementById('maxKbInput');
  const sizeChips = document.querySelectorAll('.chip-sm[data-size]');

  // PDF options
  const pdfOutputOptions = document.getElementById('pdfOutputOptions');
  const pdfPageSizeSelect = document.getElementById('pdfPageSizeSelect');

  // Action & Result elements
  const btnProcess = document.getElementById('btnProcess');
  const processStatusText = document.getElementById('processStatusText');
  const statusBanner = document.getElementById('statusBanner');
  const statusMessage = document.getElementById('statusMessage');
  const resultImagePreview = document.getElementById('resultImagePreview');
  const pdfResultBadge = document.getElementById('pdfResultBadge');
  const btnDownload = document.getElementById('btnDownload');
  const downloadBtnText = document.getElementById('downloadBtnText');
  const btnCopyClipboard = document.getElementById('btnCopyClipboard');
  const copyBtnText = document.getElementById('copyBtnText');
  const singleResultActions = document.getElementById('singleResultActions');
  const batchResultActions = document.getElementById('batchResultActions');
  const btnDownloadZip = document.getElementById('btnDownloadZip');
  const downloadZipBtnText = document.getElementById('downloadZipBtnText');
  const btnDownloadIndividual = document.getElementById('btnDownloadIndividual');
  const downloadIndividualBtnText = document.getElementById('downloadIndividualBtnText');
  const btnEditSettings = document.getElementById('btnEditSettings');
  const btnNewFile = document.getElementById('btnNewFile');

  // Side Panel & Tab elements
  const btnSidePanel = document.getElementById('btnSidePanel');
  const btnNewTab = document.getElementById('btnNewTab');

  // Initialize
  initPresets();
  setupEventListeners();

  function initPresets() {
    presetsContainer.innerHTML = '';
    DocFitPresets.forEach((p) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `preset-card-btn ${p.id === 'passport' ? 'active' : ''}`;
      btn.dataset.presetId = p.id;
      btn.innerHTML = `
        <div class="preset-top-row">
          <span class="preset-icon">${p.icon}</span>
          <span class="preset-name">${p.name}</span>
        </div>
        <span class="preset-badge-tag">${p.badge}</span>
      `;
      btn.addEventListener('click', () => applyPreset(p));
      presetsContainer.appendChild(btn);
    });
  }

  function applyPreset(preset) {
    state.activePresetId = preset.id;
    document.querySelectorAll('.preset-card-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.presetId === preset.id);
    });

    if (preset.id === 'custom') return;

    // Apply format
    state.activeFormat = preset.format;
    updateFormatChipsUI();

    // Apply DPI
    state.dpi = preset.dpi;
    customDpiInput.value = preset.dpi;
    updateDpiChipsUI();

    // Apply Target KB Range
    state.minKb = preset.minKb;
    state.maxKb = preset.maxKb;
    minKbInput.value = preset.minKb || '';
    maxKbInput.value = preset.maxKb || '';
    state.enforceSize = (preset.minKb > 0 || preset.maxKb > 0);
    enforceSizeToggle.checked = state.enforceSize;
    targetSizeInputsContainer.classList.toggle('hidden', !state.enforceSize);

    // Apply Dimensions mode
    if (preset.resizeMode === 'exact') {
      switchResizeMode('exact');
      state.exactWidth = preset.width;
      state.exactHeight = preset.height;
      state.exactUnit = preset.unit;
      exactWidthInput.value = preset.width;
      exactHeightInput.value = preset.height;
      exactUnitSelect.value = preset.unit;
      state.lockAspect = preset.lockAspect !== false;
      lockAspectCheckbox.checked = state.lockAspect;
      updatePixelCalculationBadge();
    } else if (preset.resizeMode === 'percentage') {
      switchResizeMode('percentage');
      state.percentage = preset.percentage || 100;
      scaleSlider.value = state.percentage;
      scaleNumber.value = state.percentage;
      updatePercentageChipsUI();
    }

    // Aspect ratio in cropper
    if (preset.aspectRatio && state.cropper) {
      aspectRatioSelect.value = preset.aspectRatio;
      state.cropper.setAspectRatio(preset.aspectRatio);
    }
  }

  function setupEventListeners() {
    // Dropzone & File Input
    dropzone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelect(e.target.files[0]);
      }
    });

    // Drag and drop events
    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
      }, false);
    });

    dropzone.addEventListener('drop', (e) => {
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    });

    // Global Clipboard Paste listener (Ctrl+V)
    window.addEventListener('paste', (e) => {
      if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
        handleFileSelect(e.clipboardData.files[0]);
      }
    });

    btnRemoveFile.addEventListener('click', resetAll);

    // Password Unlock for Protected PDFs
    btnTogglePassword.addEventListener('click', () => {
      const isPass = pdfPasswordInput.type === 'password';
      pdfPasswordInput.type = isPass ? 'text' : 'password';
      btnTogglePassword.textContent = isPass ? '🙈' : '👁️';
    });

    btnUnlockPdf.addEventListener('click', handleUnlockPdfSubmit);

    pdfPasswordInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleUnlockPdfSubmit();
      }
    });

    // Output PDF Protection Radio Selection
    protectRadioButtons.forEach(radio => {
      radio.addEventListener('change', () => {
        state.pdfProtectChoice = radio.value;
        protectCardChoices.forEach(card => {
          card.classList.toggle('active', card.dataset.protect === radio.value);
        });
        newPasswordPanel.classList.toggle('hidden', radio.value !== 'new');
        if (radio.value === 'new') {
          setTimeout(() => pdfNewPasswordInput.focus(), 100);
        }
      });
    });

    btnToggleNewPassword.addEventListener('click', () => {
      const isPass = pdfNewPasswordInput.type === 'password';
      pdfNewPasswordInput.type = isPass ? 'text' : 'password';
      btnToggleNewPassword.textContent = isPass ? '🙈' : '👁️';
    });

    // Format selection
    formatChips.forEach(chip => {
      chip.addEventListener('click', () => {
        state.activeFormat = chip.dataset.format;
        updateFormatChipsUI();
      });
    });

    // Resize Mode tabs
    segButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        switchResizeMode(btn.dataset.mode);
      });
    });

    // Percentage controls
    scaleSlider.addEventListener('input', (e) => {
      state.percentage = parseInt(e.target.value, 10);
      scaleNumber.value = state.percentage;
      updatePercentageChipsUI();
    });

    scaleNumber.addEventListener('input', (e) => {
      state.percentage = Math.max(5, parseInt(e.target.value, 10) || 100);
      scaleSlider.value = state.percentage;
      updatePercentageChipsUI();
    });

    pctChips.forEach(chip => {
      chip.addEventListener('click', () => {
        state.percentage = parseInt(chip.dataset.pct, 10);
        scaleSlider.value = state.percentage;
        scaleNumber.value = state.percentage;
        updatePercentageChipsUI();
      });
    });

    // Exact Dimension controls
    exactWidthInput.addEventListener('input', (e) => {
      state.exactWidth = parseFloat(e.target.value) || 0;
      if (state.lockAspect && state.originalWidth && state.originalHeight && state.exactWidth > 0) {
        const ratio = state.originalHeight / state.originalWidth;
        state.exactHeight = Number((state.exactWidth * ratio).toFixed(2));
        exactHeightInput.value = state.exactHeight;
      }
      updatePixelCalculationBadge();
    });

    exactHeightInput.addEventListener('input', (e) => {
      state.exactHeight = parseFloat(e.target.value) || 0;
      if (state.lockAspect && state.originalWidth && state.originalHeight && state.exactHeight > 0) {
        const ratio = state.originalWidth / state.originalHeight;
        state.exactWidth = Number((state.exactHeight * ratio).toFixed(2));
        exactWidthInput.value = state.exactWidth;
      }
      updatePixelCalculationBadge();
    });

    exactUnitSelect.addEventListener('change', (e) => {
      state.exactUnit = e.target.value;
      updatePixelCalculationBadge();
    });

    lockAspectCheckbox.addEventListener('change', (e) => {
      state.lockAspect = e.target.checked;
    });

    // Cropper aspect ratio dropdown
    aspectRatioSelect.addEventListener('change', (e) => {
      if (state.cropper) {
        state.cropper.setAspectRatio(e.target.value);
      }
    });

    btnResetCrop.addEventListener('click', () => {
      if (state.cropper) {
        state.cropper.resetCropBoxToRatio();
      }
    });

    // DPI controls
    dpiChips.forEach(chip => {
      chip.addEventListener('click', () => {
        state.dpi = parseInt(chip.dataset.dpi, 10);
        customDpiInput.value = state.dpi;
        updateDpiChipsUI();
        updatePixelCalculationBadge();
      });
    });

    customDpiInput.addEventListener('input', (e) => {
      state.dpi = Math.max(1, parseInt(e.target.value, 10) || 300);
      updateDpiChipsUI();
      updatePixelCalculationBadge();
    });

    // Target size toggle and inputs
    enforceSizeToggle.addEventListener('change', (e) => {
      state.enforceSize = e.target.checked;
      targetSizeInputsContainer.classList.toggle('hidden', !state.enforceSize);
    });

    minKbInput.addEventListener('input', (e) => {
      state.minKb = parseInt(e.target.value, 10) || 0;
    });

    maxKbInput.addEventListener('input', (e) => {
      state.maxKb = parseInt(e.target.value, 10) || 0;
    });

    sizeChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const [min, max] = chip.dataset.size.split('-').map(Number);
        state.minKb = min;
        state.maxKb = max;
        minKbInput.value = min || '';
        maxKbInput.value = max || '';
        sizeChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      });
    });

    // PDF options
    pdfPageSizeSelect.addEventListener('change', (e) => {
      state.pdfPageSize = e.target.value;
    });

    pdfPageSelect.addEventListener('change', async (e) => {
      const val = e.target.value;
      if (val === 'all') {
        state.selectedPdfPage = 'all';
        await renderPdfPage(1);
      } else {
        state.selectedPdfPage = parseInt(val, 10);
        await renderPdfPage(state.selectedPdfPage);
      }
    });

    // Main Process Execution
    btnProcess.addEventListener('click', executeProcess);

    // Result actions
    btnDownload.addEventListener('click', downloadResultFile);
    btnDownloadZip.addEventListener('click', downloadZipFile);
    btnDownloadIndividual.addEventListener('click', downloadIndividualFiles);
    btnCopyClipboard.addEventListener('click', copyResultToClipboard);
    btnEditSettings.addEventListener('click', () => {
      resultSection.classList.add('hidden');
      configSection.classList.remove('hidden');
      configSection.scrollIntoView({ behavior: 'smooth' });
    });
    btnNewFile.addEventListener('click', resetAll);

    // Header actions
    btnSidePanel.addEventListener('click', () => {
      if (chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ action: 'OPEN_SIDE_PANEL' }, (res) => {
          if (!res || !res.success) {
            // If sidepanel API not directly available, open in popup or tab
            window.open(chrome.runtime.getURL('popup.html'), '_blank');
          }
        });
      }
    });

    btnNewTab.addEventListener('click', () => {
      if (chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ action: 'OPEN_NEW_TAB' });
      } else {
        window.open(window.location.href, '_blank');
      }
    });
  }

  function updateFormatChipsUI() {
    formatChips.forEach(chip => {
      chip.classList.toggle('active', chip.dataset.format === state.activeFormat);
    });

    // Update helper text
    if (state.activeFormat === 'image/jpeg') {
      formatHelperText.textContent = 'Recommended for photos, admit cards, and strict KB limits (20-50 KB).';
      pdfOutputOptions.classList.add('hidden');
    } else if (state.activeFormat === 'image/png') {
      formatHelperText.textContent = 'Lossless format. Best for transparent signatures and clean text scans.';
      pdfOutputOptions.classList.add('hidden');
    } else if (state.activeFormat === 'image/webp') {
      formatHelperText.textContent = 'Modern web format. Highly compressed with minimal quality loss.';
      pdfOutputOptions.classList.add('hidden');
    } else if (state.activeFormat === 'application/pdf') {
      formatHelperText.textContent = 'Embeds image or document into an official PDF file (A4 / Letter size).';
      pdfOutputOptions.classList.remove('hidden');
    }
  }

  function switchResizeMode(mode) {
    state.resizeMode = mode;
    segButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.mode === mode));

    panelPercentage.classList.toggle('hidden', mode !== 'percentage');
    panelExact.classList.toggle('hidden', mode !== 'exact');
    panelCrop.classList.toggle('hidden', mode !== 'crop');

    if (mode === 'crop' && state.activeCanvas && !state.cropper) {
      initCropper();
    }
  }

  function updatePercentageChipsUI() {
    pctChips.forEach(c => {
      c.classList.toggle('active', parseInt(c.dataset.pct, 10) === state.percentage);
    });
  }

  function updateDpiChipsUI() {
    dpiChips.forEach(c => {
      c.classList.toggle('active', parseInt(c.dataset.dpi, 10) === state.dpi);
    });
  }

  function updatePixelCalculationBadge() {
    const pxW = DocFitEngine.unitToPixels(state.exactWidth, state.exactUnit, state.dpi);
    const pxH = DocFitEngine.unitToPixels(state.exactHeight, state.exactUnit, state.dpi);
    pixelCalcBadge.textContent = `≈ ${pxW} × ${pxH} px`;
  }

  /**
   * Handle Uploaded File
   */
  async function handleFileSelect(file) {
    state.file = file;
    state.fileName = file.name;
    state.originalSizeKb = Number((file.size / 1024).toFixed(1));

    const mime = file.type.toLowerCase();
    const nameLower = file.name.toLowerCase();

    // Show loading state
    dropzone.classList.add('hidden');
    fileSummaryCard.classList.remove('hidden');
    configSection.classList.remove('hidden');
    resultSection.classList.add('hidden');

    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileName').title = file.name;
    document.getElementById('fileOrigSize').textContent = `${state.originalSizeKb} KB`;

    const fileBuffer = await file.arrayBuffer();
    state.fileBuffer = fileBuffer;

    if (mime.includes('pdf') || nameLower.endsWith('.pdf')) {
      state.fileType = 'pdf';
      document.getElementById('fileTypeIcon').textContent = '📑';
      document.getElementById('fileOrigFormat').textContent = 'PDF';
      configSection.classList.add('hidden'); // hidden until unlocked
      await handlePdfInput(fileBuffer);
    } else if (mime.includes('html') || nameLower.endsWith('.html') || nameLower.endsWith('.htm')) {
      state.fileType = 'html';
      document.getElementById('fileTypeIcon').textContent = '🌐';
      document.getElementById('fileOrigFormat').textContent = 'HTML';
      pdfControlsCard.classList.add('hidden');
      await handleHtmlInput(file);
    } else {
      // Standard image
      state.fileType = 'image';
      document.getElementById('fileTypeIcon').textContent = '🖼️';
      document.getElementById('fileOrigFormat').textContent = mime.split('/')[1]?.toUpperCase() || 'IMG';
      pdfControlsCard.classList.add('hidden');
      await handleImageInput(file, fileBuffer);
    }
  }

  /**
   * Process Image Input
   */
  async function handleImageInput(file, fileBuffer) {
    // Detect DPI
    state.originalDpi = DpiHandler.detectDpi(fileBuffer, file.type);
    document.getElementById('fileOrigDpi').textContent = `${state.originalDpi} DPI`;

    const img = new Image();
    const url = URL.createObjectURL(file);

    await new Promise((resolve) => {
      img.onload = () => {
        state.originalWidth = img.naturalWidth;
        state.originalHeight = img.naturalHeight;
        document.getElementById('fileOrigDim').textContent = `${img.naturalWidth} × ${img.naturalHeight} px`;

        // Create base canvas
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
        state.activeCanvas = canvas;

        URL.revokeObjectURL(url);
        resolve();
      };
      img.src = url;
    });

    // Update exact dimension defaults if needed
    if (state.exactUnit === 'cm') {
      state.exactWidth = DocFitEngine.pixelsToUnit(state.originalWidth, 'cm', state.dpi);
      state.exactHeight = DocFitEngine.pixelsToUnit(state.originalHeight, 'cm', state.dpi);
    } else {
      state.exactWidth = state.originalWidth;
      state.exactHeight = state.originalHeight;
    }
    exactWidthInput.value = state.exactWidth;
    exactHeightInput.value = state.exactHeight;
    updatePixelCalculationBadge();

    // Reset cropper if already initialized
    if (state.cropper) {
      initCropper();
    }
  }

  async function handleUnlockPdfSubmit() {
    const password = pdfPasswordInput.value;
    if (!password) {
      pdfPasswordInput.focus();
      return;
    }
    const btnText = btnUnlockPdf.querySelector('.btn-unlock-text');
    const btnSpinner = btnUnlockPdf.querySelector('.btn-unlock-spinner');
    btnUnlockPdf.disabled = true;
    btnText.textContent = 'Decrypting...';
    btnSpinner.classList.remove('hidden');
    passwordErrorMsg.classList.add('hidden');

    try {
      await handlePdfInput(state.fileBuffer, password);
    } finally {
      btnUnlockPdf.disabled = false;
      btnText.textContent = 'Unlock & Load';
      btnSpinner.classList.add('hidden');
    }
  }

  /**
   * Process PDF Input
   */
  async function handlePdfInput(arrayBuffer, password = '') {
    processStatusText.textContent = 'Checking PDF document...';
    try {
      const loadRes = await PdfHandler.loadPdfDocument(arrayBuffer, password);

      if (!loadRes.success && loadRes.isPasswordProtected) {
        // Password required or incorrect password
        pdfPasswordCard.classList.remove('hidden');
        pdfControlsCard.classList.add('hidden');
        configSection.classList.add('hidden');
        processStatusText.textContent = '';

        if (password) {
          // User entered a password, but it was wrong
          passwordErrorMsg.textContent = '⚠️ ' + (loadRes.error || 'Incorrect password. Please try again.');
          passwordErrorMsg.classList.remove('hidden');
          pdfPasswordInput.select();
        } else {
          passwordErrorMsg.classList.add('hidden');
          pdfPasswordInput.value = '';
          setTimeout(() => pdfPasswordInput.focus(), 150);
        }
        return;
      }

      // Success! PDF is unlocked
      state.pdfPassword = password;
      if (password) {
        cardSamePassword.classList.remove('hidden');
      } else {
        cardSamePassword.classList.add('hidden');
      }
      pdfPasswordCard.classList.add('hidden');
      passwordErrorMsg.classList.add('hidden');
      pdfControlsCard.classList.remove('hidden');
      configSection.classList.remove('hidden');

      state.pdfDoc = loadRes.pdfDoc;
      state.totalPdfPages = loadRes.numPages;
      pdfTotalPages.textContent = loadRes.numPages;

      // Ensure crisp, sharp rendering defaults (300 DPI, 100% scale, aspect ratio preserved)
      state.dpi = 300;
      customDpiInput.value = 300;
      updateDpiChipsUI();
      switchResizeMode('percentage');
      state.percentage = 100;
      scaleSlider.value = 100;
      scaleNumber.value = 100;
      state.lockAspect = true;
      lockAspectCheckbox.checked = true;
      updatePercentageChipsUI();

      // Populate page selector with "All Pages" option
      pdfPageSelect.innerHTML = '';
      if (loadRes.numPages > 1) {
        const allOpt = document.createElement('option');
        allOpt.value = 'all';
        allOpt.textContent = `📚 All Pages (Batch Export - ${loadRes.numPages} pages)`;
        pdfPageSelect.appendChild(allOpt);
      }
      for (let p = 1; p <= loadRes.numPages; p++) {
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = `Page ${p}`;
        pdfPageSelect.appendChild(opt);
      }

      await renderPdfPage(1);
    } catch (err) {
      console.error('PDF parsing failed:', err);
      alert('Could not render PDF: ' + (err.message || 'Unknown error'));
      processStatusText.textContent = '';
      resetAll();
    }
  }

  async function renderPdfPage(pageNum) {
    processStatusText.textContent = `Rendering PDF Page ${pageNum}...`;
    const pdfSource = state.pdfDoc || state.fileBuffer;
    const renderRes = await PdfHandler.renderPdfPageToCanvas(pdfSource, pageNum, state.dpi, state.pdfPassword);
    state.activeCanvas = renderRes.canvas;
    state.originalWidth = renderRes.width;
    state.originalHeight = renderRes.height;
    state.originalDpi = state.dpi;

    document.getElementById('fileOrigDim').textContent = `${renderRes.width} × ${renderRes.height} px`;
    document.getElementById('fileOrigDpi').textContent = `${state.dpi} DPI`;
    processStatusText.textContent = '';

    if (state.cropper) {
      initCropper();
    }
  }

  /**
   * Process HTML Input
   */
  async function handleHtmlInput(file) {
    const text = await file.text();
    processStatusText.textContent = 'Rasterizing HTML document...';
    try {
      const canvas = await PdfHandler.htmlToCanvas(text, 850);
      state.activeCanvas = canvas;
      state.originalWidth = canvas.width;
      state.originalHeight = canvas.height;
      state.originalDpi = 96;

      document.getElementById('fileOrigDim').textContent = `${canvas.width} × ${canvas.height} px`;
      document.getElementById('fileOrigDpi').textContent = '96 DPI';
      processStatusText.textContent = '';

      if (state.exactUnit === 'cm') {
        state.exactWidth = DocFitEngine.pixelsToUnit(state.originalWidth, 'cm', state.dpi);
        state.exactHeight = DocFitEngine.pixelsToUnit(state.originalHeight, 'cm', state.dpi);
      } else {
        state.exactWidth = state.originalWidth;
        state.exactHeight = state.originalHeight;
      }
      exactWidthInput.value = state.exactWidth;
      exactHeightInput.value = state.exactHeight;
      updatePixelCalculationBadge();

      if (state.cropper) {
        initCropper();
      }
    } catch (err) {
      console.error('HTML render failed:', err);
      alert('Could not render HTML: ' + (err.message || 'Unknown parsing error'));
      processStatusText.textContent = '';
      resetAll();
    }
  }

  /**
   * Initialize interactive cropper
   */
  function initCropper() {
    if (!state.activeCanvas) return;
    cropperWrapper.innerHTML = '';

    const img = new Image();
    img.src = state.activeCanvas.toDataURL();
    img.style.maxWidth = '100%';
    img.style.maxHeight = '240px';

    state.cropper = new DocFitCropper(cropperWrapper, (coords) => {
      state.cropCoords = coords;
    });

    state.cropper.setImage(img);
    state.cropper.setAspectRatio(aspectRatioSelect.value);
  }

  /**
   * Execute Process & Optimization
   */
  async function executeProcess() {
    if (!state.activeCanvas) {
      alert('Please upload a file first.');
      return;
    }

    // UI Loading state
    btnProcess.disabled = true;
    const btnText = btnProcess.querySelector('.btn-text');
    const btnSpinner = btnProcess.querySelector('.btn-spinner');
    btnText.textContent = 'Optimizing Specs...';
    btnSpinner.classList.remove('hidden');

    try {
      // Determine if output PDF should be password-protected
      let outputPdfPassword = '';
      if (state.activeFormat === 'application/pdf') {
        if (state.pdfProtectChoice === 'same') {
          outputPdfPassword = state.pdfPassword;
        } else if (state.pdfProtectChoice === 'new') {
          outputPdfPassword = pdfNewPasswordInput.value.trim();
          if (!outputPdfPassword) {
            alert('Please enter a new password to encrypt your output PDF.');
            pdfNewPasswordInput.focus();
            btnProcess.disabled = false;
            btnText.textContent = '⚡ Fit & Optimize File';
            btnSpinner.classList.add('hidden');
            return;
          }
        }
      }

      const options = {
        outputFormat: state.activeFormat,
        resizeMode: state.resizeMode,
        percentage: state.percentage,
        exactWidth: state.exactWidth,
        exactHeight: state.exactHeight,
        unit: state.exactUnit,
        lockAspect: state.lockAspect,
        cropCoords: state.resizeMode === 'crop' && state.cropper ? state.cropper.getCropCoordinates() : null,
        dpi: state.dpi,
        minKb: state.enforceSize ? state.minKb : 0,
        maxKb: state.enforceSize ? state.maxKb : 0,
        pdfPageSize: state.pdfPageSize,
        outputPdfPassword: outputPdfPassword
      };

      // Batch Processing for "All Pages"
      if (state.fileType === 'pdf' && state.selectedPdfPage === 'all' && state.totalPdfPages > 1) {
        btnText.textContent = `Processing Pages (0/${state.totalPdfPages})...`;
        const batchResults = [];
        const zip = new window.JSZip();
        const baseName = state.fileName.replace(/\.[^/.]+$/, '');
        let ext = 'jpg';
        if (state.activeFormat === 'image/png') ext = 'png';
        else if (state.activeFormat === 'image/webp') ext = 'webp';
        else if (state.activeFormat === 'application/pdf') ext = 'pdf';

        for (let pageNum = 1; pageNum <= state.totalPdfPages; pageNum++) {
          processStatusText.textContent = `Rendering page ${pageNum} of ${state.totalPdfPages}...`;
          btnText.textContent = `Processing (${pageNum}/${state.totalPdfPages})...`;

          const pageRes = await PdfHandler.renderPdfPageToCanvas(
            state.pdfDoc || state.fileBuffer,
            pageNum,
            state.dpi,
            state.pdfPassword
          );

          const result = await DocFitEngine.process(
            pageRes.canvas,
            options,
            (status) => { processStatusText.textContent = `Page ${pageNum}: ${status}`; }
          );

          const pageFilename = `${baseName}_page_${pageNum}.${ext}`;
          batchResults.push({
            page: pageNum,
            blob: result.blob,
            sizeKb: result.sizeKb,
            filename: pageFilename,
            width: result.width,
            height: result.height,
            dpi: result.dpi
          });

          zip.file(pageFilename, result.blob);
        }

        processStatusText.textContent = 'Packaging ZIP archive...';
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        state.batchResults = batchResults;
        state.zipBlob = zipBlob;

        displayBatchResults(batchResults, zipBlob);

        configSection.classList.add('hidden');
        resultSection.classList.remove('hidden');
        resultSection.scrollIntoView({ behavior: 'smooth' });
        return;
      }

      state.batchResults = null;
      state.zipBlob = null;
      const result = await DocFitEngine.process(
        state.activeCanvas,
        options,
        (status) => { processStatusText.textContent = status; }
      );

      state.resultBlob = result.blob;
      state.resultStats = result;

      // Populate Result Screen
      displayResult(result);

      // Switch to Result View
      configSection.classList.add('hidden');
      resultSection.classList.remove('hidden');
      resultSection.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      console.error('Processing failed:', err);
      alert('Processing failed: ' + (err.message || err));
    } finally {
      btnProcess.disabled = false;
      btnText.textContent = '⚡ Fit & Optimize File';
      btnSpinner.classList.add('hidden');
      processStatusText.textContent = '';
    }
  }

  /**
   * Render Result Card
   */
  function displayResult(result) {
    // Populate stats
    document.getElementById('resOrigSize').textContent = `${state.originalSizeKb} KB`;
    document.getElementById('resOrigDim').textContent = `${state.originalWidth} × ${state.originalHeight} px`;
    document.getElementById('resOrigDpi').textContent = `${state.originalDpi} DPI`;
    document.getElementById('resOrigFmt').textContent = (state.file ? state.file.name.split('.').pop() : 'FILE').toUpperCase();

    document.getElementById('resFinalSize').textContent = `${result.sizeKb} KB`;
    document.getElementById('resFinalDim').textContent = `${result.width} × ${result.height} px`;
    document.getElementById('resFinalDpi').textContent = `${result.dpi} DPI`;

    const fmtExt = result.format === 'application/pdf' ? 'PDF' : result.format.split('/')[1].toUpperCase();
    document.getElementById('resFinalFmt').textContent = fmtExt;

    // Status Banner
    statusBanner.className = 'status-banner';
    if (result.isWithinRange) {
      statusBanner.classList.add('success');
      const minText = state.minKb ? `${state.minKb}–` : '';
      statusMessage.textContent = `Perfect Fit! ${result.sizeKb} KB (Within ${minText}${state.maxKb} KB target range)`;
    } else {
      statusBanner.classList.add('warning');
      statusMessage.textContent = `Completed: ${result.sizeKb} KB. ${result.autoDownscaled ? 'Auto-downscaled slightly to fit max KB.' : ''}`;
    }

    // Media Preview
    if (result.format === 'application/pdf') {
      resultImagePreview.classList.add('hidden');
      pdfResultBadge.classList.remove('hidden');
      document.getElementById('pdfPreviewTitle').textContent = getOutputFilename();
      if (result.isPasswordProtected) {
        document.getElementById('pdfPreviewSubtitle').textContent = `${result.sizeKb} KB • A4 PDF (🔒 Password-Protected)`;
        statusMessage.textContent += ' • 🔒 Encrypted with password';
      } else {
        document.getElementById('pdfPreviewSubtitle').textContent = `${result.sizeKb} KB • A4 PDF (🔓 Clean & Unlocked)`;
      }
    } else {
      pdfResultBadge.classList.add('hidden');
      resultImagePreview.classList.remove('hidden');
      const previewUrl = URL.createObjectURL(result.blob);
      resultImagePreview.src = previewUrl;
    }

    downloadBtnText.textContent = `Download (${result.sizeKb} KB)`;
    singleResultActions.classList.remove('hidden');
    batchResultActions.classList.add('hidden');
  }

  function displayBatchResults(batchResults, zipBlob) {
    const totalSizeKb = batchResults.reduce((sum, item) => sum + item.sizeKb, 0);
    const totalSizeMb = (totalSizeKb / 1024).toFixed(2);
    const zipSizeMb = (zipBlob.size / (1024 * 1024)).toFixed(2);

    document.getElementById('resOrigSize').textContent = `${state.originalSizeKb} KB`;
    document.getElementById('resOrigDim').textContent = `${batchResults[0].width} × ${batchResults[0].height} px`;
    document.getElementById('resOrigDpi').textContent = `${state.originalDpi} DPI`;
    document.getElementById('resOrigFmt').textContent = 'PDF';

    document.getElementById('resFinalSize').textContent = `${totalSizeMb} MB (${batchResults.length} files)`;
    document.getElementById('resFinalDim').textContent = `${batchResults[0].width} × ${batchResults[0].height} px`;
    document.getElementById('resFinalDpi').textContent = `${state.dpi} DPI`;
    document.getElementById('resFinalFmt').textContent = (state.activeFormat === 'application/pdf' ? 'PDF' : state.activeFormat.split('/')[1].toUpperCase());

    statusBanner.className = 'status-banner success';
    statusMessage.textContent = `Batch Ready! Converted ${batchResults.length} pages to high-res images (${zipSizeMb} MB ZIP)`;

    // Media Preview
    resultImagePreview.classList.add('hidden');
    pdfResultBadge.classList.remove('hidden');
    const baseName = state.fileName.replace(/\.[^/.]+$/, '');
    document.getElementById('pdfPreviewTitle').textContent = `docfit_${baseName}_all_${batchResults.length}_pages.zip`;
    document.getElementById('pdfPreviewSubtitle').textContent = `📚 ${batchResults.length} Separate Images • ${zipSizeMb} MB ZIP • All at ${state.dpi} DPI`;

    // Show Batch Actions, Hide Single Actions
    singleResultActions.classList.add('hidden');
    batchResultActions.classList.remove('hidden');

    downloadZipBtnText.textContent = `📦 Download All as ZIP (${zipSizeMb} MB)`;
    downloadIndividualBtnText.textContent = `📂 Download Individual Files (${batchResults.length} files)`;
  }

  /**
   * Download Batch as ZIP File
   */
  function downloadZipFile() {
    if (!state.zipBlob) return;
    const baseName = state.fileName.replace(/\.[^/.]+$/, '');
    const url = URL.createObjectURL(state.zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `docfit_${baseName}_all_pages_${state.dpi}dpi.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Download Individual Image Files Sequentially
   */
  async function downloadIndividualFiles() {
    if (!state.batchResults || state.batchResults.length === 0) return;
    const origText = downloadIndividualBtnText.textContent;
    btnDownloadIndividual.disabled = true;

    for (let i = 0; i < state.batchResults.length; i++) {
      const item = state.batchResults[i];
      downloadIndividualBtnText.textContent = `Downloading ${i + 1} of ${state.batchResults.length}...`;
      const url = URL.createObjectURL(item.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      await new Promise(r => setTimeout(r, 350));
    }

    downloadIndividualBtnText.textContent = '✓ All Downloaded!';
    setTimeout(() => {
      downloadIndividualBtnText.textContent = origText;
      btnDownloadIndividual.disabled = false;
    }, 2500);
  }

  function getOutputFilename() {
    const baseName = state.fileName.replace(/\.[^/.]+$/, '');
    let ext = 'jpg';
    if (state.activeFormat === 'image/png') ext = 'png';
    else if (state.activeFormat === 'image/webp') ext = 'webp';
    else if (state.activeFormat === 'application/pdf') ext = 'pdf';

    return `docfit_${baseName}_${state.dpi}dpi.${ext}`;
  }

  /**
   * Download Result File
   */
  function downloadResultFile() {
    if (!state.resultBlob) return;
    const url = URL.createObjectURL(state.resultBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getOutputFilename();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Copy to Clipboard
   */
  async function copyResultToClipboard() {
    if (!state.resultBlob) return;
    if (state.activeFormat === 'application/pdf') {
      alert('Direct PDF clipboard paste is not supported by browsers. Please use the Download button.');
      return;
    }

    try {
      // Browsers only allow copying PNG to clipboard
      let pngBlob = state.resultBlob;
      if (state.activeFormat !== 'image/png') {
        const img = new Image();
        const url = URL.createObjectURL(state.resultBlob);
        await new Promise(r => { img.onload = r; img.src = url; });
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        c.getContext('2d').drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        pngBlob = await new Promise(res => c.toBlob(res, 'image/png'));
      }

      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': pngBlob })
      ]);

      copyBtnText.textContent = 'Copied!';
      setTimeout(() => { copyBtnText.textContent = 'Copy'; }, 2000);
    } catch (err) {
      console.warn('Clipboard write failed:', err);
      alert('Could not copy image to clipboard: ' + err.message);
    }
  }

  /**
   * Reset All
   */
  function resetAll() {
    state.file = null;
    state.fileBuffer = null;
    state.activeCanvas = null;
    state.cropper = null;
    state.resultBlob = null;
    state.pdfPassword = '';
    state.pdfProtectChoice = 'none';
    state.pdfDoc = null;
    state.batchResults = null;
    state.zipBlob = null;
    fileInput.value = '';
    if (pdfPasswordInput) {
      pdfPasswordInput.value = '';
      pdfPasswordInput.type = 'password';
      if (btnTogglePassword) btnTogglePassword.textContent = '👁️';
    }

    singleResultActions.classList.remove('hidden');
    batchResultActions.classList.add('hidden');

    protectRadioButtons.forEach(r => {
      r.checked = (r.value === 'none');
    });
    protectCardChoices.forEach(c => {
      c.classList.toggle('active', c.dataset.protect === 'none');
    });
    if (newPasswordPanel) newPasswordPanel.classList.add('hidden');
    if (cardSamePassword) cardSamePassword.classList.add('hidden');
    if (pdfNewPasswordInput) {
      pdfNewPasswordInput.value = '';
      pdfNewPasswordInput.type = 'password';
      if (btnToggleNewPassword) btnToggleNewPassword.textContent = '👁️';
    }

    fileSummaryCard.classList.add('hidden');
    pdfControlsCard.classList.add('hidden');
    if (pdfPasswordCard) pdfPasswordCard.classList.add('hidden');
    if (passwordErrorMsg) passwordErrorMsg.classList.add('hidden');
    configSection.classList.add('hidden');
    resultSection.classList.add('hidden');
    dropzone.classList.remove('hidden');

    applyPreset(DocFitPresets[0]); // default to passport
  }
});
