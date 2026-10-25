/**
 * DocFit - Visual Cropper Component
 * Provides clean, interactive cropping with aspect ratio locks and preview
 */

class DocFitCropper {
  constructor(containerEl, onCropChange) {
    this.container = containerEl;
    this.onCropChange = onCropChange;
    this.image = null;
    this.aspectRatio = null; // null = free, or number w/h
    this.cropBox = { x: 0, y: 0, width: 100, height: 100 };
    this.isDragging = false;
    this.isResizing = false;
    this.dragStart = { x: 0, y: 0 };
    this.resizeHandle = null;
    this.scaleX = 1;
    this.scaleY = 1;
  }

  setImage(imageElement) {
    this.image = imageElement;
    this.render();
  }

  setAspectRatio(ratioString) {
    if (!ratioString || ratioString === 'free' || ratioString === 'original') {
      this.aspectRatio = ratioString === 'original' && this.image ? (this.image.naturalWidth / this.image.naturalHeight) : null;
    } else {
      const parts = ratioString.split(':').map(Number);
      if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) {
        this.aspectRatio = parts[0] / parts[1];
      } else {
        this.aspectRatio = null;
      }
    }
    this.resetCropBoxToRatio();
  }

  resetCropBoxToRatio() {
    if (!this.image) return;
    const imgW = this.image.clientWidth;
    const imgH = this.image.clientHeight;

    if (!imgW || !imgH) return;

    let w = imgW * 0.8;
    let h = imgH * 0.8;

    if (this.aspectRatio) {
      if (w / this.aspectRatio <= imgH * 0.8) {
        h = w / this.aspectRatio;
      } else {
        w = h * this.aspectRatio;
      }
    }

    this.cropBox = {
      x: (imgW - w) / 2,
      y: (imgH - h) / 2,
      width: w,
      height: h
    };
    this.updateCropBoxDOM();
  }

  render() {
    this.container.innerHTML = `
      <div class="crop-stage" id="cropStage">
        <div class="crop-overlay"></div>
        <div class="crop-selection" id="cropSelection">
          <div class="crop-grid-lines">
            <div class="grid-line-h"></div>
            <div class="grid-line-h"></div>
            <div class="grid-line-v"></div>
            <div class="grid-line-v"></div>
          </div>
          <div class="crop-handle nw" data-handle="nw"></div>
          <div class="crop-handle ne" data-handle="ne"></div>
          <div class="crop-handle sw" data-handle="sw"></div>
          <div class="crop-handle se" data-handle="se"></div>
        </div>
      </div>
    `;

    const stage = this.container.querySelector('#cropStage');
    stage.prepend(this.image);

    this.image.onload = () => {
      this.resetCropBoxToRatio();
    };

    if (this.image.complete && this.image.naturalWidth) {
      setTimeout(() => this.resetCropBoxToRatio(), 50);
    }

    this.attachEvents();
  }

  attachEvents() {
    const stage = this.container.querySelector('#cropStage');
    const selection = this.container.querySelector('#cropSelection');

    const onPointerDown = (e) => {
      e.preventDefault();
      const target = e.target;
      const rect = stage.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      if (target.classList.contains('crop-handle')) {
        this.isResizing = true;
        this.resizeHandle = target.dataset.handle;
      } else if (target === selection || selection.contains(target)) {
        this.isDragging = true;
      } else {
        return;
      }

      this.dragStart = {
        x: clientX,
        y: clientY,
        boxX: this.cropBox.x,
        boxY: this.cropBox.y,
        boxW: this.cropBox.width,
        boxH: this.cropBox.height
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    };

    const onPointerMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const dx = clientX - this.dragStart.x;
      const dy = clientY - this.dragStart.y;

      const imgW = this.image.clientWidth;
      const imgH = this.image.clientHeight;

      if (this.isDragging) {
        let newX = this.dragStart.boxX + dx;
        let newY = this.dragStart.boxY + dy;

        newX = Math.max(0, Math.min(newX, imgW - this.cropBox.width));
        newY = Math.max(0, Math.min(newY, imgH - this.cropBox.height));

        this.cropBox.x = newX;
        this.cropBox.y = newY;
        this.updateCropBoxDOM();
      } else if (this.isResizing) {
        let newW = this.dragStart.boxW;
        let newH = this.dragStart.boxH;
        let newX = this.dragStart.boxX;
        let newY = this.dragStart.boxY;

        if (this.resizeHandle === 'se') {
          newW = Math.max(30, Math.min(this.dragStart.boxW + dx, imgW - newX));
          if (this.aspectRatio) {
            newH = newW / this.aspectRatio;
            if (newY + newH > imgH) {
              newH = imgH - newY;
              newW = newH * this.aspectRatio;
            }
          } else {
            newH = Math.max(30, Math.min(this.dragStart.boxH + dy, imgH - newY));
          }
        } else if (this.resizeHandle === 'sw') {
          const rawW = this.dragStart.boxW - dx;
          newW = Math.max(30, Math.min(rawW, this.dragStart.boxX + this.dragStart.boxW));
          newX = this.dragStart.boxX + (this.dragStart.boxW - newW);
          if (this.aspectRatio) {
            newH = newW / this.aspectRatio;
            if (newY + newH > imgH) {
              newH = imgH - newY;
              newW = newH * this.aspectRatio;
              newX = this.dragStart.boxX + (this.dragStart.boxW - newW);
            }
          } else {
            newH = Math.max(30, Math.min(this.dragStart.boxH + dy, imgH - newY));
          }
        }

        this.cropBox = { x: newX, y: newY, width: newW, height: newH };
        this.updateCropBoxDOM();
      }
    };

    const onPointerUp = () => {
      this.isDragging = false;
      this.isResizing = false;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      if (this.onCropChange) {
        this.onCropChange(this.getCropCoordinates());
      }
    };

    stage.addEventListener('pointerdown', onPointerDown);
  }

  updateCropBoxDOM() {
    const selection = this.container.querySelector('#cropSelection');
    if (!selection) return;
    selection.style.left = `${this.cropBox.x}px`;
    selection.style.top = `${this.cropBox.y}px`;
    selection.style.width = `${this.cropBox.width}px`;
    selection.style.height = `${this.cropBox.height}px`;
  }

  /**
   * Get crop coordinates relative to original natural image dimensions
   */
  getCropCoordinates() {
    if (!this.image || !this.image.naturalWidth) return null;
    const scaleX = this.image.naturalWidth / this.image.clientWidth;
    const scaleY = this.image.naturalHeight / this.image.clientHeight;

    return {
      x: Math.round(this.cropBox.x * scaleX),
      y: Math.round(this.cropBox.y * scaleY),
      width: Math.round(this.cropBox.width * scaleX),
      height: Math.round(this.cropBox.height * scaleY)
    };
  }

  /**
   * Produce a cropped canvas
   */
  getCroppedCanvas() {
    const coords = this.getCropCoordinates();
    if (!coords || !this.image) return null;

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, coords.width);
    canvas.height = Math.max(1, coords.height);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      this.image,
      coords.x, coords.y, coords.width, coords.height,
      0, 0, canvas.width, canvas.height
    );

    return canvas;
  }
}

window.DocFitCropper = DocFitCropper;
