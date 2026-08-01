# OpenBG AI 🚀

An elegant, production-grade, 100% offline background remover and image enhancement application. Powered by advanced local AI model weights, spatial sharpening kernels, and custom rendering parameters.

Designed and crafted by **PreatomYT**.

---

## 📂 Project Directory Structure

```text
/project
 ├── frontend/
 │   ├── index.html       # Main application user interface
 │   ├── api.html         # Developer LLM resources download page
 │   ├── style.css        # Shared custom styling & animations
 │   ├── script.js        # Offline browser-local background remover engine
 │
 ├── backend/
 │   ├── app.py           # Python Flask background removal API
 │   ├── requirements.txt # Python package requirements
 │
 ├── assets/
 │   ├── LLM_API.zip      # Packaged offline local LLM completion server
 │   └── CreateLLM.pdf    # Comprehensive PDF local LLM developer manual
```

---

## ⚡ Quick Start: Running Frontend Locally (Zero Install)

The frontend is designed to be **entirely zero-install** and runnable out-of-the-box using the browser-local WebAssembly (WASM) background removal engine.

1. Navigate to the `frontend/` directory.
2. Double-click `index.html` to open it in your web browser.
3. Drag & drop any image file.
4. Adjust Contrast, Sharpness, and Brightness sliders.
5. Click **"Remove Background"**.
6. Hover to compare original vs processed, and download your transparent PNG!

*Note: The first background removal will fetch and cache the AI model weights (`~100MB`) locally inside your browser's IndexedDB storage. Subsequent removals will trigger instantly with zero network activity!*

---

## 🐍 Full Stack Setup: Running Python Flask Backend

If you want to host the background remover on your own server or use the Python Flask API, follow these steps:

### 1. Prerequisite Installations
Ensure you have **Python 3.9+** and `pip` installed.

### 2. Install Package Dependencies
Open your terminal inside the `backend/` directory and install the packages listed in `requirements.txt`:
```bash
pip install -r requirements.txt
```

### 3. Launch the API Server
Run the Flask server:
```bash
python app.py
```
This boots up the local OpenBG AI pipeline server on `http://127.0.0.1:5000`.

### 4. API Endpoints

#### POST `/remove-bg`
Performs background segmentations + sharpness/clarity filters.
- **Request Parameters (Form-Data)**:
  - `image`: The target JPG/PNG file (Binary data).
- **Optional URL Query Parameters**:
  - `sharpness`: Floating scaling factor for OpenCV sharpen kernel (Default `1.2`).
  - `contrast`: Floating factor for Pillow contrast enhancer (Default `1.1`).
  - `brightness`: Floating factor for Pillow brightness adjustment (Default `1.0`).
- **Response**:
  - A high-resolution `image/png` binary stream containing the transparent subject.

---

## 🧠 Developer LLM Resources (api.html)

If you navigate to the **"Get API Key"** button on the top-right corner, you'll reach the developer resource suite (`api.html`):
1. **Download Our Personal LLM API (`LLM_API.zip`)**: Includes a local Python server powered by `transformers` or `llama-cpp-python` to spin up a fully compliant OpenAI-like completions endpoint on your laptop without any API keys!
2. **How To Create Personal LLM Model (`CreateLLM.pdf`)**: A comprehensive step-by-step developer manual covering model quantization, Hugging Face weight parsing, and hardware optimization pipelines.

---

## 💎 Features Implemented
- [x] **Zero-Network local AI execution** via ONNX-WebAssembly model weights.
- [x] **Advanced image enhancements** featuring high-precision spatial sharpen kernels and gamma adjustments.
- [x] **Top-right premium API router** navigating to an elegant developer console.
- [x] **Bento-style Glassmorphic layout** featuring custom color gradients and interactive alpha checkers.
- [x] **Full-Stack python fallback** ready for local servers or deployment pipelines.

Developed with care. Remove backgrounds, keep absolute focus.
**© Made by PreatomYT**
