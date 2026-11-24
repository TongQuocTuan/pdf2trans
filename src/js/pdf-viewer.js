/* ==========================================================================
   PDF Viewer Module (Mozilla PDF.js Integration)
   v1-fixed:
   - Gom doan theo toa do Y + co chu (ban cu tach theo dau cau / hasEOL -> vo cau)
   - Render queue: bam Prev/Next nhanh khong race
   - Chi render view dang mo (ban cu render ca 2 view moi lan)
   - Zoom mac dinh 100% (scale 1.0, ban cu 1.25 nhung ghi 100%), canvas nhan DPR
   - goToPage cap nhat o so trang; bao loi PDF co mat khau rieng
   v2-scan (thu nghiem, y tuong tu uberdesigner pdf-parse, TU VIET LAI):
   - getPageTextBlocksWithBoxes() tra them toa do tung doan (viewport CSS px)
   - playScan(): vach scan quet trang + khung vung sang dan theo vach,
     chi chay luc trich xuat trang song ngu, co the tat, ton trong
     prefers-reduced-motion. Khong copy file/template cua uberdesigner.
   v3-ocr:
   - Mo file anh (PNG/JPG/WebP...), OCR bang Tesseract.js 5.1.0 (CDN, tieng Anh)
   - OCR trang PDF scan (trang khong co text layer): render trang ra canvas
     roi OCR, tra doan kem toa do nhu PDF co text, dung chung luong dich/luu/xuat
   - OCR chi chay khi nguoi dung bam nut, khong tu chay (lan dau tai ~15 MB
     worker + du lieu ngon ngu ve may, can mang)
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
    // Scan FX (v2-scan)
    this.scanFxEnabled = true;
    this._scanOverlay = null;
    this._scanViewportHeight = 0;
    this._scanToken = 0;
    // OCR (v3-ocr)
    this.docType = 'pdf'; // 'pdf' | 'image'
    this.imageBlob = null;
    this.imageUrl = null;
    this.imageNaturalWidth = 0;
    this.imageNaturalHeight = 0;
    this._imageDisplayScale = 1;
    this.ocrParagraphs = {}; // pageNo -> [{text, box}]
    this.ocrRunning = false;
    this.onOcrProgress = null; // fn(pct 0-100, statusText)
  }

  setActiveView(mode) {
    this.activeView = mode === 'bilingual' ? 'bilingual' : 'select';
  }

  updateZoomLabel() {
    const el = document.getElementById('zoomLevel');
    if (el) el.textContent = `${Math.round(this.scale * 100)}%`;
  }

  setScanFxEnabled(enabled) {
    this.scanFxEnabled = !!enabled;
  }

  prefersReducedMotion() {
    return typeof window !== 'undefined'
      && window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Load PDF from ArrayBuffer or File
   */
  async loadDocument(dataBuffer, fileName = '') {
    try {
      const loadingTask = pdfjsLib.getDocument({ data: dataBuffer });
      this.pdfDoc = await loadingTask.promise;
      this.docType = 'pdf';
      this.ocrParagraphs = {};
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
   * Load file anh (PNG/JPG/WebP/GIF/BMP) de OCR roi dich (v3-ocr).
   * Anh hien thi nhu 1 trang duy nhat; text chi co sau khi chay OCR.
   */
  async loadImageFile(file) {
    if (!file || !file.type || !file.type.startsWith('image/')) return false;
    if (this.imageUrl) { try { URL.revokeObjectURL(this.imageUrl); } catch (e) {} }
    this.imageBlob = file;
    this.imageUrl = URL.createObjectURL(file);
    const img = await new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error('Khong doc duoc file anh nay.'));
      im.src = this.imageUrl;
    });
    this.imageNaturalWidth = img.naturalWidth || img.width;
    this.imageNaturalHeight = img.naturalHeight || img.height;
    if (!this.imageNaturalWidth || !this.imageNaturalHeight) return false;
    this.docType = 'image';
    this.pdfDoc = null;
    this.ocrParagraphs = {};
    this.totalPages = 1;
    this.currentPage = 1;
    this.fileName = file.name || '';
    this.fileId = `img-${file.size}-${file.lastModified || 0}-${file.name}`;
    document.getElementById('pageCount').textContent = this.totalPages;
    document.getElementById('pageNumInput').value = this.currentPage;
    this.updateZoomLabel();
    await this.renderCurrentPage();
    return true;
  }

  /**
   * Render trang hien tai - chi view dang mo, co hang doi chong race.
   */
  async renderCurrentPage() {
    if (!this.pdfDoc && this.docType !== 'image') return;
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
    this._scanOverlay = null;

    // Anh (v3-ocr): hien <img> thay cho canvas PDF, van co scan overlay
    if (this.docType === 'image') {
      const displayWidth = Math.min(this.imageNaturalWidth * this.scale, 1400);
      this._imageDisplayScale = displayWidth / this.imageNaturalWidth;
      const displayHeight = this.imageNaturalHeight * this._imageDisplayScale;
      this._scanViewportHeight = displayHeight;
      const pageWrapper = document.createElement('div');
      pageWrapper.className = 'pdf-page-container';
      pageWrapper.style.width = `${displayWidth}px`;
      pageWrapper.style.height = `${displayHeight}px`;
      const img = document.createElement('img');
      img.className = 'ocr-image';
      img.src = this.imageUrl;
      img.alt = this.fileName || 'Anh can OCR';
      img.style.width = `${displayWidth}px`;
      img.style.height = `${displayHeight}px`;
      pageWrapper.appendChild(img);
      const scanOverlay = document.createElement('div');
      scanOverlay.className = 'scan-overlay';
      scanOverlay.setAttribute('aria-hidden', 'true');
      pageWrapper.appendChild(scanOverlay);
      this._scanOverlay = scanOverlay;
      targetContainer.appendChild(pageWrapper);
      return;
    }

    const page = await this.pdfDoc.getPage(pageNo);
    if (token !== undefined && token !== this._renderToken) { try { page.cleanup(); } catch (e) {} return; }
    const viewport = page.getViewport({ scale: this.scale });
    this._scanViewportHeight = viewport.height;

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

    // Scan overlay (v2-scan): lop trong suot, chi dung de ve vach + khung vung.
    // pointer-events: none trong CSS nen khong chan boi den text.
    const scanOverlay = document.createElement('div');
    scanOverlay.className = 'scan-overlay';
    scanOverlay.setAttribute('aria-hidden', 'true');
    pageWrapper.appendChild(scanOverlay);
    this._scanOverlay = scanOverlay;

    targetContainer.appendChild(pageWrapper);
  }

  // Chuyen 1 diem PDF (goc duoi-trai) sang viewport CSS px (goc tren-trai)
  _toViewportPoint(viewport, x, y) {
    if (viewport.convertToViewportPoint) {
      const p = viewport.convertToViewportPoint(x, y);
      return [p[0], p[1]];
    }
    return [x * this.scale, viewport.height - y * this.scale];
  }

  /**
   * Trich xuat cac doan van cua mot trang, kem toa do (viewport CSS px).
   * Gom theo toa do: item co transform [a,b,c,d,x,y], height ~ co chu.
   * - Sap xep dong theo y giam dan (tren xuong), x tang dan
   * - Gom cac dong gan nhau (gap doc <= 1.6 * chieu cao dong) thanh doan
   * - Noi dong bi gach noi: "exam-" + "ple" -> "example"
   * - Chi tach doan khi gap doc lon HOAC dong truoc ket thuc bang dau cau
   *   ket thuc (. ! ?) VA dong sau bat dau bang chu hoa / so
   * Tra ve: [{ text, box: {x, y, width, height} }] - box la goc tren-trai.
   */
  async _getPageParagraphs(pageNo) {
    if (!this.pdfDoc) return [];
    const page = await this.pdfDoc.getPage(pageNo);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: this.scale });

    const rawItems = textContent.items
      .filter(item => item.str && item.str.trim())
      .map(item => {
        const t = item.transform || [0, 0, 0, 0, 0, 0];
        const height = item.height || Math.abs(t[3]) || 12;
        const width = item.width || (item.str.length * height * 0.55);
        const [vx, vy] = this._toViewportPoint(viewport, t[4] || 0, t[5] || 0);
        const [vx2] = this._toViewportPoint(viewport, (t[4] || 0) + width, t[5] || 0);
        return {
          text: item.str,
          x: t[4] || 0,
          y: t[5] || 0,
          height,
          fontName: item.fontName || '',
          vx,
          vyTop: vy - height * this.scale,
          vyBottom: vy + height * this.scale * 0.25,
          vWidth: Math.abs(vx2 - vx)
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
        prevEnd = it.x + it.text.length * (it.height * 0.55);
      }
      // Khung cua dong trong viewport
      const xs = line.items.map(it => it.vx);
      const rights = line.items.map(it => it.vx + it.vWidth);
      const tops = line.items.map(it => it.vyTop);
      const bottoms = line.items.map(it => it.vyBottom);
      const box = {
        x: Math.min(...xs),
        y: Math.min(...tops),
        width: Math.max(...rights) - Math.min(...xs),
        height: Math.max(...bottoms) - Math.min(...tops)
      };
      return { text: out.trim(), y: line.y, height: line.height, box };
    });

    // Gom dong thanh doan, gop luon khung
    const paragraphs = [];
    let current = '';
    let currentBox = null;
    let prevLine = null;
    const pushCurrent = () => {
      if (current.trim()) paragraphs.push({ text: current.trim(), box: currentBox });
      current = '';
      currentBox = null;
    };
    const mergeBox = (box) => {
      if (!currentBox) { currentBox = { ...box }; return; }
      const right = Math.max(currentBox.x + currentBox.width, box.x + box.width);
      const bottom = Math.max(currentBox.y + currentBox.height, box.y + box.height);
      currentBox.x = Math.min(currentBox.x, box.x);
      currentBox.y = Math.min(currentBox.y, box.y);
      currentBox.width = right - currentBox.x;
      currentBox.height = bottom - currentBox.y;
    };
    for (const line of lineTexts) {
      if (!line.text) continue;
      if (!current) { current = line.text; mergeBox(line.box); prevLine = line; continue; }
      const gap = prevLine.y - line.y; // y giam xuong duoi
      const isNewParagraph = gap > prevLine.height * 1.6
        || (/[.!?]["')\]]?$/.test(prevLine.text) && /^[A-Z0-9“"\(]/.test(line.text) && !/[,:;]$/.test(prevLine.text));
      if (isNewParagraph) {
        pushCurrent();
        current = line.text;
        mergeBox(line.box);
      } else if (current.endsWith('-')) {
        current = current.slice(0, -1) + line.text; // noi tu gach noi
        mergeBox(line.box);
      } else {
        current += ' ' + line.text;
        mergeBox(line.box);
      }
      prevLine = line;
    }
    pushCurrent();
    return paragraphs.filter(p => p.text.length >= 2);
  }

  async getPageTextBlocks(pageNo) {
    const paras = await this.getPageTextBlocksWithBoxes(pageNo);
    return paras.map(p => p.text);
  }

  async getPageTextBlocksWithBoxes(pageNo) {
    // Anh: chi co text sau khi OCR
    if (this.docType === 'image') return this.ocrParagraphs[pageNo] || [];
    // PDF co text: dung text layer; PDF scan: dung ket qua OCR neu co
    const paras = await this._getPageParagraphs(pageNo);
    if (paras.length) return paras;
    return this.ocrParagraphs[pageNo] || [];
  }

  // OCR co ket qua cho trang nay chua? (de app.js biet co nen hien nut OCR)
  hasOcrForPage(pageNo) {
    return !!(this.ocrParagraphs[pageNo] && this.ocrParagraphs[pageNo].length);
  }

  _emitOcrProgress(pct, statusText) {
    if (typeof this.onOcrProgress === 'function') {
      try { this.onOcrProgress(pct, statusText); } catch (e) {}
    }
  }

  /**
   * Gom ket qua Tesseract thanh doan kem toa do hien thi.
   * data: ket qua Tesseract.recognize().data
   * convert(x0, y0, x1, y1): toa do goc (pixel anh/canvas OCR) -> box hien thi.
   * Uu tien data.paragraphs, fallback sang blocks, roi words gop theo block/par.
   */
  _paragraphsFromTesseract(data, convert) {
    const clean = (s) => (s || '').trim().replace(/\s+/g, ' ');
    const out = [];
    const push = (text, bbox) => {
      const t = clean(text);
      if (t.length < 2 || !bbox) return;
      out.push({ text: t, box: convert(bbox.x0, bbox.y0, bbox.x1, bbox.y1) });
    };
    if (data && Array.isArray(data.paragraphs) && data.paragraphs.length) {
      for (const p of data.paragraphs) push(p.text, p.bbox);
      if (out.length) return out;
    }
    if (data && Array.isArray(data.blocks) && data.blocks.length) {
      for (const b of data.blocks) {
        if (Array.isArray(b.paragraphs)) {
          for (const p of b.paragraphs) push(p.text, p.bbox);
        } else push(b.text, b.bbox);
      }
      if (out.length) return out;
    }
    if (data && Array.isArray(data.words) && data.words.length) {
      const groups = new Map();
      for (const w of data.words) {
        const key = `${w.block_num || 0}/${w.par_num || 0}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(w);
      }
      for (const words of groups.values()) {
        words.sort((a, b) => (a.line_num - b.line_num) || (a.word_num - b.word_num));
        const text = words.map(w => w.text).join(' ');
        const box = {
          x0: Math.min(...words.map(w => w.bbox.x0)),
          y0: Math.min(...words.map(w => w.bbox.y0)),
          x1: Math.max(...words.map(w => w.bbox.x1)),
          y1: Math.max(...words.map(w => w.bbox.y1))
        };
        push(text, box);
      }
      return out;
    }
    // Cuoi cung: toan bo text thanh 1 doan (mat toa do chinh xac)
    if (data && typeof data.text === 'string' && clean(data.text).length >= 2) {
      return [{ text: clean(data.text), box: { x: 0, y: 0, width: 100, height: 20 } }];
    }
    return [];
  }

  /**
   * Chay OCR cho trang hien tai (v3-ocr). Chi chay khi nguoi dung bam nut.
   * - Anh: OCR truc tiep file anh.
   * - PDF: render trang ra canvas (scale 2 de OCR chinh xac hon) roi OCR.
   * Tra ve danh sach doan [{text, box}] va luu vao ocrParagraphs[pageNo].
   * Ngon ngu OCR la tieng Anh (tai lieu goc de dich sang tieng Viet).
   */
  async runOcrOnCurrentPage() {
    if (this.ocrRunning) throw new Error('Dang chay OCR, doi chut roi thu lai.');
    if (typeof Tesseract === 'undefined') {
      throw new Error('Chua tai duoc thu vien OCR (Tesseract.js). Kiem tra mang roi thu lai.');
    }
    const pageNo = this.currentPage;
    let source = null;
    let convert = null;
    if (this.docType === 'image') {
      if (!this.imageBlob) throw new Error('Chua co file anh de OCR.');
      source = this.imageBlob;
      const s = this._imageDisplayScale || 1;
      convert = (x0, y0, x1, y1) => ({
        x: x0 * s, y: y0 * s,
        width: Math.max(4, (x1 - x0) * s), height: Math.max(4, (y1 - y0) * s)
      });
    } else {
      if (!this.pdfDoc) throw new Error('Chua mo file PDF.');
      const ocrScale = 2.0;
      const page = await this.pdfDoc.getPage(pageNo);
      const viewport = page.getViewport({ scale: ocrScale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      source = await new Promise((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('Khong tao duoc anh tu trang PDF.')), 'image/png');
      });
      const factor = this.scale / ocrScale; // toa do OCR -> toa do hien thi
      convert = (x0, y0, x1, y1) => ({
        x: x0 * factor, y: y0 * factor,
        width: Math.max(4, (x1 - x0) * factor), height: Math.max(4, (y1 - y0) * factor)
      });
    }

    this.ocrRunning = true;
    try {
      this._emitOcrProgress(5, 'Đang tải thư viện OCR…');
      const result = await Tesseract.recognize(source, 'eng', {
        logger: (m) => {
          // m: {status, progress} - status tieng Anh cua Tesseract
          const pct = Math.round(5 + (m.progress || 0) * 90);
          const label = {
            'loading tesseract core': 'Đang tải lõi OCR…',
            'initializing tesseract': 'Đang khởi tạo OCR…',
            'loading language traineddata': 'Đang tải dữ liệu tiếng Anh…',
            'initializing api': 'Đang khởi tạo OCR…',
            'recognizing text': 'Đang nhận dạng chữ…'
          }[m.status] || 'Đang quét OCR…';
          this._emitOcrProgress(pct, `${label} ${Math.round((m.progress || 0) * 100)}%`);
        }
      });
      const paras = this._paragraphsFromTesseract(result.data, convert)
        .filter(p => p.text && p.text.length >= 2);
      if (!paras.length) throw new Error('OCR không nhận ra chữ nào trên trang này. Thử ảnh rõ hơn, sáng hơn, hoặc xoay đúng chiều.');
      this.ocrParagraphs[pageNo] = paras;
      this._emitOcrProgress(100, `Xong: nhận được ${paras.length} đoạn.`);
      return paras;
    } finally {
      this.ocrRunning = false;
    }
  }

  /**
   * Hieu ung scan (v2-scan): vach quet tu tren xuong, khung tung doan
   * sang dan khi vach di qua. Chi chay khi scanFxEnabled va nguoi dung
   * khong dat prefers-reduced-motion. Khong chan dich: tra ve ngay khi
   * xong, caller co the khong await.
   * boxes: [{ text, box: {x, y, width, height} }] (viewport CSS px).
   */
  async playScan(boxes) {
    if (!this.scanFxEnabled || this.prefersReducedMotion()) return false;
    if (!boxes || !boxes.length || !this._scanOverlay) return false;
    const overlay = this._scanOverlay;
    const token = ++this._scanToken;
    overlay.innerHTML = '';

    const overlayHeight = overlay.clientHeight || this._scanViewportHeight || 800;
    const durationMs = Math.min(2400, 900 + boxes.length * 120);

    // Thanh tien do + phan tram
    const progress = document.createElement('div');
    progress.className = 'scan-progress';
    const progressBar = document.createElement('div');
    progressBar.className = 'scan-progress-bar';
    const progressText = document.createElement('span');
    progressText.className = 'scan-progress-text';
    progressText.textContent = 'Đang quét trang… 0%';
    progress.appendChild(progressBar);
    progress.appendChild(progressText);
    overlay.appendChild(progress);

    // Vach scan
    const line = document.createElement('div');
    line.className = 'scan-line';
    overlay.appendChild(line);

    // Khung tung doan, an truoc, sang dan khi vach di qua
    const boxEls = boxes.map((b, i) => {
      const el = document.createElement('div');
      el.className = 'scan-box';
      el.style.left = `${Math.max(0, b.box.x - 3)}px`;
      el.style.top = `${Math.max(0, b.box.y - 3)}px`;
      el.style.width = `${Math.max(8, b.box.width + 6)}px`;
      el.style.height = `${Math.max(8, b.box.height + 6)}px`;
      const label = document.createElement('span');
      label.className = 'scan-box-label';
      label.textContent = `Đoạn ${i + 1}`;
      el.appendChild(label);
      overlay.appendChild(el);
      return el;
    });

    const start = (typeof performance !== 'undefined' && performance.now)
      ? performance.now() : Date.now();
    const now = () => (typeof performance !== 'undefined' && performance.now)
      ? performance.now() : Date.now();

    await new Promise(resolve => {
      const step = () => {
        if (token !== this._scanToken) { resolve(); return; }
        const elapsed = now() - start;
        const p = Math.min(1, elapsed / durationMs);
        const lineY = p * overlayHeight;
        line.style.top = `${lineY}px`;
        progressBar.style.width = `${Math.round(p * 100)}%`;
        progressText.textContent = `Đang quét trang… ${Math.round(p * 100)}%`;
        boxes.forEach((b, i) => {
          if (b.box.y <= lineY) boxEls[i].classList.add('revealed');
        });
        if (p < 1) {
          if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(step);
          else setTimeout(step, 16);
        } else resolve();
      };
      step();
    });
    if (token !== this._scanToken) return false;

    // Giu khung hien 500ms roi mo dan va don
    overlay.classList.add('scan-done');
    await new Promise(r => setTimeout(r, 500));
    if (token !== this._scanToken) return false;
    overlay.innerHTML = '';
    overlay.classList.remove('scan-done');
    return true;
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
