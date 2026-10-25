/**
 * DocFit - Presets Definitions
 * Common government, visa, exam, and web portal specifications
 */

const DocFitPresets = [
  {
    id: 'passport',
    name: 'Passport Photo',
    icon: '📸',
    badge: 'Govt Standard',
    description: '3.5 × 4.5 cm (or ~413 × 531 px), 20–50 KB, 300 DPI, JPEG',
    format: 'image/jpeg',
    resizeMode: 'exact',
    width: 3.5,
    height: 4.5,
    unit: 'cm',
    aspectRatio: '3.5:4.5',
    dpi: 300,
    minKb: 20,
    maxKb: 50,
    lockAspect: true
  },
  {
    id: 'signature',
    name: 'Digital Signature',
    icon: '✍️',
    badge: '10–20 KB',
    description: '140 × 60 px, 10–20 KB, 200 DPI, JPEG',
    format: 'image/jpeg',
    resizeMode: 'exact',
    width: 140,
    height: 60,
    unit: 'px',
    aspectRatio: '7:3',
    dpi: 200,
    minKb: 10,
    maxKb: 20,
    lockAspect: false
  },
  {
    id: 'govt_doc_pdf',
    name: 'ID / Certificate to PDF',
    icon: '🪪',
    badge: 'A4 < 200 KB',
    description: 'A4 page document, compressed under 200 KB, PDF',
    format: 'application/pdf',
    resizeMode: 'aspect',
    width: 21,
    height: 29.7,
    unit: 'cm',
    aspectRatio: '1:1.414',
    dpi: 200,
    minKb: 50,
    maxKb: 200,
    lockAspect: true
  },
  {
    id: 'marksheet_pdf',
    name: 'Marksheet / Degree Scan',
    icon: '📜',
    badge: '< 500 KB',
    description: 'High-clarity scan, under 500 KB, PDF',
    format: 'application/pdf',
    resizeMode: 'aspect',
    width: 21,
    height: 29.7,
    unit: 'cm',
    aspectRatio: '1:1.414',
    dpi: 250,
    minKb: 100,
    maxKb: 500,
    lockAspect: true
  },
  {
    id: 'web_ready',
    name: 'Web / Fast Load',
    icon: '⚡',
    badge: 'Modern WebP',
    description: 'Max 1200px, 85% quality, WebP, under 100 KB',
    format: 'image/webp',
    resizeMode: 'percentage',
    percentage: 100,
    aspectRatio: 'original',
    dpi: 72,
    minKb: 0,
    maxKb: 100,
    lockAspect: true
  },
  {
    id: 'custom',
    name: 'Custom Specs',
    icon: '⚙️',
    badge: 'Manual',
    description: 'Full manual control over dimensions, DPI, and file size range',
    format: 'image/jpeg',
    resizeMode: 'percentage',
    percentage: 100,
    aspectRatio: 'original',
    dpi: 300,
    minKb: 0,
    maxKb: 0,
    lockAspect: true
  }
];

window.DocFitPresets = DocFitPresets;
