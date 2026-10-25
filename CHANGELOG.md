# Changelog — DocFit

All notable changes to **DocFit** are documented here.

The versioning format follows:
- **Major change (Left number):** `1.0` ➔ `2.0`
- **Minor change (Right number):** `1.0` ➔ `1.1` ➔ `1.2`

---

## [1.0] - 2026-10-25
### Initial Official Release
- **100% Offline & Private:** Client-side in-memory processing. Zero external server uploads.
- **Target File Size Range Engine:** In-memory binary search optimization to hit exact min/max KB ranges (e.g. 20–50 KB, < 200 KB) with optimum clarity.
- **DPI Metadata Injector:** Official physical print density injection (72, 150, 200, 300 DPI) for JPEG (JFIF header) and PNG (pHYs chunk).
- **Password-Protected PDF Support:** In-memory local decryption for locked PDFs (e.g., e-Aadhaar, bank statements, payslips) with show/hide password toggle.
- **Configurable PDF Output Protection:** 3-way security selection when generating PDFs:
  - 🔓 **No Password (Unlocked):** Default clean export for portal uploads.
  - 🔒 **Keep Same Password:** Re-encrypts with original input password.
  - 🔑 **Set New Password:** Custom password encryption via bundled `jsPDF`.
- **Multi-Page "All Pages" Batch Export:** Extract all pages of multi-page PDFs to high-res images with clean naming (`[Name]_page_1.jpg`, `[Name]_page_2.jpg`, etc.).
- **Dual Batch Download Options:**
  - 📦 **Download All as ZIP:** One-click bundled `.zip` archive via bundled `JSZip`.
  - 📂 **Download Individual Files:** Sequential direct image downloads.
- **Dimension Controls & Resizing:** Percentage scaling (100% preserves original aspect ratio), exact dimensions (`cm`, `mm`, `in`, `px`), and aspect ratio locking.
- **Interactive Visual Cropper:** Built-in cropping tool with aspect presets for Passport (3.5:4.5), Visa (1:1), Signature (7:3), and custom framing.
- **Multi-Format Conversion Matrix:** Supports JPG, PNG, WEBP, PDF, HTML, and SVG inputs and outputs.
- **Smart Portal Presets:** Quick 1-click profiles for Passport Photos, Digital Signatures, Govt IDs, and Marksheet scans.
- **Dual View Support:** Works both as a pinned Chrome Side Panel and as a Toolbar Popup.

---

### Author & Connect
- **Developer:** [Axat (@axat-xd)](https://github.com/axat-xd)
- **Instagram:** [axat.xd](https://www.instagram.com/axat.xd/)
