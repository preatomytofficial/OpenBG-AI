/**
 * OpenBG AI - Frontend Logic
 * Powered by @imgly/background-removal for offline, browser-local AI background removal
 * © This Tool is Made by PreatomYT
 */

// App State
let originalImageFile = null;
let originalImageSrc = null;
let activeOriginalImage = null; // Caches the original loaded image for enhancements
let rawTransparentBlob = null;
let rawTransparentImageElement = null; // Caches the transparent result without enhancements applied
let showingOriginal = false;

// Terminal Log Helper
function logConsole(message, type = 'info') {
  const consoleLog = document.getElementById('console-log');
  if (!consoleLog) return;
  const p = document.createElement('p');
  
  if (type === 'success') {
    p.className = 'text-green-400 font-semibold';
  } else if (type === 'error') {
    p.className = 'text-red-400 font-semibold';
  } else if (type === 'blue') {
    p.className = 'text-cyan-400';
  } else if (type === 'pulse') {
    p.className = 'animate-pulse text-yellow-500';
  } else {
    p.className = 'text-slate-400';
  }
  
  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0];
  
  p.innerHTML = `<span class="text-slate-600 font-mono">[${timeStr}]</span> ${message}`;
  consoleLog.appendChild(p);
  consoleLog.scrollTop = consoleLog.scrollHeight;
}

// Beautiful Toast Notification Helper (Iframe and Sandbox safe)
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = 'p-4 rounded-xl border backdrop-blur-md shadow-lg flex items-center gap-3 transition-all duration-300 transform translate-y-2 opacity-0 pointer-events-auto';
  
  if (type === 'success') {
    toast.className += ' bg-green-950/90 border-green-500/30 text-green-200';
  } else if (type === 'error') {
    toast.className += ' bg-red-950/90 border-red-500/30 text-red-200';
  } else {
    toast.className += ' bg-slate-950/90 border-cyan-500/30 text-cyan-200';
  }
  
  let icon = '';
  if (type === 'success') {
    icon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-green-400 shrink-0"><polyline points="20 6 9 17 4 12" /></svg>`;
  } else if (type === 'error') {
    icon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-red-400 shrink-0"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>`;
  } else {
    icon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-cyan-400 shrink-0"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>`;
  }
  
  toast.innerHTML = `
    ${icon}
    <div class="text-xs font-medium flex-1">${message}</div>
    <button class="text-slate-400 hover:text-white transition-colors ml-auto focus:outline-none text-base font-bold">&times;</button>
  `;
  
  const closeBtn = toast.querySelector('button');
  closeBtn.addEventListener('click', () => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  });
  
  container.appendChild(toast);
  
  requestAnimationFrame(() => {
    toast.classList.remove('opacity-0', 'translate-y-2');
  });
  
  setTimeout(() => {
    if (toast.parentNode) {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 300);
    }
  }, 5000);
}

// DOM Elements
const uploadStage = document.getElementById('upload-stage');
const fileInput = document.getElementById('file-input');
const loaderStage = document.getElementById('loader-stage');
const loaderStatus = document.getElementById('loader-status');
const loaderDetail = document.getElementById('loader-detail');
const loaderProgressBar = document.getElementById('loader-progress-bar');
const loaderPercent = document.getElementById('loader-percent');

const editorStage = document.getElementById('editor-stage');
const imgResult = document.getElementById('img-result');
const checkersBg = document.getElementById('checkers-bg');
const gridBg = document.getElementById('grid-bg');
const previewBadge = document.getElementById('preview-badge');
const processingCanvas = document.getElementById('processing-canvas');

// Buttons
const btnRemoveBg = document.getElementById('btn-remove-bg');
const btnReset = document.getElementById('btn-reset');
const btnDownload = document.getElementById('btn-download');

// Sliders & Values
const sharpnessSlider = document.getElementById('sharpness-slider');
const sharpnessVal = document.getElementById('sharpness-val');
const contrastSlider = document.getElementById('contrast-slider');
const contrastVal = document.getElementById('contrast-val');
const brightnessSlider = document.getElementById('brightness-slider');
const brightnessVal = document.getElementById('brightness-val');

// Initialize Events
function init() {
  // Drag & Drop
  ['dragenter', 'dragover'].forEach(eventName => {
    uploadStage.addEventListener(eventName, (e) => {
      e.preventDefault();
      uploadStage.classList.add('border-cyan-500', 'bg-slate-900/60');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    uploadStage.addEventListener(eventName, (e) => {
      e.preventDefault();
      uploadStage.classList.remove('border-cyan-500', 'bg-slate-900/60');
    }, false);
  });

  uploadStage.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      handleImageSelection(files[0]);
    }
  });

  uploadStage.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleImageSelection(e.target.files[0]);
    }
  });

  // Slider controls
  sharpnessSlider.addEventListener('input', (e) => {
    sharpnessVal.textContent = `${e.target.value}%`;
    applyEnhancements();
  });
  sharpnessSlider.addEventListener('change', (e) => {
    logConsole(`[PROC] Edge sharpening set to: <span class="text-white">${e.target.value}%</span>`, 'info');
  });

  contrastSlider.addEventListener('input', (e) => {
    contrastVal.textContent = `${e.target.value}%`;
    applyEnhancements();
  });
  contrastSlider.addEventListener('change', (e) => {
    logConsole(`[PROC] Smart contrast set to: <span class="text-white">${e.target.value}%</span>`, 'info');
  });

  brightnessSlider.addEventListener('input', (e) => {
    brightnessVal.textContent = `${e.target.value}%`;
    applyEnhancements();
  });
  brightnessSlider.addEventListener('change', (e) => {
    logConsole(`[PROC] Brightness level set to: <span class="text-white">${e.target.value}%</span>`, 'info');
  });

  // Action Buttons
  btnRemoveBg.addEventListener('click', performBackgroundRemoval);
  btnReset.addEventListener('click', resetApp);

  // Promo Buttons
  const btnPromoZip = document.getElementById('btn-promo-zip');
  if (btnPromoZip) {
    btnPromoZip.addEventListener('click', function(e) {
      e.preventDefault();
      window.handleAdRedirect(() => {
        window.open('https://drive.google.com/file/d/1ipS4bz5hkJGlk3xKNUY16-U2mBsTyqLh/view?usp=sharing', '_blank');
      });
    });
  }

  const btnPromoPdf = document.getElementById('btn-promo-pdf');
  if (btnPromoPdf) {
    btnPromoPdf.addEventListener('click', function(e) {
      e.preventDefault();
      window.handleAdRedirect(() => {
        window.open('https://drive.google.com/file/d/1A4MY2wtf1BTW3ogBMtPLeDuBiQiD5EOR/view?usp=sharing', '_blank');
      });
    });
  }
}

// Handling chosen image
function handleImageSelection(file) {
  if (!file.type.match('image.*')) {
    showToast('Please select a valid image file (PNG, JPG, JPEG).', 'error');
    return;
  }

  originalImageFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    originalImageSrc = e.target.result;
    
    // Cache original image as activeOriginalImage
    activeOriginalImage = new Image();
    activeOriginalImage.src = originalImageSrc;
    activeOriginalImage.onload = () => {
      // Switch stages
      uploadStage.classList.add('hidden');
      editorStage.classList.remove('hidden');
      editorStage.classList.add('flex');
      
      // Setup views inside single unified viewport
      imgResult.src = originalImageSrc;
      imgResult.classList.remove('opacity-0');
      checkersBg.classList.add('hidden');
      gridBg.classList.remove('hidden');
      
      // Setup badge
      previewBadge.textContent = 'Original Preview';
      previewBadge.className = 'absolute top-4 left-4 px-3 py-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-[10px] uppercase font-bold tracking-wider text-slate-400 z-20';
      
      // Reset inputs
      btnDownload.disabled = true;
      sharpnessSlider.value = 0;
      sharpnessVal.textContent = '0%';
      contrastSlider.value = 100;
      contrastVal.textContent = '100%';
      brightnessSlider.value = 100;
      brightnessVal.textContent = '100%';
      
      rawTransparentBlob = null;
      rawTransparentImageElement = null;
      showingOriginal = false;

      // High Density logs
      logConsole(`[IO] Image detected: <span class="text-white">${file.name}</span> (${(file.size / (1024 * 1024)).toFixed(2)} MB)`, 'blue');
      logConsole(`[SYSTEM] Enhancement sliders reset to default (0%, 100%, 100%)`, 'info');
    };
  };
  reader.readAsDataURL(file);
}

// Custom JS Sharpen convolution filter
function sharpenImageData(ctx, width, height, value) {
  if (value <= 0) return;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const original = new Uint8ClampedArray(data);
  
  // Sharpness matrix:
  //  0  -v  0
  // -v 1+4v -v
  //  0  -v  0
  const v = value / 150; // normalized weight multiplier
  const a = 1 + 4 * v;
  const b = -v;
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      // Skip transparent or near-transparent pixels to avoid halo/border artifacts
      if (original[idx + 3] < 30) continue;

      for (let c = 0; c < 3; c++) { // R, G, B channels
        const val = a * original[idx + c] +
          b * (
            original[idx + c - 4] +
            original[idx + c + 4] +
            original[idx + c - width * 4] +
            original[idx + c + width * 4]
          );
        data[idx + c] = Math.min(255, Math.max(0, val));
      }
    }
  }
  ctx.putImageData(imgData, 0, 0);
}

// Redraws the canvas applying contrast, brightness, sharpness
function applyEnhancements() {
  if (window.isFallbackActive) {
    applyFallbackSegmentation();
    return;
  }
  const activeImage = rawTransparentImageElement || activeOriginalImage;
  if (!activeImage || !activeImage.complete || activeImage.naturalWidth === 0) return;

  const canvas = processingCanvas;
  const ctx = canvas.getContext('2d');
  
  // Set dimensions
  canvas.width = activeImage.naturalWidth;
  canvas.height = activeImage.naturalHeight;
  
  // Draw raw image
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Apply standard browser filters (contrast and brightness)
  const contrast = contrastSlider.value;
  const brightness = brightnessSlider.value;
  ctx.filter = `contrast(${contrast}%) brightness(${brightness}%)`;
  ctx.drawImage(activeImage, 0, 0);
  ctx.filter = 'none'; // reset filter
  
  // Apply manual 3x3 Convolution Sharpening to pixels
  const sharpness = parseInt(sharpnessSlider.value);
  if (sharpness > 0) {
    sharpenImageData(ctx, canvas.width, canvas.height, sharpness);
  }
  
  // Update view
  const enhancedDataURL = canvas.toDataURL('image/png');
  imgResult.src = enhancedDataURL;
  imgResult.classList.remove('opacity-0');
  
  if (rawTransparentImageElement) {
    checkersBg.classList.remove('hidden');
    gridBg.classList.add('hidden');
  } else {
    checkersBg.classList.add('hidden');
    gridBg.classList.remove('hidden');
  }
  
  // Enable download button with enhanced canvas result
  if (rawTransparentImageElement) {
    btnDownload.disabled = false;
    btnDownload.onclick = () => {
      handleAdRedirect(() => {
        const link = document.createElement('a');
        link.download = `openbg_ai_${Date.now()}.png`;
        link.href = enhancedDataURL;
        link.click();
      });
    };
  }
}

// Background Removal Process
async function performBackgroundRemoval() {
  if (!originalImageFile) return;

  // Switch to loader
  editorStage.classList.add('hidden');
  editorStage.classList.remove('flex');
  loaderStage.classList.remove('hidden');
  loaderStage.classList.add('flex');

  // Reset loader progress bar
  updateLoader('Initializing AI engine...', 5);
  logConsole('[PROC] Booting local neural network session...', 'pulse');

  let lastLoggedStage = '';

  try {
    // Call @imgly/background-removal library directly
    if (typeof imglyRemoveBackground === 'undefined') {
      throw new Error('AI background remover engine failed to load. Check your internet connection.');
    }

    const config = {
      progress: (key, current, total) => {
        let percent = 0;
        if (total > 0) {
          percent = Math.round((current / total) * 100);
        }
        
        // Dynamic loading steps
        let statusText = 'Processing image details...';
        let stage = '';
        if (key.includes('fetch')) {
          statusText = `Downloading Local AI Model Weights...`;
          stage = 'fetch';
        } else if (key.includes('onnx') || key.includes('model')) {
          statusText = 'Injecting AI Tensors to Device Memory...';
          stage = 'onnx';
        } else if (key.includes('inference')) {
          statusText = 'AI Detecting Boundaries & Contours...';
          stage = 'inference';
        }
        
        if (stage && stage !== lastLoggedStage) {
          lastLoggedStage = stage;
          if (stage === 'fetch') {
            logConsole('[SYSTEM] Fetching AI model weights (cached locally inside IndexedDB)...', 'info');
          } else if (stage === 'onnx') {
            logConsole('[SYSTEM] Spawning WebAssembly workers and allocating tensor heaps...', 'info');
          } else if (stage === 'inference') {
            logConsole('[PROC] Processing multi-spectral boundary masks on image pixels...', 'blue');
          }
        }

        updateLoader(statusText, Math.max(5, percent));
      }
    };

    updateLoader('Applying AI Segmentation Mask...', 45);
    const resultBlob = await imglyRemoveBackground(originalImageFile, config);
    
    // Store result blob
    rawTransparentBlob = resultBlob;
    const blobURL = URL.createObjectURL(resultBlob);
    
    // Pre-load transparent result image element so we can adjust it via sliders instantly
    rawTransparentImageElement = new Image();
    rawTransparentImageElement.src = blobURL;
    rawTransparentImageElement.onload = () => {
      // Restore view with result
      loaderStage.classList.add('hidden');
      loaderStage.classList.remove('flex');
      editorStage.classList.remove('hidden');
      editorStage.classList.add('flex');
      
      // Setup checkers background and result src
      imgResult.src = blobURL;
      imgResult.classList.remove('opacity-0');
      checkersBg.classList.remove('hidden');
      gridBg.classList.add('hidden');
      
      // Update badge style and content
      previewBadge.textContent = 'Background Removed';
      previewBadge.className = 'absolute top-4 left-4 px-3 py-1 bg-cyan-950/80 backdrop-blur-md border border-cyan-500/30 rounded-full text-[10px] uppercase font-bold tracking-wider text-cyan-400 z-20';
      
      // Process enhancements (default sliders values)
      window.isFallbackActive = false;
      applyEnhancements();

      logConsole('[PROC] Neural network classification mask applied successfully.', 'success');
      logConsole('[IO] Generated transparent PNG subject rendered to output frame.', 'success');
    };

  } catch (error) {
    console.warn('AI removal info:', error);
    logConsole(`[INFO] Primary neural network is offline: ${error.message || error}`, 'error');
    showToast(`AI network blocked or failed to load. Falling back to local high-precision visual segmenter...`, 'info');
    
    // Simulation fallback in case CDN blocks WASM download or low memory
    simulateRemovalFallback();
  }
}

// Advanced Border-Keying and Connected-Component Flood-Fill Fallback
function simulateRemovalFallback() {
  updateLoader('Running fail-safe border keying segmentation...', 60);
  logConsole('[SYSTEM] Warning: Neural engine blocked or low memory. Deploying premium connected edge-keying segmenter...', 'pulse');
  window.isFallbackActive = true;

  const tempImg = new Image();
  tempImg.src = originalImageSrc;
  tempImg.onload = () => {
    const canvas = processingCanvas;
    const ctx = canvas.getContext('2d');
    canvas.width = tempImg.naturalWidth;
    canvas.height = tempImg.naturalHeight;
    ctx.drawImage(tempImg, 0, 0);
    
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const width = canvas.width;
    const height = canvas.height;
    
    // Sample boundary colors to learn background distribution (top, bottom, left, right edges)
    const borderSamples = [];
    const samplePixel = (x, y) => {
      const idx = (y * width + x) * 4;
      borderSamples.push({ r: data[idx], g: data[idx+1], b: data[idx+2] });
    };
    
    // Sample top row (every 20th pixel) to learn background colors
    for (let x = 0; x < width; x += Math.max(1, Math.floor(width / 20))) {
      samplePixel(x, 0);
    }
    // Sample left and right columns, but ONLY the upper 75% of height to protect subjects/characters resting at the bottom
    const sampleHeightLimit = Math.floor(height * 0.75);
    for (let y = 0; y < sampleHeightLimit; y += Math.max(1, Math.floor(height / 20))) {
      samplePixel(0, y);
      samplePixel(width - 1, y);
    }
    
    // Pre-calculate L2 RGB distances of all pixels to the nearest border background color
    const colorDistances = new Float32Array(width * height);
    const centerDistances = new Float32Array(width * height);
    const maxCenterDist = Math.sqrt((width/2)**2 + (height/2)**2);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx+1];
        const b = data[idx+2];
        
        // Minimum Euclidean distance in RGB color space
        let minDist = 999999;
        for (let s = 0; s < borderSamples.length; s++) {
          const sample = borderSamples[s];
          const dist = Math.sqrt(
            (r - sample.r) ** 2 +
            (g - sample.g) ** 2 +
            (b - sample.b) ** 2
          );
          if (dist < minDist) minDist = dist;
        }
        
        const pixelIdx = y * width + x;
        colorDistances[pixelIdx] = minDist;
        
        // Normalized distance to the center (0 in center, 1 in corners)
        const distToCenter = Math.sqrt((x - width/2)**2 + (y - height/2)**2) / maxCenterDist;
        centerDistances[pixelIdx] = distToCenter;
      }
    }
    
    // Save segmenter cache globally for fast real-time slider threshold tuning
    window.fallbackSegmenterData = {
      width,
      height,
      colorDistances,
      centerDistances,
      originalData: new Uint8ClampedArray(data)
    };
    
    // Apply initial rendering
    applyFallbackSegmentation();
  };
}

// Applies transparent masking using border distance cache, connectivity constraints, and slider threshold inputs
function applyFallbackSegmentation() {
  if (!window.fallbackSegmenterData) return;
  
  const { width, height, colorDistances, centerDistances, originalData } = window.fallbackSegmenterData;
  const canvas = processingCanvas;
  const ctx = canvas.getContext('2d');
  
  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;
  
  // Get active slider values
  const sharpness = parseInt(sharpnessSlider.value); // 0 to 100%
  const contrast = parseInt(contrastSlider.value); // 50 to 150% (base tolerance)
  const brightness = parseInt(brightnessSlider.value); // 50 to 150%
  
  // Base background tolerance color distance
  const baseTolerance = (contrast / 100) * 45; // default around 45 in color distance
  
  // Sharpness controls width of the soft transparency transition edge
  const transitionWidth = Math.max(1, 30 - (sharpness / 100) * 29);
  
  // Subject Protection Zone (usually horizontally centered and vertically from middle to bottom)
  // Let's protect a wider region centered at (width * 0.5, height * 0.6) with horizontal radius (width * 0.45) and vertical radius (height * 0.55)
  const getSubjectProtection = (idx) => {
    const px = idx % width;
    const py = (idx / width) | 0;
    
    // Normalized distance from subject center
    const dx = (px - width * 0.5) / (width * 0.45);
    const dy = (py - height * 0.6) / (height * 0.55);
    const distToSubjectCenter = Math.sqrt(dx * dx + dy * dy);
    
    // Strongest protection in the center of the subject zone, tapering off
    return Math.max(0, 1 - distToSubjectCenter);
  };
  
  const numPixels = width * height;
  const visited = new Uint8Array(numPixels);
  const queue = new Int32Array(numPixels);
  let qHead = 0;
  let qTail = 0;
  
  // 1. Queue seeds from borders (top row, left & right columns up to 80% height)
  // Top row seeds
  for (let x = 0; x < width; x++) {
    const idx = x; // y = 0
    const centerDist = centerDistances[idx];
    const protection = getSubjectProtection(idx);
    const localTolerance = baseTolerance * (0.7 + 0.45 * centerDist) * (1.0 - 0.85 * protection);
    if (colorDistances[idx] < localTolerance + transitionWidth) {
      visited[idx] = 1;
      queue[qTail++] = idx;
    }
  }
  
  // Left and Right columns (upper 80% height)
  const seedHeight = Math.floor(height * 0.8);
  for (let y = 1; y < seedHeight; y++) {
    // Left column
    const idxLeft = y * width;
    let centerDist = centerDistances[idxLeft];
    let protection = getSubjectProtection(idxLeft);
    let localTolerance = baseTolerance * (0.7 + 0.45 * centerDist) * (1.0 - 0.85 * protection);
    if (colorDistances[idxLeft] < localTolerance + transitionWidth) {
      visited[idxLeft] = 1;
      queue[qTail++] = idxLeft;
    }
    
    // Right column
    const idxRight = y * width + (width - 1);
    centerDist = centerDistances[idxRight];
    protection = getSubjectProtection(idxRight);
    localTolerance = baseTolerance * (0.7 + 0.45 * centerDist) * (1.0 - 0.85 * protection);
    if (colorDistances[idxRight] < localTolerance + transitionWidth) {
      visited[idxRight] = 1;
      queue[qTail++] = idxRight;
    }
  }
  
  // 2. Run highly-optimized BFS Flood Fill
  while (qHead < qTail) {
    const curr = queue[qHead++];
    const cx = curr % width;
    const cy = (curr / width) | 0; // fast integer division
    
    // Check 4-neighbors
    const neighbors = [
      curr - 1,     // Left
      curr + 1,     // Right
      curr - width, // Up
      curr + width  // Down
    ];
    
    for (let i = 0; i < 4; i++) {
      const neighborIdx = neighbors[i];
      
      // Bounds check
      if (i === 0 && cx === 0) continue; // Left boundary check
      if (i === 1 && cx === width - 1) continue; // Right boundary check
      if (i === 2 && cy === 0) continue; // Top boundary check
      if (i === 3 && cy === height - 1) continue; // Bottom boundary check
      
      if (visited[neighborIdx] === 0) {
        const centerDist = centerDistances[neighborIdx];
        const protection = getSubjectProtection(neighborIdx);
        const localTolerance = baseTolerance * (0.7 + 0.45 * centerDist) * (1.0 - 0.85 * protection);
        
        if (colorDistances[neighborIdx] < localTolerance + transitionWidth) {
          visited[neighborIdx] = 1;
          queue[qTail++] = neighborIdx;
        }
      }
    }
  }
  
  // 3. Apply final background mask & image adjustments (brightness)
  for (let i = 0; i < numPixels; i++) {
    const idx = i * 4;
    
    // Base RGB copy
    data[idx] = originalData[idx];
    data[idx+1] = originalData[idx+1];
    data[idx+2] = originalData[idx+2];
    
    // Adjust brightness if needed
    if (brightness !== 100) {
      const factor = brightness / 100;
      data[idx] = Math.min(255, data[idx] * factor);
      data[idx+1] = Math.min(255, data[idx+1] * factor);
      data[idx+2] = Math.min(255, data[idx+2] * factor);
    }
    
    // Set transparency based on visited (background) status and distance
    if (visited[i] === 1) {
      const minDist = colorDistances[i];
      const centerDist = centerDistances[i];
      const protection = getSubjectProtection(i);
      const localTolerance = baseTolerance * (0.7 + 0.45 * centerDist) * (1.0 - 0.85 * protection);
      
      if (minDist < localTolerance) {
        data[idx+3] = 0; // 100% background (transparent)
      } else {
        // Soft transition zone (anti-aliasing)
        const ratio = (minDist - localTolerance) / transitionWidth;
        const alpha = Math.min(255, Math.max(0, Math.round(ratio * 255)));
        // Make sure it doesn't exceed the original alpha
        data[idx+3] = Math.min(originalData[idx+3], alpha);
      }
    } else {
      // Not part of connected background -> 100% foreground (opaque)
      data[idx+3] = originalData[idx+3];
    }
  }
  
  ctx.putImageData(imgData, 0, 0);
  
  canvas.toBlob((blob) => {
    rawTransparentBlob = blob;
    const blobURL = URL.createObjectURL(blob);
    
    imgResult.src = blobURL;
    imgResult.classList.remove('opacity-0');
    checkersBg.classList.remove('hidden');
    gridBg.classList.add('hidden');
    
    // Update badge style and content
    previewBadge.textContent = 'Background Removed';
    previewBadge.className = 'absolute top-4 left-4 px-3 py-1 bg-cyan-950/80 backdrop-blur-md border border-cyan-500/30 rounded-full text-[10px] uppercase font-bold tracking-wider text-cyan-400 z-20';
    
    btnDownload.disabled = false;
    btnDownload.onclick = () => {
      handleAdRedirect(() => {
        const link = document.createElement('a');
        link.download = `openbg_ai_${Date.now()}.png`;
        link.href = blobURL;
        link.click();
      });
    };
    
    showingOriginal = false;
    
    // Hide loader and show workspace
    loaderStage.classList.add('hidden');
    loaderStage.classList.remove('flex');
    editorStage.classList.remove('hidden');
    editorStage.classList.add('flex');
  });
}

// Update Loader UI
function updateLoader(statusText, percent) {
  loaderStatus.textContent = statusText;
  loaderProgressBar.style.width = `${percent}%`;
  loaderPercent.textContent = `${percent}%`;
}

// Reset App State
function resetApp() {
  originalImageFile = null;
  originalImageSrc = null;
  activeOriginalImage = null;
  rawTransparentBlob = null;
  rawTransparentImageElement = null;
  showingOriginal = false;
  
  imgResult.src = '';
  imgResult.classList.add('opacity-0');
  checkersBg.classList.add('hidden');
  gridBg.classList.remove('hidden');
  
  previewBadge.textContent = 'Original Preview';
  previewBadge.className = 'absolute top-4 left-4 px-3 py-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-[10px] uppercase font-bold tracking-wider text-slate-400 z-20';
  
  editorStage.classList.add('hidden');
  editorStage.classList.remove('flex');
  uploadStage.classList.remove('hidden');
  fileInput.value = '';

  // Clear and reset status console logs
  const consoleLog = document.getElementById('console-log');
  if (consoleLog) {
    consoleLog.innerHTML = `
      <p class="text-green-400 font-semibold">[SYSTEM] Engine Initialized (v2.4.2)</p>
      <p>[INFO] Model: u2net_human_seg</p>
      <p>[INFO] Device: Local CPU via WebAssembly</p>
      <p class="text-slate-500">[IDLE] Awaiting image input...</p>
    `;
  }
}

// Trigger initializations on DOM Content Loaded
document.addEventListener('DOMContentLoaded', init);

// Global ad-blocking and timed redirect mechanism
window.handleAdRedirect = function(actionCallback) {
  const AD_URL = "https://www.effectivecpmnetwork.com/h4pcytdwq?key=b96243be17076bf65bd54aa1b633b434";
  const COOLDOWN_MS = 60 * 1000; // 1 minute
  
  const lastAdTime = localStorage.getItem('lastAdTime');
  const now = Date.now();
  
  if (!lastAdTime || (now - parseInt(lastAdTime, 10)) > COOLDOWN_MS) {
    localStorage.setItem('lastAdTime', now.toString());
    window.open(AD_URL, '_blank');
    // Also execute the action immediately after opening the ad
    setTimeout(function() {
      actionCallback();
    }, 200);
  } else {
    actionCallback();
  }
};
