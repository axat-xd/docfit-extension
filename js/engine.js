/**
 * DocFit - Core Optimization Engine
 * Handles dimension conversions, high-quality resampling, binary-search target KB optimization,
 * and DPI header injection.
 */

const DocFitEngine = {
  /**
   * Convert physical unit to pixels based on DPI
   */
  unitToPixels(value, unit, dpi = 300) {
    const val = parseFloat(value);
    if (isNaN(val) || val <= 0) return 0;

    switch (unit) {
      case 'px':
        return Math.round(val);
      case 'in':
        return Math.round(val * dpi);
      case 'cm':
        return Math.round((val / 2.54) * dpi);
      case 'mm':
        return Math.round((val / 25.4) * dpi);
      default:
        return Math.round(val);
    }
  },

  /**
   * Convert pixels to physical unit
   */
  pixelsToUnit(px, unit, dpi = 300) {
    if (!px || px <= 0) return 0;
    switch (unit) {
      case 'px':
        return Math.round(px);
      case 'in':
        return Number((px / dpi).toFixed(2));
      case 'cm':
        return Number(((px / dpi) * 2.54).toFixed(2));
      case 'mm':
        return Number(((px / dpi) * 25.4).toFixed(1));
      default:
        return px;
    }
  },

  /**
   * Draw source canvas/image to a target canvas with specified dimensions
   */
  resizeCanvas(source, targetWidth, targetHeight) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(targetWidth));
    canvas.height = Math.max(1, Math.round(targetHeight));

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // White background for transparent PNG to JPEG conversion
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    return canvas;
  },

  /**
   * Compress canvas to blob at a specific quality
   */
  async exportBlob(canvas, mimeType, quality) {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, mimeType, quality);
    });
  },

  /**
   * Binary Search to achieve exact target file size in KB
   */
  async optimizeToTargetSize(canvas, mimeType, minKb = 0, maxKb = 0, dpi = 300, onProgress = null) {
    const minBytes = (minKb || 0) * 1024;
    const maxBytes = (maxKb || 0) * 1024;

    // For PNG (lossless), quality parameter is ignored by canvas.toBlob
    if (mimeType === 'image/png') {
      let blob = await this.exportBlob(canvas, mimeType, 1.0);
      blob = await DpiHandler.applyDpi(blob, dpi, mimeType);

      // If PNG is larger than maxBytes, downsample canvas dimensions if maxKb is set
      if (maxBytes > 0 && blob.size > maxBytes) {
        let currentCanvas = canvas;
        let scale = 0.9;
        while (blob.size > maxBytes && scale >= 0.25) {
          const w = Math.round(canvas.width * scale);
          const h = Math.round(canvas.height * scale);
          currentCanvas = this.resizeCanvas(canvas, w, h);
          blob = await this.exportBlob(currentCanvas, mimeType, 1.0);
          blob = await DpiHandler.applyDpi(blob, dpi, mimeType);
          scale -= 0.1;
        }
        return { blob, canvas: currentCanvas, quality: 1.0, downscaled: scale < 0.9 };
      }
      return { blob, canvas, quality: 1.0, downscaled: false };
    }

    // For JPEG and WebP: perform binary search on quality
    let lowQ = 0.05;
    let highQ = 0.98;
    let bestBlob = null;
    let bestDiff = Infinity;
    let bestQuality = 0.85;
    let currentCanvas = canvas;
    let downscaled = false;

    // If no limits specified, export at standard high quality (0.90)
    if (minBytes <= 0 && maxBytes <= 0) {
      let blob = await this.exportBlob(canvas, mimeType, 0.90);
      blob = await DpiHandler.applyDpi(blob, dpi, mimeType);
      return { blob, canvas, quality: 0.90, downscaled: false };
    }

    // Binary search loop (up to 9 iterations gives precision < 0.002)
    for (let i = 0; i < 9; i++) {
      const midQ = (lowQ + highQ) / 2;
      let rawBlob = await this.exportBlob(currentCanvas, mimeType, midQ);
      let blob = await DpiHandler.applyDpi(rawBlob, dpi, mimeType);
      const size = blob.size;

      if (onProgress) {
        onProgress(`Calibrating size... ${Math.round(size / 1024)} KB (Attempt ${i + 1})`);
      }

      // Check if size fits strictly in range
      const inRange = (minBytes <= 0 || size >= minBytes) && (maxBytes <= 0 || size <= maxBytes);

      if (inRange) {
        bestBlob = blob;
        bestQuality = midQ;
        // Try pushing for higher quality without exceeding maxBytes
        if (maxBytes > 0 && size < maxBytes * 0.92) {
          lowQ = midQ;
        } else {
          break;
        }
      } else if (maxBytes > 0 && size > maxBytes) {
        highQ = midQ;
      } else if (minBytes > 0 && size < minBytes) {
        lowQ = midQ;
      }

      // Track closest candidate
      const targetMid = maxBytes > 0 ? (minBytes > 0 ? (minBytes + maxBytes) / 2 : maxBytes * 0.9) : minBytes;
      const diff = Math.abs(size - targetMid);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestBlob = blob;
        bestQuality = midQ;
      }
    }

    // If still larger than maxBytes at lowest quality, auto-downscale dimensions
    if (maxBytes > 0 && bestBlob && bestBlob.size > maxBytes) {
      if (onProgress) onProgress('Auto-downscaling dimensions to satisfy max KB limit...');
      let scale = 0.85;
      while (bestBlob.size > maxBytes && scale >= 0.2) {
        const w = Math.round(canvas.width * scale);
        const h = Math.round(canvas.height * scale);
        currentCanvas = this.resizeCanvas(canvas, w, h);
        let rawBlob = await this.exportBlob(currentCanvas, mimeType, 0.45);
        bestBlob = await DpiHandler.applyDpi(rawBlob, dpi, mimeType);
        downscaled = true;
        scale -= 0.15;
      }
    }

    return {
      blob: bestBlob,
      canvas: currentCanvas,
      quality: bestQuality,
      downscaled
    };
  },

  /**
   * Main Process Execution
   */
  async process(sourceElement, options = {}, onProgress = null) {
    const startTime = performance.now();
    const {
      outputFormat = 'image/jpeg',
      resizeMode = 'percentage',
      percentage = 100,
      exactWidth = 0,
      exactHeight = 0,
      unit = 'px',
      lockAspect = true,
      cropCoords = null,
      dpi = 300,
      minKb = 0,
      maxKb = 0,
      pdfPageSize = 'A4',
      outputPdfPassword = ''
    } = options;

    if (onProgress) onProgress('Preparing image...');

    // 1. Determine base canvas (cropped or full)
    let baseCanvas;
    if (cropCoords) {
      baseCanvas = document.createElement('canvas');
      baseCanvas.width = cropCoords.width;
      baseCanvas.height = cropCoords.height;
      const ctx = baseCanvas.getContext('2d');
      ctx.drawImage(
        sourceElement,
        cropCoords.x, cropCoords.y, cropCoords.width, cropCoords.height,
        0, 0, cropCoords.width, cropCoords.height
      );
    } else if (sourceElement instanceof HTMLCanvasElement) {
      baseCanvas = sourceElement;
    } else {
      baseCanvas = document.createElement('canvas');
      baseCanvas.width = sourceElement.naturalWidth || sourceElement.width;
      baseCanvas.height = sourceElement.naturalHeight || sourceElement.height;
      baseCanvas.getContext('2d').drawImage(sourceElement, 0, 0);
    }

    const origW = baseCanvas.width;
    const origH = baseCanvas.height;

    // 2. Compute target dimensions
    let finalW = origW;
    let finalH = origH;

    if (resizeMode === 'percentage') {
      const scale = Math.max(0.05, (percentage || 100) / 100);
      finalW = Math.round(origW * scale);
      finalH = Math.round(origH * scale);
    } else if (resizeMode === 'exact') {
      const pxW = this.unitToPixels(exactWidth, unit, dpi);
      const pxH = this.unitToPixels(exactHeight, unit, dpi);

      if (pxW > 0 && pxH > 0) {
        finalW = pxW;
        finalH = pxH;
      } else if (pxW > 0) {
        finalW = pxW;
        finalH = lockAspect ? Math.round(pxW * (origH / origW)) : origH;
      } else if (pxH > 0) {
        finalH = pxH;
        finalW = lockAspect ? Math.round(pxH * (origW / origH)) : origW;
      }
    }

    if (onProgress) onProgress(`Resampling to ${finalW} × ${finalH} px...`);
    const resampledCanvas = this.resizeCanvas(baseCanvas, finalW, finalH);

    // 3. Output as PDF or Image
    let finalBlob;
    let finalCanvas = resampledCanvas;
    let autoDownscaled = false;

    if (outputFormat === 'application/pdf') {
      if (onProgress) onProgress('Generating PDF document...');
      // Convert canvas to image blob first, respecting min/max KB
      const imgRes = await this.optimizeToTargetSize(
        resampledCanvas,
        'image/jpeg',
        minKb ? Math.round(minKb * 0.8) : 0,
        maxKb ? Math.round(maxKb * 0.9) : 0,
        dpi,
        onProgress
      );
      finalBlob = await PdfHandler.imageToPdf(imgRes.blob, {
        pageSize: pdfPageSize,
        dpi: dpi,
        margin: 20,
        password: outputPdfPassword
      });
      autoDownscaled = imgRes.downscaled;
    } else {
      const optResult = await this.optimizeToTargetSize(
        resampledCanvas,
        outputFormat,
        minKb,
        maxKb,
        dpi,
        onProgress
      );
      finalBlob = optResult.blob;
      finalCanvas = optResult.canvas;
      autoDownscaled = optResult.downscaled;
    }

    const duration = ((performance.now() - startTime) / 1000).toFixed(2);
    const sizeKb = Number((finalBlob.size / 1024).toFixed(1));

    const minTarget = minKb || 0;
    const maxTarget = maxKb || 0;
    const isWithinRange = (minTarget <= 0 || sizeKb >= minTarget) && (maxTarget <= 0 || sizeKb <= maxTarget);

    return {
      blob: finalBlob,
      sizeKb,
      width: finalCanvas.width,
      height: finalCanvas.height,
      dpi,
      format: outputFormat,
      duration,
      isWithinRange,
      autoDownscaled,
      isPasswordProtected: Boolean(outputPdfPassword)
    };
  }
};

window.DocFitEngine = DocFitEngine;
