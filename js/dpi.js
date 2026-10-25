/**
 * DocFit - DPI Handler Module
 * Reads and injects physical resolution (DPI) metadata into JPEG and PNG binaries.
 * 100% client-side, zero dependencies.
 */

const DpiHandler = {
  /**
   * Calculate CRC32 checksum for PNG chunks
   */
  crc32Table: null,
  getCrcTable() {
    if (this.crc32Table) return this.crc32Table;
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c;
    }
    this.crc32Table = table;
    return table;
  },

  crc32(buf, offset, length) {
    const table = this.getCrcTable();
    let crc = 0xffffffff;
    for (let i = 0; i < length; i++) {
      crc = table[(crc ^ buf[offset + i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  },

  /**
   * Detect current DPI of an image ArrayBuffer
   */
  detectDpi(arrayBuffer, mimeType) {
    const view = new DataView(arrayBuffer);
    const bytes = new Uint8Array(arrayBuffer);

    // JPEG
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
      if (bytes[0] === 0xff && bytes[1] === 0xd8) {
        let offset = 2;
        while (offset < bytes.length) {
          if (bytes[offset] !== 0xff) break;
          const marker = bytes[offset + 1];
          if (marker === 0xda || marker === 0xd9) break; // SOS or EOI
          const length = view.getUint16(offset + 2);
          if (marker === 0xe0) { // APP0 JFIF
            const id = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
            if (id === 'JFIF') {
              const units = bytes[offset + 11];
              const xDensity = view.getUint16(offset + 12);
              const yDensity = view.getUint16(offset + 14);
              if (units === 1) return xDensity; // DPI
              if (units === 2) return Math.round(xDensity * 2.54); // Dots per cm to DPI
            }
          }
          offset += 2 + length;
        }
      }
    }

    // PNG
    if (mimeType.includes('png')) {
      if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
        let offset = 8;
        while (offset < bytes.length) {
          const length = view.getUint32(offset);
          const type = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
          if (type === 'pHYs') {
            const ppuX = view.getUint32(offset + 8);
            const unit = bytes[offset + 16];
            if (unit === 1) { // Meters
              return Math.round(ppuX * 0.0254);
            }
          }
          if (type === 'IDAT') break;
          offset += 12 + length;
        }
      }
    }

    return 72; // Default screen density
  },

  /**
   * Injects JFIF APP0 header into JPEG Blob with target DPI
   */
  async setJpegDpi(blob, dpi) {
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const view = new DataView(arrayBuffer);

    // Validate SOI
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8) {
      return blob; // Not a valid JPEG, return unmodified
    }

    const xDensity = Math.round(dpi);
    const yDensity = Math.round(dpi);

    // Check if JFIF APP0 segment exists
    let offset = 2;
    let jfifOffset = -1;

    while (offset < bytes.length - 4) {
      if (bytes[offset] !== 0xff) break;
      const marker = bytes[offset + 1];
      if (marker === 0xda || marker === 0xd9) break;

      const length = view.getUint16(offset + 2);
      if (marker === 0xe0) {
        const id = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
        if (id === 'JFIF') {
          jfifOffset = offset;
          break;
        }
      }
      offset += 2 + length;
    }

    if (jfifOffset !== -1) {
      // JFIF segment already exists: modify density in-place
      const modifiedBytes = new Uint8Array(bytes);
      const modView = new DataView(modifiedBytes.buffer);
      modifiedBytes[jfifOffset + 11] = 1; // Units = 1 (dots per inch)
      modView.setUint16(jfifOffset + 12, xDensity, false);
      modView.setUint16(jfifOffset + 14, yDensity, false);
      return new Blob([modifiedBytes], { type: 'image/jpeg' });
    } else {
      // Insert 18-byte JFIF APP0 segment right after SOI marker (bytes 0, 1)
      const jfifSegment = new Uint8Array(18);
      const jView = new DataView(jfifSegment.buffer);

      jfifSegment[0] = 0xff;
      jfifSegment[1] = 0xe0; // APP0
      jView.setUint16(2, 16, false); // Length = 16
      jfifSegment[4] = 0x4a; // 'J'
      jfifSegment[5] = 0x46; // 'F'
      jfifSegment[6] = 0x49; // 'I'
      jfifSegment[7] = 0x46; // 'F'
      jfifSegment[8] = 0x00; // '\0'
      jfifSegment[9] = 0x01; // Version major 1
      jfifSegment[10] = 0x02; // Version minor 2
      jfifSegment[11] = 0x01; // Units = 1 (dots per inch)
      jView.setUint16(12, xDensity, false); // X density
      jView.setUint16(14, yDensity, false); // Y density
      jfifSegment[16] = 0x00; // Thumbnail X
      jfifSegment[17] = 0x00; // Thumbnail Y

      const newBuffer = new Uint8Array(bytes.length + 18);
      newBuffer.set(bytes.subarray(0, 2), 0); // SOI
      newBuffer.set(jfifSegment, 2); // JFIF header
      newBuffer.set(bytes.subarray(2), 20); // Rest of file

      return new Blob([newBuffer], { type: 'image/jpeg' });
    }
  },

  /**
   * Injects pHYs chunk into PNG Blob with target DPI
   */
  async setPngDpi(blob, dpi) {
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const view = new DataView(arrayBuffer);

    // Validate PNG signature
    if (bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4e || bytes[3] !== 0x47) {
      return blob;
    }

    const ppm = Math.round(dpi / 0.0254); // Pixels per meter

    // Construct 21-byte pHYs chunk (4 len + 4 type + 9 data + 4 crc)
    const physChunk = new Uint8Array(21);
    const pView = new DataView(physChunk.buffer);
    pView.setUint32(0, 9, false); // Length: 9 bytes
    physChunk[4] = 0x70; // 'p'
    physChunk[5] = 0x48; // 'H'
    physChunk[6] = 0x79; // 'y'
    physChunk[7] = 0x73; // 's'
    pView.setUint32(8, ppm, false); // ppuX
    pView.setUint32(12, ppm, false); // ppuY
    physChunk[16] = 1; // Unit: meter

    const crc = this.crc32(physChunk, 4, 13);
    pView.setUint32(17, crc, false);

    // Locate existing pHYs or first IDAT chunk
    let offset = 8;
    let physOffset = -1;
    let physLength = 0;
    let idatOffset = -1;

    while (offset < bytes.length) {
      const length = view.getUint32(offset);
      const type = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));

      if (type === 'pHYs') {
        physOffset = offset;
        physLength = 12 + length;
        break;
      }
      if (type === 'IDAT') {
        idatOffset = offset;
        break;
      }
      offset += 12 + length;
    }

    if (physOffset !== -1) {
      // Replace existing pHYs chunk
      const newBuffer = new Uint8Array(bytes.length - physLength + 21);
      newBuffer.set(bytes.subarray(0, physOffset), 0);
      newBuffer.set(physChunk, physOffset);
      newBuffer.set(bytes.subarray(physOffset + physLength), physOffset + 21);
      return new Blob([newBuffer], { type: 'image/png' });
    } else if (idatOffset !== -1) {
      // Insert pHYs chunk right before IDAT
      const newBuffer = new Uint8Array(bytes.length + 21);
      newBuffer.set(bytes.subarray(0, idatOffset), 0);
      newBuffer.set(physChunk, idatOffset);
      newBuffer.set(bytes.subarray(idatOffset), idatOffset + 21);
      return new Blob([newBuffer], { type: 'image/png' });
    }

    return blob;
  },

  /**
   * Apply DPI to any supported blob
   */
  async applyDpi(blob, dpi, mimeType) {
    if (!dpi || dpi <= 0) return blob;
    if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
      return await this.setJpegDpi(blob, dpi);
    }
    if (mimeType === 'image/png') {
      return await this.setPngDpi(blob, dpi);
    }
    return blob;
  }
};

window.DpiHandler = DpiHandler;
