# DocFit — Image, PDF & File Spec Optimizer (Browser Extension)

**DocFit** is a 100% offline, privacy-first browser extension designed to eliminate document upload rejections on government portals, job applications, exam registrations, and visa forms.

---

## 🌟 Key Features

- 🔒 **100% Offline & Private:** Zero server uploads. All processing (resizing, compression, DPI injection, password decryption, PDF conversion) runs strictly in your browser's local sandbox memory.
- 🎯 **Target File Size Range Engine:** Set Min and Max KB (e.g. *20–50 KB* or *under 200 KB*). In-memory binary search automatically tunes quality to land in that exact window with maximum visual clarity.
- 🖨️ **Exact DPI Injector:** Injects official physical print density metadata (72, 150, 200, 300 DPI) directly into JPEG JFIF headers and PNG pHYs chunks.
- 🔑 **Password-Protected PDF Support:** In-memory decryption for locked PDFs (e.g. e-Aadhaar, bank statements, payslips) with clean unlocked export or custom re-encryption.
- 📚 **Multi-Page "All Pages" Batch Export:** Extract all pages of a multi-page PDF into individually named high-res images (`Document_page_1.jpg`, `page_2.jpg`, etc.) with 1-click **Download as ZIP** or sequential downloads.
- 📐 **Flexible Resizing:** 
  - **Percentage:** (25%, 50%, 75%, 100%, 150%, custom slider).
  - **Exact Dimensions:** Millimeters (`mm`), Centimeters (`cm`), Inches (`in`), or Pixels (`px`) with auto DPI-to-pixel math.
  - **Aspect Ratio Lock:** Prevents unnatural stretching or distortion.
- ✂️ **Visual Cropper:** Interactive cropping tool with presets for Passport (3.5:4.5), Square/Visa (1:1), Signature (7:3), and custom.
- 🔄 **Multi-Format Conversions:**
  - **Image ➔ Image:** Convert between JPG, PNG, WEBP with exact size/DPI.
  - **Image ➔ PDF:** Embed photos/scans into clean A4 or Letter PDFs.
  - **PDF ➔ Image:** Extract single pages, all pages, or custom page ranges (e.g. `1-3`, `1-3, 6, 7-10`) into crisp 200/300 DPI JPGs, PNGs, or ZIP bundles.
  - **HTML ➔ PDF / Image:** Render and capture web/markup files.
- 📋 **Clipboard Paste:** Press `Ctrl + V` anywhere to instantly load an image from your clipboard.
- ⚡ **Dual View (Side Panel + Popup):** Pin it as a Chrome Side Panel next to the portal you are filling out, or use it as a popup.

---

## ⚡ How to Install in Chrome, Brave, or Edge

1. Download or clone this repository.
2. Open your browser and navigate to:
   - **Chrome / Brave:** `chrome://extensions`
   - **Edge:** `edge://extensions`
3. Turn **ON** **Developer mode** (toggle switch in the top right corner).
4. Click the **Load unpacked** button in the top left.
5. Select the `docfit` folder.
6. Click the puzzle icon in your browser toolbar and pin **DocFit** for instant 1-click access!

---

## 👨‍💻 Author & Connect

- **Developer:** [Axat (@axat-xd)](https://github.com/axat-xd)
- **Instagram:** [@axat.xd](https://www.instagram.com/axat.xd/)

---

## 📄 License
MIT License — Feel free to use, share, and build upon this project!
