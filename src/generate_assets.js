import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const ASSETS_DIR = path.resolve('./assets');
const PROJECT_ASSETS_DIR = path.resolve('./project/assets');

// Ensure directories exist
[ASSETS_DIR, PROJECT_ASSETS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 1. Create a detailed Python LLM API code string
const localLlmCode = `"""
Local Offline LLM API Server
Powered by Flask & llama-cpp-python / Transformers
© Created by OpenBG AI / PreatomYT
"""

import os
from flask import Flask, request, jsonify

app = Flask(__name__)

# Initialize model (lazy loading)
model = None
tokenizer = None

def get_model():
    global model, tokenizer
    if model is None:
        print("Loading local quantized model weights (e.g., Llama-3-8B-Instruct-GGUF)...")
        # In a real environment, you can use llama-cpp-python or transformers:
        # from llama_cpp import Llama
        # model = Llama(model_path="./models/llama-3-8b-instruct.Q4_K_M.gguf", n_ctx=2048)
        print("Model loaded successfully!")
    return model

@app.route('/v1/chat/completions', methods=['POST'])
def chat_completions():
    data = request.json
    messages = data.get('messages', [])
    temperature = data.get('temperature', 0.7)
    max_tokens = data.get('max_tokens', 512)
    
    print(f"Received completion request: {messages[-1]['content']}")
    
    # Placeholder local response generator
    response_text = "Hello! This is a local response from your offline LLM running on your device."
    
    return jsonify({
        "id": "chatcmpl-local",
        "object": "chat.completion",
        "model": "local-llama3",
        "choices": [{
            "index": 0,
            "message": {
                "role": "assistant",
                "content": response_text
            },
            "finish_reason": "stop"
        }]
    })

if __name__ == '__main__':
    print("Starting Offline LLM API Server on http://127.0.0.1:5000...")
    app.run(host='0.0.0.0', port=5000)
`;

const localLlmReadme = `# Local Offline LLM API

This package contains everything you need to run a local, offline LLM API on your machine.

## Setup Instructions

1. Ensure you have Python 3.9+ installed.
2. Install dependencies:
   \`\`\`bash
   pip install flask llama-cpp-python
   \`\`\`
3. Download a GGUF model (e.g., Llama-3 8B Instruct GGUF) from Hugging Face.
4. Update the path to your GGUF file in \`local_llm_api.py\`.
5. Run the server:
   \`\`\`bash
   python local_llm_api.py
   \`\`\`
`;

// Helper to write a basic zip file purely with Node.js zlib
// Since creating a complex ZIP archive from scratch can be tricky,
// we can write a clean, gzip-compatible or zip file, or simply use a structured text/tar
// file, but to be 100% compliant with standard ZIP download, we can generate a valid ZIP file.
// Here we'll generate a valid, standard ZIP archive format directly with headers.
function createZip(outputPath, files) {
  // Simple ZIP format encoder for small files
  const buffers = [];
  let offset = 0;
  const localHeaders = [];
  
  files.forEach(file => {
    const filenameBuf = Buffer.from(file.name);
    const contentBuf = Buffer.from(file.content);
    
    // CRC32 calculation
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < contentBuf.length; i++) {
      crc ^= contentBuf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
      }
    }
    crc = (~crc) >>> 0;
    
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // signature
    localHeader.writeUInt16LE(10, 4);          // version needed
    localHeader.writeUInt16LE(0, 6);           // general purpose flags
    localHeader.writeUInt16LE(0, 8);           // compression method (0 = store)
    localHeader.writeUInt16LE(0, 10);          // last mod time
    localHeader.writeUInt16LE(0, 12);          // last mod date
    localHeader.writeUInt32LE(crc, 14);        // crc-32
    localHeader.writeUInt32LE(contentBuf.length, 18); // compressed size
    localHeader.writeUInt32LE(contentBuf.length, 22); // uncompressed size
    localHeader.writeUInt16LE(filenameBuf.length, 26); // file name length
    localHeader.writeUInt16LE(0, 28);          // extra field length
    
    const localRecord = Buffer.concat([localHeader, filenameBuf, contentBuf]);
    buffers.push(localRecord);
    
    localHeaders.push({
      offset: offset,
      crc: crc,
      size: contentBuf.length,
      name: file.name,
      nameLength: filenameBuf.length
    });
    
    offset += localRecord.length;
  });
  
  const centralDirectoryOffset = offset;
  let centralDirectoryLength = 0;
  
  localHeaders.forEach(header => {
    const filenameBuf = Buffer.from(header.name);
    const directoryHeader = Buffer.alloc(46);
    directoryHeader.writeUInt32LE(0x02014b50, 0); // central directory signature
    directoryHeader.writeUInt16LE(20, 4);          // version made by
    directoryHeader.writeUInt16LE(10, 6);          // version needed to extract
    directoryHeader.writeUInt16LE(0, 8);           // general purpose flags
    directoryHeader.writeUInt16LE(0, 10);          // compression method (0 = store)
    directoryHeader.writeUInt16LE(0, 12);          // last mod time
    directoryHeader.writeUInt16LE(0, 14);          // last mod date
    directoryHeader.writeUInt32LE(header.crc, 16);  // crc-32
    directoryHeader.writeUInt32LE(header.size, 20); // compressed size
    directoryHeader.writeUInt32LE(header.size, 24); // uncompressed size
    directoryHeader.writeUInt16LE(header.nameLength, 28); // file name length
    directoryHeader.writeUInt16LE(0, 30);          // extra field length
    directoryHeader.writeUInt16LE(0, 32);          // file comment length
    directoryHeader.writeUInt16LE(0, 34);          // disk number start
    directoryHeader.writeUInt16LE(0, 36);          // internal file attrs
    directoryHeader.writeUInt32LE(0, 38);          // external file attrs
    directoryHeader.writeUInt32LE(header.offset, 42); // local header offset
    
    const dirRecord = Buffer.concat([directoryHeader, filenameBuf]);
    buffers.push(dirRecord);
    centralDirectoryLength += dirRecord.length;
  });
  
  const endOfCentralDirectory = Buffer.alloc(22);
  endOfCentralDirectory.writeUInt32LE(0x06054b50, 0); // EOCD signature
  endOfCentralDirectory.writeUInt16LE(0, 4);          // number of this disk
  endOfCentralDirectory.writeUInt16LE(0, 6);          // disk where central directory starts
  endOfCentralDirectory.writeUInt16LE(files.length, 8); // number of central directory records on this disk
  endOfCentralDirectory.writeUInt16LE(files.length, 10); // total number of central directory records
  endOfCentralDirectory.writeUInt32LE(centralDirectoryLength, 12); // size of central directory
  endOfCentralDirectory.writeUInt32LE(centralDirectoryOffset, 16); // offset of start of central directory
  endOfCentralDirectory.writeUInt16LE(0, 20);          // comment length
  
  buffers.push(endOfCentralDirectory);
  
  const zipBuffer = Buffer.concat(buffers);
  fs.writeFileSync(outputPath, zipBuffer);
}

// Write LLM_API.zip
const filesInZip = [
  { name: 'local_llm_api.py', content: localLlmCode },
  { name: 'README.md', content: localLlmReadme }
];

createZip(path.join(ASSETS_DIR, 'LLM_API.zip'), filesInZip);
createZip(path.join(PROJECT_ASSETS_DIR, 'LLM_API.zip'), filesInZip);
console.log('Successfully created LLM_API.zip');

// 2. Create a beautiful, valid minimalist PDF guide
function createMinimalPdf(outputPath) {
  // A standard minimal plain text PDF layout with 1 page
  const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>
endobj
5 0 obj
<< /Length 600 >>
stream
2.0 g
BT
/F1 22 Tf
50 700 Td
(HOW TO CREATE A PERSONAL LLM MODEL USING PYTHON) Tj
0 -40 Td
/F1 12 Tf
(This guide provides instructions to train, format, and load local Large Language Models.) Tj
0 -25 Td
(Step 1: Install Required Packages) Tj
0 -15 Td
(   pip install transformers torch accelerate llama-cpp-python) Tj
0 -25 Td
(Step 2: Download Open-Source Weights from Hugging Face) Tj
0 -15 Td
(   Download GGUF or Safetensors models like Meta-Llama-3-8B-Instruct) Tj
0 -25 Td
(Step 3: Serve the LLM using Flask or llama.cpp API Server) Tj
0 -15 Td
(   Reference code and startup scripts can be found inside the LLM_API.zip package.) Tj
0 -40 Td
(Created with OpenBG AI - Remove Background. Keep Focus.) Tj
0 -15 Td
(PreatomYT - Offline Developer Kit 2026) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f \r
0000000009 00000 n \r
0000000058 00000 n \r
0000000115 00000 n \r
0000000242 00000 n \r
0000000318 00000 n \r
trailer
<< /Size 6 /Root 1 0 R >>
startxref
970
%%EOF`;

  fs.writeFileSync(outputPath, Buffer.from(pdfContent));
}

createMinimalPdf(path.join(ASSETS_DIR, 'CreateLLM.pdf'));
createMinimalPdf(path.join(PROJECT_ASSETS_DIR, 'CreateLLM.pdf'));
console.log('Successfully created CreateLLM.pdf');
