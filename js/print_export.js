/**
 * Print & Export Module
 * Handles 300 DPI single image downloads, multi-copy printable sheet generation,
 * vector-accurate PDF export via jsPDF, and browser direct print.
 */

class PrintExportManager {
  constructor() {
    this.SHEET_PRESETS = {
      // 4x6 inch (4R) Presets (102mm x 152mm)
      '4r_4_passport': {
        name: '4x6" Photo Paper — 4 Passport Copies (৪ কপি পাসপোর্ট)',
        pageSize: [102, 152], // [width, height] in mm
        orientation: 'portrait',
        items: [
          { type: 'passport_bd', count: 4, cols: 2, rows: 2, startX: 12, startY: 20, gapX: 8, gapY: 10 },
        ],
      },
      '4r_8_stamp': {
        name: '4x6" Photo Paper — 8 Stamp Copies (৮ কপি স্ট্যাম্প)',
        pageSize: [102, 152],
        orientation: 'portrait',
        items: [
          { type: 'stamp', count: 8, cols: 4, rows: 2, startX: 7, startY: 35, gapX: 4, gapY: 10 },
        ],
      },
      // A4 Paper Presets (210mm x 297mm)
      'a4_8_passport': {
        name: 'A4 Paper — 8 Passport Copies (৮ কপি পাসপোর্ট)',
        pageSize: [210, 297],
        orientation: 'portrait',
        items: [
          { type: 'passport_bd', count: 8, cols: 4, rows: 2, startX: 19, startY: 25, gapX: 8, gapY: 10 },
        ],
      },
      'a4_12_passport': {
        name: 'A4 Paper — 12 Passport Copies (১২ কপি পাসপোর্ট)',
        pageSize: [210, 297],
        orientation: 'portrait',
        items: [
          { type: 'passport_bd', count: 12, cols: 4, rows: 3, startX: 19, startY: 20, gapX: 8, gapY: 10 },
        ],
      },
      'a4_16_stamp': {
        name: 'A4 Paper — 16 Stamp Copies (১৬ কপি স্ট্যাম্প)',
        pageSize: [210, 297],
        orientation: 'portrait',
        items: [
          { type: 'stamp', count: 16, cols: 6, rows: 4, startX: 25, startY: 25, gapX: 6, gapY: 8 },
        ],
      },
      'a4_combo': {
        name: 'A4 Paper — Combo Pack (4 Passport + 6 Stamp Copies)',
        pageSize: [210, 297],
        orientation: 'portrait',
        items: [
          { type: 'passport_bd', count: 4, cols: 4, rows: 1, startX: 19, startY: 25, gapX: 8, gapY: 10 },
          { type: 'stamp', count: 6, cols: 6, rows: 1, startX: 19, startY: 85, gapX: 7, gapY: 8 },
        ],
      },
    };
  }

  /**
   * Download a single photo canvas as JPG or PNG
   * @param {HTMLCanvasElement} canvas
   * @param {string} format - 'jpg' | 'png'
   * @param {string} filename
   */
  downloadSingle(canvas, format = 'jpg', filename = 'passport_photo') {
    const mime = format === 'png' ? 'image/png' : 'image/jpeg';
    const quality = format === 'png' ? undefined : 0.95;
    const dataUrl = canvas.toDataURL(mime, quality);

    const link = document.createElement('a');
    link.download = `${filename}_300dpi.${format}`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Generate high-res print sheet canvas
   * @param {HTMLCanvasElement} passportCanvas
   * @param {HTMLCanvasElement} stampCanvas
   * @param {string} layoutKey
   * @param {boolean} showCutMarks
   * @returns {HTMLCanvasElement}
   */
  generateSheetCanvas(passportCanvas, stampCanvas, layoutKey = '4r_4_passport', showCutMarks = true) {
    const preset = this.SHEET_PRESETS[layoutKey] || this.SHEET_PRESETS['4r_4_passport'];
    const [pageWMm, pageHMm] = preset.pageSize;

    // Convert mm to 300 DPI pixels (1 inch = 25.4mm, 300 DPI = 11.811 pixels per mm)
    const scale = 300 / 25.4;
    const sheetCanvas = document.createElement('canvas');
    sheetCanvas.width = Math.round(pageWMm * scale);
    sheetCanvas.height = Math.round(pageHMm * scale);
    const ctx = sheetCanvas.getContext('2d');

    // Clean white paper background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, sheetCanvas.width, sheetCanvas.height);

    for (const group of preset.items) {
      const isStamp = group.type === 'stamp';
      const sourceCanvas = isStamp ? stampCanvas : passportCanvas;
      if (!sourceCanvas) continue;

      const photoWMm = isStamp ? 20 : 35;
      const photoHMm = isStamp ? 25 : 45;

      const photoWPix = photoWMm * scale;
      const photoHPix = photoHMm * scale;

      let index = 0;
      for (let r = 0; r < group.rows; r++) {
        for (let c = 0; c < group.cols; c++) {
          if (index >= group.count) break;

          const xMm = group.startX + c * (photoWMm + group.gapX);
          const yMm = group.startY + r * (photoHMm + group.gapY);

          const xPix = Math.round(xMm * scale);
          const yPix = Math.round(yMm * scale);

          // Draw the photo
          ctx.drawImage(sourceCanvas, 0, 0, sourceCanvas.width, sourceCanvas.height, xPix, yPix, photoWPix, photoHPix);

          // Draw cutting guide line if enabled
          if (showCutMarks) {
            ctx.strokeStyle = '#cccccc';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(xPix, yPix, photoWPix, photoHPix);
            ctx.setLineDash([]);
          }

          index++;
        }
      }
    }

    return sheetCanvas;
  }

  /**
   * Export vector-precise PDF sheet using jsPDF
   * @param {HTMLCanvasElement} passportCanvas
   * @param {HTMLCanvasElement} stampCanvas
   * @param {string} layoutKey
   * @param {boolean} showCutMarks
   */
  async exportPDF(passportCanvas, stampCanvas, layoutKey = '4r_4_passport', showCutMarks = true) {
    if (typeof jspdf === 'undefined' || !jspdf.jsPDF) {
      alert('jsPDF library is still loading. Please try again in a few seconds.');
      return;
    }

    const preset = this.SHEET_PRESETS[layoutKey] || this.SHEET_PRESETS['4r_4_passport'];
    const [pageWMm, pageHMm] = preset.pageSize;

    const doc = new jspdf.jsPDF({
      orientation: preset.orientation,
      unit: 'mm',
      format: [pageWMm, pageHMm],
    });

    const passportDataUrl = passportCanvas.toDataURL('image/jpeg', 0.96);
    const stampDataUrl = stampCanvas ? stampCanvas.toDataURL('image/jpeg', 0.96) : passportDataUrl;

    for (const group of preset.items) {
      const isStamp = group.type === 'stamp';
      const imgData = isStamp ? stampDataUrl : passportDataUrl;
      const photoWMm = isStamp ? 20 : 35;
      const photoHMm = isStamp ? 25 : 45;

      let index = 0;
      for (let r = 0; r < group.rows; r++) {
        for (let c = 0; c < group.cols; c++) {
          if (index >= group.count) break;

          const x = group.startX + c * (photoWMm + group.gapX);
          const y = group.startY + r * (photoHMm + group.gapY);

          doc.addImage(imgData, 'JPEG', x, y, photoWMm, photoHMm, undefined, 'FAST');

          if (showCutMarks) {
            doc.setDrawColor(200, 200, 200);
            doc.setLineDashPattern([1, 1], 0);
            doc.setLineWidth(0.15);
            doc.rect(x, y, photoWMm, photoHMm);
            doc.setLineDashPattern([], 0);
          }

          index++;
        }
      }
    }

    doc.save(`Passport_Photos_${layoutKey}.pdf`);
  }

  /**
   * Render printable sheet inside DOM and trigger window.print()
   * @param {HTMLCanvasElement} passportCanvas
   * @param {HTMLCanvasElement} stampCanvas
   * @param {string} layoutKey
   * @param {boolean} showCutMarks
   */
  triggerDirectPrint(passportCanvas, stampCanvas, layoutKey = '4r_4_passport', showCutMarks = true) {
    const sheetCanvas = this.generateSheetCanvas(passportCanvas, stampCanvas, layoutKey, showCutMarks);
    const container = document.getElementById('print-sheet-container');
    if (!container) return;

    container.innerHTML = '';
    const img = document.createElement('img');
    img.src = sheetCanvas.toDataURL('image/jpeg', 0.95);
    img.style.width = '100%';
    img.style.height = 'auto';
    img.style.display = 'block';

    container.appendChild(img);

    // Wait for image to load into DOM then print
    setTimeout(() => {
      window.print();
    }, 150);
  }
}

// Global instance
window.printExportManager = new PrintExportManager();
