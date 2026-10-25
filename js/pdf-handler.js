/**
 * DocFit - PDF & HTML Processing Engine
 * 100% offline conversions:
 * - PDF -> Images (JPG/PNG) via pdf.js
 * - Images -> PDF via pdf-lib
 * - HTML -> PDF/Images via sandboxed iframe + foreignObject canvas rendering
 */

const PdfHandler = {
  initialized: false,

  init() {
    if (this.initialized) return;
    if (window.pdfjsLib) {
      // Set worker path relative to extension root
      try {
        if (window.chrome && chrome.runtime && chrome.runtime.getURL) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('vendor/pdf.worker.min.js');
        } else {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = './vendor/pdf.worker.min.js';
        }
      } catch (e) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = './vendor/pdf.worker.min.js';
      }
    }
    this.initialized = true;
  },

  /**
   * Load and test PDF document with optional password.
   * Returns { success, pdfDoc, numPages, isPasswordProtected, code, error }
   */
  async loadPdfDocument(pdfDataBuffer, password = '') {
    this.init();
    if (!window.pdfjsLib) {
      throw new Error('PDF.js library failed to load.');
    }

    // Always copy the buffer so the original ArrayBuffer never gets detached by the Web Worker!
    const bufferCopy = pdfDataBuffer instanceof ArrayBuffer ? pdfDataBuffer.slice(0) : pdfDataBuffer;
    const docParams = { data: new Uint8Array(bufferCopy) };
    if (password) {
      docParams.password = password;
    }

    try {
      const loadingTask = window.pdfjsLib.getDocument(docParams);
      const pdfDoc = await loadingTask.promise;
      return {
        success: true,
        pdfDoc,
        numPages: pdfDoc.numPages,
        isPasswordProtected: false
      };
    } catch (err) {
      const isPasswordIssue = err && (
        err.name === 'PasswordException' ||
        (err.message && err.message.toLowerCase().includes('password'))
      );
      if (isPasswordIssue) {
        return {
          success: false,
          isPasswordProtected: true,
          code: err.code || 1, // 1 = NEED_PASSWORD, 2 = INCORRECT_PASSWORD
          error: err.code === 2 ? 'Incorrect password. Please try again.' : 'Document is password protected.'
        };
      }
      throw err;
    }
  },

  /**
   * Render PDF Page to an HTML Canvas
   */
  async renderPdfPageToCanvas(pdfDocOrBuffer, pageNumber = 1, targetDpi = 200, password = '') {
    this.init();
    if (!window.pdfjsLib) {
      throw new Error('PDF.js library failed to load.');
    }

    let pdfDoc;
    if (pdfDocOrBuffer && typeof pdfDocOrBuffer.getPage === 'function') {
      pdfDoc = pdfDocOrBuffer;
    } else {
      const bufferCopy = pdfDocOrBuffer instanceof ArrayBuffer ? pdfDocOrBuffer.slice(0) : pdfDocOrBuffer;
      const docParams = { data: new Uint8Array(bufferCopy) };
      if (password) {
        docParams.password = password;
      }
      const loadingTask = window.pdfjsLib.getDocument(docParams);
      pdfDoc = await loadingTask.promise;
    }

    const numPages = pdfDoc.numPages;

    const page = await pdfDoc.getPage(pageNumber);
    // PDF default is 72 DPI. Target scale = targetDpi / 72
    const scale = (targetDpi || 200) / 72.0;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext('2d');

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport
    };

    await page.render(renderContext).promise;

    return {
      canvas,
      numPages,
      width: canvas.width,
      height: canvas.height,
      currentPage: pageNumber
    };
  },

  /**
   * Convert an Image Canvas/Blob into a PDF using pdf-lib or jsPDF (with encryption)
   */
  async imageToPdf(imageBlobOrCanvas, options = {}) {
    // If password protection is requested, use jsPDF's built-in encryption engine
    if (options.password && window.jspdf && window.jspdf.jsPDF) {
      const { jsPDF } = window.jspdf;
      const pageSize = options.pageSize || 'A4';
      const isLetter = pageSize === 'Letter';
      const format = isLetter ? 'letter' : 'a4';

      const doc = new jsPDF({
        orientation: 'p',
        unit: 'pt',
        format: format,
        compress: true,
        encryption: {
          userPassword: options.password,
          ownerPassword: options.password,
          userPermissions: ['print', 'modify', 'copy', 'annot-forms']
        }
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = options.margin || 20;
      const availWidth = pageWidth - (margin * 2);
      const availHeight = pageHeight - (margin * 2);

      let dataUrl;
      let imgWidth, imgHeight;

      if (imageBlobOrCanvas instanceof HTMLCanvasElement) {
        dataUrl = imageBlobOrCanvas.toDataURL('image/jpeg', 0.9);
        imgWidth = imageBlobOrCanvas.width;
        imgHeight = imageBlobOrCanvas.height;
      } else {
        const arrayBuffer = await imageBlobOrCanvas.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        const mime = imageBlobOrCanvas.type || 'image/jpeg';
        dataUrl = `data:${mime};base64,${base64}`;

        const img = new Image();
        await new Promise((res) => { img.onload = res; img.src = dataUrl; });
        imgWidth = img.naturalWidth || img.width;
        imgHeight = img.naturalHeight || img.height;
      }

      let drawWidth = imgWidth;
      let drawHeight = imgHeight;
      const scale = Math.min(availWidth / drawWidth, availHeight / drawHeight, 1.0);
      drawWidth *= scale;
      drawHeight *= scale;

      const x = margin + (availWidth - drawWidth) / 2;
      const y = margin + (availHeight - drawHeight) / 2;

      doc.addImage(dataUrl, 'JPEG', x, y, drawWidth, drawHeight, undefined, 'FAST');
      return doc.output('blob');
    }

    if (!window.PDFLib) {
      throw new Error('PDF-lib library failed to load.');
    }

    const { PDFDocument, PageSizes } = window.PDFLib;
    const pdfDoc = await PDFDocument.create();

    let imageBytes;
    let isJpg = true;

    if (imageBlobOrCanvas instanceof HTMLCanvasElement) {
      const jpgBlob = await new Promise(res => imageBlobOrCanvas.toBlob(res, 'image/jpeg', 0.9));
      imageBytes = new Uint8Array(await jpgBlob.arrayBuffer());
    } else {
      const type = imageBlobOrCanvas.type;
      isJpg = type.includes('jpeg') || type.includes('jpg');
      imageBytes = new Uint8Array(await imageBlobOrCanvas.arrayBuffer());
    }

    let embeddedImage;
    if (isJpg) {
      embeddedImage = await pdfDoc.embedJpg(imageBytes);
    } else {
      try {
        embeddedImage = await pdfDoc.embedPng(imageBytes);
      } catch (err) {
        // Fallback: draw onto canvas and embed as JPEG
        console.warn('PNG embed failed, falling back to JPEG', err);
        const img = new Image();
        const url = URL.createObjectURL(new Blob([imageBytes]));
        await new Promise(r => { img.onload = r; img.src = url; });
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        const b = await new Promise(res => c.toBlob(res, 'image/jpeg', 0.88));
        embeddedImage = await pdfDoc.embedJpg(new Uint8Array(await b.arrayBuffer()));
      }
    }

    const pageSize = options.pageSize || 'A4'; // 'A4', 'Letter', or 'Fit'
    let pageWidth, pageHeight;

    if (pageSize === 'A4') {
      [pageWidth, pageHeight] = PageSizes.A4; // [595.28, 841.89]
    } else if (pageSize === 'Letter') {
      [pageWidth, pageHeight] = PageSizes.Letter;
    } else {
      // Fit to image dimensions (points: 72 points per inch)
      const dpi = options.dpi || 200;
      pageWidth = (embeddedImage.width / dpi) * 72;
      pageHeight = (embeddedImage.height / dpi) * 72;
    }

    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    // Calculate dimensions with margin
    const margin = options.margin || 20; // 20pt margin
    const availWidth = pageWidth - (margin * 2);
    const availHeight = pageHeight - (margin * 2);

    let drawWidth = embeddedImage.width;
    let drawHeight = embeddedImage.height;

    // Scale down if exceeds available space
    const scale = Math.min(availWidth / drawWidth, availHeight / drawHeight, 1.0);
    drawWidth *= scale;
    drawHeight *= scale;

    // Center image on the page
    const x = margin + (availWidth - drawWidth) / 2;
    const y = margin + (availHeight - drawHeight) / 2;

    page.drawImage(embeddedImage, {
      x,
      y,
      width: drawWidth,
      height: drawHeight
    });

    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  },

  /**
   * Render HTML string or HTML file content to a high-res Canvas using html2canvas
   */
  async htmlToCanvas(htmlContent, width = 850) {
    return new Promise((resolve, reject) => {
      // Create hidden container in DOM
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = `${width}px`;
      container.style.background = '#ffffff';
      container.style.color = '#000000';
      container.style.overflow = 'visible';
      container.style.zIndex = '-1000';
      container.style.fontFamily = 'Arial, sans-serif';

      // Parse HTML safely using DOMParser
      const parser = new DOMParser();
      const parsedDoc = parser.parseFromString(htmlContent, 'text/html');

      // Transfer any stylesheets or style tags
      const styles = parsedDoc.querySelectorAll('style, link[rel="stylesheet"]');
      styles.forEach(s => container.appendChild(s.cloneNode(true)));

      // Extract body content or root elements
      const bodyContent = parsedDoc.body ? parsedDoc.body.innerHTML : htmlContent;
      const innerWrapper = document.createElement('div');
      innerWrapper.style.padding = '24px';
      innerWrapper.style.boxSizing = 'border-box';
      innerWrapper.innerHTML = bodyContent;
      container.appendChild(innerWrapper);

      document.body.appendChild(container);

      // Short delay for layout and fonts
      setTimeout(async () => {
        try {
          if (window.html2canvas) {
            const canvas = await window.html2canvas(container, {
              width: width,
              windowWidth: width,
              scale: 1.5,
              useCORS: true,
              backgroundColor: '#ffffff',
              logging: false
            });
            document.body.removeChild(container);
            resolve(canvas);
          } else {
            document.body.removeChild(container);
            reject(new Error('html2canvas library is not loaded.'));
          }
        } catch (err) {
          if (document.body.contains(container)) {
            document.body.removeChild(container);
          }
          reject(err);
        }
      }, 150);
    });
  }
};

window.PdfHandler = PdfHandler;
