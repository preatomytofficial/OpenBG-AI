/**
 * OpenBG AI - Frontend Logic (Local Export Version)
 * Powered by @imgly/background-removal for offline, browser-local AI background removal
 * © This Tool is Made by PreatomYT
 */

// App State
let originalImageFile = null;
let originalImageSrc = null;
let rawTransparentBlob = null;
let rawTransparentImageElement = null; // Caches the transparent result without enhancements applied
let showingOriginal = false;

// DOM Elements
const uploadStage = document.getElementById('upload-stage');
const fileInput = document.getElementById('file-input');
const loaderStage = document.getElementById('loader-stage');
const loaderStatus = document.getElementById('loader-status');
const loaderDetail = document.getElementById('loader-detail');
const loaderProgressBar = document.getElementById('loader-progress-bar');
const loaderPercent = document.getElementById('loader-percent');

const editorStage = document.getElementById('editor-stage');
const imgOriginal = document.getElementById('img-original');
const imgResult = document.getElementById('img-result');
const checkersBg = document.getElementById('checkers-bg');
const processingCanvas = document.getElementById('processing-canvas');

// Buttons
const btnRemoveBg = document.getElementById('btn-remove-bg');
const btnReset = document.getElementById('btn-reset');
const btnDownload = document.getElementById('btn-download');
const btnCompareToggle = document.getElementById('btn-compare-toggle');
const compareText = document.getElementById('compare-text');

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

  contrastSlider.addEventListener('input', (e) => {
    contrastVal.textContent = `${e.target.value}%`;
    applyEnhancements();
  });

  brightnessSlider.addEventListener('input', (e) => {
    brightnessVal.textContent = `${e.target.value}%`;
    applyEnhancements();
  });

  // Action Buttons
  btnRemoveBg.addEventListener('click', performBackgroundRemoval);
  btnReset.addEventListener('click', resetApp);
  btnCompareToggle.addEventListener('click', toggleComparison);
}

// Handling chosen image
function handleImageSelection(file) {
  if (!file.type.match('image.*')) {
    alert('Please select a valid image file (PNG, JPG, JPEG).');
    return;
  }

  originalImageFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    originalImageSrc = e.target.result;
    
    // Setup views
    imgOriginal.src = originalImageSrc;
    imgOriginal.classList.remove('opacity-0');
    imgResult.classList.add('opacity-0');
    checkersBg.classList.add('hidden');
    
    // Switch stages
    uploadStage.classList.add('hidden');
    editorStage.classList.remove('hidden');
    editorStage.classList.add('flex');
    
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
    btnCompareToggle.classList.add('hidden');
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
  const activeImage = rawTransparentImageElement || imgOriginal;
  if (!activeImage.complete || activeImage.naturalWidth === 0) return;

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
  if (rawTransparentImageElement) {
    imgResult.src = enhancedDataURL;
    imgResult.classList.remove('opacity-0');
    checkersBg.classList.remove('hidden');
  } else {
    imgOriginal.src = enhancedDataURL;
  }
  
  // Enable download button with enhanced canvas result
  if (rawTransparentImageElement) {
    btnDownload.disabled = false;
    btnDownload.onclick = () => {
      const link = document.createElement('a');
      link.download = `openbg_ai_${Date.now()}.png`;
      link.href = enhancedDataURL;
      link.click();
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
        if (key.includes('fetch')) {
          statusText = `Downloading Local AI Model Weights...`;
        } else if (key.includes('onnx') || key.includes('model')) {
          statusText = 'Injecting AI Tensors to Device Memory...';
        } else if (key.includes('inference')) {
          statusText = 'AI Detecting Boundaries & Contours...';
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
      
      // Hide original, show checkers, show processed result
      imgOriginal.classList.add('opacity-0');
      imgResult.src = blobURL;
      imgResult.classList.remove('opacity-0');
      checkersBg.classList.remove('hidden');
      
      // Setup Compare state
      showingOriginal = false;
      compareText.textContent = 'Show Original';
      btnCompareToggle.classList.remove('hidden');
      
      // Process enhancements (default sliders values)
      applyEnhancements();
    };

  } catch (error) {
    console.warn('AI removal info:', error);
    alert(`Encountered info: ${error.message || error}. Falling back to visual simulation mask...`);
    simulateRemovalFallback();
  }
}

// Simulates background removal using canvas processing if WASM is blocked
function simulateRemovalFallback() {
  updateLoader('Running fail-safe contrast segmentation...', 60);
  
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
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      if (r > 200 && g > 200 && b > 200) {
        data[i + 3] = 0;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    
    canvas.toBlob((blob) => {
      rawTransparentBlob = blob;
      const blobURL = URL.createObjectURL(blob);
      
      rawTransparentImageElement = new Image();
      rawTransparentImageElement.src = blobURL;
      rawTransparentImageElement.onload = () => {
        loaderStage.classList.add('hidden');
        loaderStage.classList.remove('flex');
        editorStage.classList.remove('hidden');
        editorStage.classList.add('flex');
        
        imgOriginal.classList.add('opacity-0');
        imgResult.src = blobURL;
        imgResult.classList.remove('opacity-0');
        checkersBg.classList.remove('hidden');
        
        showingOriginal = false;
        compareText.textContent = 'Show Original';
        btnCompareToggle.classList.remove('hidden');
        
        applyEnhancements();
      };
    });
  };
}

// Toggle Comparison (Original vs Result)
function toggleComparison() {
  if (!rawTransparentImageElement) return;

  showingOriginal = !showingOriginal;
  if (showingOriginal) {
    imgOriginal.classList.remove('opacity-0');
    imgResult.classList.add('opacity-0');
    checkersBg.classList.add('hidden');
    compareText.textContent = 'Show Processed';
  } else {
    imgOriginal.classList.add('opacity-0');
    imgResult.classList.remove('opacity-0');
    checkersBg.classList.remove('hidden');
    compareText.textContent = 'Show Original';
  }
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
  rawTransparentBlob = null;
  rawTransparentImageElement = null;
  showingOriginal = false;
  
  imgOriginal.src = '';
  imgResult.src = '';
  imgOriginal.classList.add('opacity-0');
  imgResult.classList.add('opacity-0');
  checkersBg.classList.add('hidden');
  
  editorStage.classList.add('hidden');
  editorStage.classList.remove('flex');
  uploadStage.classList.remove('hidden');
  fileInput.value = '';
}

// Trigger initializations on DOM Content Loaded
document.addEventListener('DOMContentLoaded', init);
