"""
OpenBG AI - Python Flask Backend API
Uses rembg (U2Net), OpenCV, and Pillow for high-quality offline background removal & clarity enhancement
© Created by OpenBG AI / PreatomYT
"""

import io
import os
import numpy as np
from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
from PIL import Image, ImageEnhance
import cv2
import rembg

app = Flask(__name__)
# Enable Cross-Origin Resource Sharing (CORS) for smooth multi-port integration
CORS(app)

# Cache rembg session globally for u2net to keep execution fast
rembg_session = None

def get_rembg_session():
    global rembg_session
    if rembg_session is None:
        print("Initializing rembg session with u2net model...")
        try:
            rembg_session = rembg.new_session("u2net")
        except Exception as e:
            print(f"Failed to load u2net, falling back to default session: {e}")
            rembg_session = rembg.new_session()
    return rembg_session

@app.route('/remove-bg', methods=['POST'])
def remove_background():
    """
    Accepts an image file via POST, removes the background,
    applies OpenCV sharpening + Pillow enhancements, and returns a transparent PNG.
    """
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided in 'image' form-data field"}), 400
        
    file = request.files['image']
    if file.filename == '':
        return jsonify({"error": "Selected file has an empty filename"}), 400

    try:
        # Read uploaded image bytes
        image_bytes = file.read()
        
        # 1. AI Background Removal (rembg uses u2net model offline)
        print("Running AI background segmentation (u2net)...")
        session = get_rembg_session()
        output_bytes = rembg.remove(image_bytes, session=session)
        
        # Load processed image into Pillow
        pil_image = Image.open(io.BytesIO(output_bytes)).convert("RGBA")
        
        # Get optional enhancement parameters from request parameters (default values if not provided)
        sharpness_val = float(request.args.get('sharpness', 1.2)) # default 1.2 scaling
        contrast_val = float(request.args.get('contrast', 1.1))    # default 1.1 scaling
        brightness_val = float(request.args.get('brightness', 1.0)) # default 1.0 scaling
        
        # 2. OpenCV Image Sharpening
        # Convert PIL RGBA to NumPy array (OpenCV uses BGRA)
        img_np = np.array(pil_image)
        img_cv = cv2.cvtColor(img_np, cv2.COLOR_RGBA2BGRA)
        
        # Define 3x3 sharpening kernel
        #   0  -v  0
        #  -v 1+4v -v
        #   0  -v  0
        if sharpness_val > 1.0:
            print("Applying OpenCV spatial sharpening kernel...")
            v = (sharpness_val - 1.0) / 2.0
            kernel = np.array([
                [0, -v, 0],
                [-v, 1 + 4*v, -v],
                [0, -v, 0]
            ])
            # Apply convolution matrix filter
            img_cv = cv2.filter2D(img_cv, -1, kernel)
            
        # Convert back to PIL Image (RGBA)
        img_np_enhanced = cv2.cvtColor(img_cv, cv2.COLOR_BGRA2RGBA)
        pil_image = Image.fromarray(img_np_enhanced)
        
        # 3. Pillow Contrast & Brightness Enhancements
        if contrast_val != 1.0:
            print(f"Applying PIL Contrast enhancement (factor: {contrast_val})...")
            contrast_enhancer = ImageEnhance.Contrast(pil_image)
            pil_image = contrast_enhancer.enhance(contrast_val)
            
        if brightness_val != 1.0:
            print(f"Applying PIL Brightness enhancement (factor: {brightness_val})...")
            brightness_enhancer = ImageEnhance.Brightness(pil_image)
            pil_image = brightness_enhancer.enhance(brightness_val)

        # Save result to memory stream
        result_io = io.BytesIO()
        pil_image.save(result_io, 'PNG')
        result_io.seek(0)
        
        print("Background removal & enhancement pipeline completed successfully.")
        return send_file(result_io, mimetype='image/png', download_name='openbg_result.png')

    except Exception as e:
        print(f"Pipeline error: {str(e)}")
        return jsonify({"error": f"An error occurred during image processing: {str(e)}"}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Simple API health probe endpoint"""
    return jsonify({"status": "healthy", "service": "OpenBG AI Engine"}), 200

if __name__ == '__main__':
    # Default Flask local execution port 5000
    print("Starting OpenBG AI Flask Core Backend...")
    app.run(host='0.0.0.0', port=5000, debug=True)
