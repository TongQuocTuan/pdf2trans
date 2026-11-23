/* ==========================================================================
   PDF Viewer Module (Mozilla PDF.js Integration)
   v1-fixed:
   - Gom doan theo toa do Y + co chu (ban cu tach theo dau cau / hasEOL -> vo cau)
   - Render queue: bam Prev/Next nhanh khong race
   - Chi render view dang mo (ban cu render ca 2 view moi lan)
   - Zoom mac dinh 100% (scale 1.0, ban cu 1.25 nhung ghi 100%), canvas nhan DPR
   - goToPage cap nhat o so trang; bao loi PDF co mat khau rieng
   ========================================================================== */

// Configure Worker
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

class PDFViewerController {
  constructor() {
    this.pdfDoc = null;
    this.fileId = null;   // pdf.js fingerprint, dung lam khoa luu ban dich
    this.fileName = '';
    this.currentPage = 1;
    this.totalPages = 0;
    this.scale = 1.0;     // 100% that, khong phai 1.25 nhu ban cu
    this.activeView = 'select'; // 'select' | 'bilingual'
    this.container = document.getElementById('pdfViewer');
    this.bilingualContainer = document.getElementById('bilingualPdfViewer');
    this.onPageChangeCallback = null;
    // Render queue
    this._rendering = false;
    this._renderPending = false;
    this._renderToken = 0;
  }

  setActiveView(mode) {
    this.activeView = mode === 'bilingual' ? 'bilingual' : 'select';
  }

  updateZoomLabel() {
    const el = document.getElementById('zoomLevel');
    if (el) el.textContent = `${Math.round(this.scale * 100)}%`;
  }

  /**
   * Load PDF from ArrayBuffer or File
   */
  async loadDocument(dataBuffer, fileName = '') {
    try {
      const loadingTask = pdfjsLib.getDocument({ data: dataBuffer });
      this.pdfDoc = await loadingTask.promise;
      this.totalPages = this.pdfDoc.numPages;
      this.currentPage = 1;
      this.fileName = fileName || '';
      // fingerprint cua pdf.js (neu co), fallback: hash don gian theo do dai + trang
      const fps = this.pdfDoc.fingerprints;
      this.fileId = (fps && fps[0]) ? fps[0] : `local-${dataBuffer.byteLength}-${this.totalPages}`;

      document.getElementById('pageCount').textContent = this.totalPages;
      document.getElementById('pageNumInput').value = this.currentPage;
      this.updateZoomLabel();

      await this.renderCurrentPage();
      return true;
    } catch (error) {
      console.error('Loi load PDF:', error);
      const msg = (error && error.name === 'PasswordException')
        ? 'File PDF nay co mat khau. Hay mo khoa truoc roi tai lai.'
        : 'Khong the doc file PDF nay. Vui long thu file khac.';
      alert(msg);
      return false;
    }
  }

  /**
   * Render trang hien tai - chi view dang mo, co hang doi chong race.
   */
  async renderCurrentPage() {
    if (!this.pdfDoc) return;
    if (this._rendering) { this._renderPending = true; return; }
    this._rendering = true;
    const token = ++this._renderToken;
    try {
      const target = this.activeView === 'bilingual' ? this.bilingualContainer : this.container;
      await this.renderPageToContainer(this.currentPage, target, token);
      if (token !== this._renderToken) return; // da co render moi hon
      if (this.onPageChangeCallback) this.onPageChangeCallback(this.currentPage);
    } finally {
      this._rendering = false;
      if (this._renderPending) {
        this._renderPending = false;
        // Render lai trang moi nhat (co the nguoi dung da bam Next vai lan)
        this.renderCurrentPage();
      }
    }
  }

  /**
   * Render a specific page into a target container (Canvas + DOM TextLayer)
   */
  async renderPageToContainer(pageNo, targetContainer, token) {
    if (!targetContainer) return;
    targetContainer.innerHTML = ''; // Clear container

    const page = await this.pdfDoc.getPage(pageNo);
    if (token !== undefined && token !== this._renderToken) { try { page.cleanup(); } catch (e) {} return; }
    const viewport = page.getViewport({ scale: this.scale });

    // Page Wrapper
    const pageWrapper = document.createElement('div');
    pageWrapper.className = 'pdf-page-container';
    pageWrapper.style.width = `${viewport.width}px`;
    pageWrapper.style.height = `${viewport.height}px`;

    // Canvas Layer - nhan devicePixelRatio de khong mo tren man Retina
    const outputScale = window.devicePixelRatio || 1;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    pageWrapper.appendChild(canvas);

    // Render Canvas
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
      transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined
    };
    await page.render(renderContext).promise;
    if (token !== undefined && token !== this._renderToken) { try { page.cleanup(); } catch (e) {} return; }

    // Text Layer (Crucial for boi den/selection)
    const textContent = await page.getTextContent();
    const textLayerDiv = document.createElement('div');
    textLayerDiv.className = 'textLayer';
    textLayerDiv.style.width = `${viewport.width}px`;
    textLayerDiv.style.height = `${viewport.height}px`;

    // pdf.js 3.11: renderTextLayer tra ve task, can doi .promise
    const textLayerTask = pdfjsLib.renderTextLayer({
      textContentSource: textContent,
      container: textLayerDiv,
      viewport: viewport,
      textDivs: []
    });
    if (textLayerTask && textLayerTask.promise) await textLayerTask.promise;

    pageWrapper.appendChild(textLayerDiv);
    targetContainer.appendChild(pageWrapper);
  }

  /**
   * Trich xuat cac doan van cua mot trang.
   * Gom theo toa do: item co transform [a,b,c,d,x,y], height ~ co chu.
   * - Sap xep dong theo y giam dan (tren xuong), x tang dan
   * - Gom cac dong gan nhau (gap doc <= 1.6 * chieu cao dong) thanh doan
   * - Noi dong bi gach noi: "exam-" + "ple" -> "example"
   * - Chi tach doan khi gap doc lon HOAC dong truoc ket thuc bang dau cau
   *   ket thuc (. ! ?) VA dong sau bat dau bang chu hoa / so
   */
  async getPageTextBlocks(pageNo) {
    if (!this.pdfDoc) return [];
    const page = await this.pdfDoc.getPage(pageNo);
    const textContent = await page.getTextContent();

    const rawItems = textContent.items
      .filter(item => item.str && item.str.trim())
      .map(item => {
        const t = item.transform || [0, 0, 0, 0, 0, 0];
        return {
          text: item.str,
          x: t[4] || 0,
          y: t[5] || 0,
          height: item.height || Math.abs(t[3]) || 12,
          fontName: item.fontName || ''
        };
      });
    if (!rawItems.length) return [];

    // Gom cac item cung dong (y gan nhau) - dung sai = 40% chieu cao dong
    rawItems.sort((a, b) => (b.y - a.y) || (a.x - b.x));
    const lines = [];
    for (const item of rawItems) {
      const last = lines[lines.length - 1];
      if (last && Math.abs(item.y - last.y) <= Math.max(3, last.height * 0.4)) {
        last.items.push(item);
        last.y = (last.y + item.y) / 2;
      } else {
        lines.push({ y: item.y, height: item.height, items: [item] });
      }
    }
    // Moi dong: sap theo x, noi cac item (chen khoang trang neu cach xa)
    const lineTexts = lines.map(line => {
      line.items.sort((a, b) => a.x - b.x);
      let out = '';
      let prevEnd = null;
      for (const it of line.items) {
        if (prevEnd !== null && it.x - prevEnd > 2) out += ' ';
        out += it.text;
        // uoc luong cuoi item: x + do dai * co chu (gan dung, du de chen khoang trang)
        prevEnd = it.x + it.text.length * (it.height * 0.55);
      }
      return { text: out.trim(), y: line.y, height: line.height };
    });

    // Gom dong thanh doan
    const paragraphs = [];
    let current = '';
    let prevLine = null;
    for (const line of lineTexts) {
      if (!line.text) continue;
      if (!current) { current = line.text; prevLine = line; continue; }
      const gap = prevLine.y - line.y; // y giam xuong duoi
      const isNewParagraph = gap > prevLine.height * 1.6
        || (/[.!?]["')\]]?$/.test(prevLine.text) && /^[A-Z0-9“"\(]/.test(line.text) && !/[,:;]$/.test(prevLine.text));
      // Tieu de ngan rieng biet: dong truoc ngan, khong dau cau, dong sau dai hon
      if (isNewParagraph) {
        paragraphs.push(current.trim());
        current = line.text;
      } else if (current.endsWith('-')) {
        current = current.slice(0, -1) + line.text; // noi tu gach noi
      } else {
        current += ' ' + line.text;
      }
      prevLine = line;
    }
    if (current.trim()) paragraphs.push(current.trim());
    return paragraphs.filter(p => p.length >= 2);
  }

  // Navigation Helpers
  async nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      document.getElementById('pageNumInput').value = this.currentPage;
      await this.renderCurrentPage();
    }
  }

  async prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      document.getElementById('pageNumInput').value = this.currentPage;
      await this.renderCurrentPage();
    }
  }

  async goToPage(num) {
    const n = Math.max(1, Math.min(this.totalPages, Math.floor(num)));
    if (Number.isNaN(n)) return false;
    // Cap nhat o nhap ngay ca khi so vuot gioi han (ban cu im lang giu so sai)
    document.getElementById('pageNumInput').value = n;
    if (n !== this.currentPage) {
      this.currentPage = n;
      await this.renderCurrentPage();
    }
    return true;
  }

  async zoomIn() {
    if (this.scale < 3.0) {
      this.scale = Math.round((this.scale + 0.2) * 10) / 10;
      this.updateZoomLabel();
      await this.renderCurrentPage();
    }
  }

  async zoomOut() {
    if (this.scale > 0.6) {
      this.scale = Math.round((this.scale - 0.2) * 10) / 10;
      this.updateZoomLabel();
      await this.renderCurrentPage();
    }
  }
}

window.pdfViewer = new PDFViewerController();
