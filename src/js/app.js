/* ==========================================================================
   Main Application Controller & Event Listeners
   v1-fixed:
   - Luu ban dich theo file (localStorage, khoa = fingerprint PDF): doi trang /
     tat tab mo lai van con, co nut Duyet tung doan + Xuat .md / .json
   - Tooltip chong race bang request-id; loi dich hien rieng, khong lan vao ban dich
   - Chi render view dang mo (qua pdfViewer.setActiveView)
   - O so trang co clamp; dong bo cuon chong chia 0; escapeHtml day du
   v2-scan (thu nghiem):
   - Nut bat/tat hieu ung scan (luu localStorage), mac dinh bat,
     ton trong prefers-reduced-motion (pdf-viewer tu tat)
   - Luc dich trang song ngu: lay doan kem toa do, cho playScan chay
     tren pane PDF trai (khong await, khong chan dich ben phai)
   v3-ocr:
   - Mo file anh (PDF hoac anh) qua loadFile(); nut "Quet OCR trang nay"
     chi chay khi bam, hien tien do, xong thi dich nhu PDF co text
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const dropZone = document.getElementById('dropZone');
  const pdfFileInput = document.getElementById('pdfFileInput');
  const btnLoadSample = document.getElementById('btnLoadSample');

  const selectionView = document.getElementById('selectionView');
  const bilingualView = document.getElementById('bilingualView');
  const btnModeSelect = document.getElementById('btnModeSelect');
  const btnModeBilingual = document.getElementById('btnModeBilingual');

  const btnPrevPage = document.getElementById('btnPrevPage');
  const btnNextPage = document.getElementById('btnNextPage');
  const pageNumInput = document.getElementById('pageNumInput');
  const btnZoomIn = document.getElementById('btnZoomIn');
  const btnZoomOut = document.getElementById('btnZoomOut');

  // Tooltip Elements
  const tooltip = document.getElementById('translationTooltip');
  const tooltipOriginalText = document.getElementById('tooltipOriginalText');
  const tooltipTranslatedText = document.getElementById('tooltipTranslatedText');
  const btnSpeak = document.getElementById('btnSpeak');
  const btnCopy = document.getElementById('btnCopy');
  const btnCloseTooltip = document.getElementById('btnCloseTooltip');

  // Settings Modal Elements
  const btnSettings = document.getElementById('btnSettings');
  // Find & Replace Elements (U9)
  const btnFindReplace = document.getElementById('btnFindReplace');
  const findReplaceModal = document.getElementById('findReplaceModal');
  const btnCloseFindReplace = document.getElementById('btnCloseFindReplace');
  const findInput = document.getElementById('findInput');
  const replaceInput = document.getElementById('replaceInput');
  const findReplaceCount = document.getElementById('findReplaceCount');
  const btnReplaceAll = document.getElementById('btnReplaceAll');
  const findReplaceResult = document.getElementById('findReplaceResult');

  const btnFileProgress = document.getElementById('btnFileProgress');
  const fileProgressModal = document.getElementById('fileProgressModal');
  const btnCloseFileProgress = document.getElementById('btnCloseFileProgress');
  const fileProgressList = document.getElementById('fileProgressList');
  const settingsModal = document.getElementById('settingsModal');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const btnSaveSettings = document.getElementById('btnSaveSettings');
  const engineSelect = document.getElementById('engineSelect');
  const geminiKeyGroup = document.getElementById('geminiKeyGroup');
  const geminiApiKeyInput = document.getElementById('geminiApiKey');

  // Glossary Elements (U1)
  const glossaryList = document.getElementById('glossaryList');
  const glossaryEnInput = document.getElementById('glossaryEn');
  const glossaryViInput = document.getElementById('glossaryVi');
  const btnGlossaryAdd = document.getElementById('btnGlossaryAdd');
  const btnGlossaryExport = document.getElementById('btnGlossaryExport');
  const btnGlossaryImport = document.getElementById('btnGlossaryImport');
  const glossaryFileInput = document.getElementById('glossaryFileInput');

  // Bilingual Elements
  const translationPanel = document.getElementById('translationPanel');
  const btnTranslateAll = document.getElementById('btnTranslateAll');
  const btnTranslateDoc = document.getElementById('btnTranslateDoc');
  const batchProgress = document.getElementById('batchProgress');
  const batchProgressText = document.getElementById('batchProgressText');
  const batchProgressFill = document.getElementById('batchProgressFill');
  const btnBatchPause = document.getElementById('btnBatchPause');
  const btnBatchStop = document.getElementById('btnBatchStop');
  const btnToggleSync = document.getElementById('btnToggleSync');
  const bilingualPdfWrapper = document.getElementById('bilingualPdfWrapper');
  const btnExportMd = document.getElementById('btnExportMd');
  const btnExportJson = document.getElementById('btnExportJson');
  const btnExportDocx = document.getElementById('btnExportDocx');
  const btnToggleScanFx = document.getElementById('btnToggleScanFx');
  const btnOcrPage = document.getElementById('btnOcrPage');

  let currentMode = 'select'; // 'select' or 'bilingual'

  // Drop zone chi hien o che do Quet chon khi chua co file.
  // Neu de hien ca o che do Song ngu, no se che het khung phai
  // (nut Dich trang nay, o ban dich trong) vi no phu toan bo main.
  function updateDropZoneVisibility() {
    const hasDoc = !!(window.pdfViewer && (window.pdfViewer.pdfDoc || window.pdfViewer.docType === 'image'));
    dropZone.classList.toggle('hidden', currentMode !== 'select' || hasDoc);
  }
  let isSyncScroll = true;
  let lastSelectedText = '';
  let tooltipRequestId = 0;

  // Scan FX (v2-scan): mac dinh bat, luu lua chon vao localStorage
  let scanFxOn = localStorage.getItem('pdf_trans_scan_fx') !== 'off';
  function applyScanFx() {
    if (window.pdfViewer) window.pdfViewer.setScanFxEnabled(scanFxOn);
    if (btnToggleScanFx) {
      btnToggleScanFx.classList.toggle('active', scanFxOn);
      btnToggleScanFx.setAttribute('aria-pressed', String(scanFxOn));
      btnToggleScanFx.innerHTML = scanFxOn
        ? '<i class="fa-solid fa-wand-magic-sparkles"></i> Scan: Bật'
        : '<i class="fa-solid fa-wand-magic-sparkles"></i> Scan: Tắt';
      btnToggleScanFx.title = scanFxOn
        ? 'Tắt hiệu ứng quét trang (scan)'
        : 'Bật hiệu ứng quét trang (scan)';
    }
  }

  // ------------------------------------------------------------------------
  // Translation Store - luu ben theo file (localStorage)
  // Khoa: fingerprint PDF tu pdf.js. Moi doan: {en, vi, page, order, approved}
  // Luu y gioi han localStorage ~5MB: chi luu text, khong luu PDF.
  // ------------------------------------------------------------------------
  function segHash(text) {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < text.length; i++) {
      const ch = text.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(16) + (h1 >>> 0).toString(16);
  }

  const translationStore = {
    fileId: null,
    fileName: '',
    segments: {}, // segHash -> {en, vi, page, order, approved, updatedAt, status, error}
    _saveTimer: null,
    // load() doc tu IndexedDB truoc, roi ve localStorage cu neu chua co.
    // Tra ve promise — cac cho goi deu await (deu nam trong ham async).
    async load(fileId, fileName) {
      this.fileId = fileId;
      this.fileName = fileName || '';
      this.segments = {};
      if (!fileId) return;
      // U6: ghi dau "mo gan nhat" cua file (fire-and-forget, khong chan mo file)
      if (window.PdfTransDB) {
        window.PdfTransDB.put(window.PdfTransDB.stores.meta, {
          key: `file:${fileId}`,
          value: { fileName: this.fileName, lastOpenedAt: Date.now() }
        }).catch(() => {});
      }
      // 1. Thu IndexedDB (kho chinh tu U3)
      try {
        if (window.PdfTransDB) {
          const rows = await window.PdfTransDB.getAll(window.PdfTransDB.stores.segments);
          const mine = rows.filter(r => r.fileId === fileId);
          if (mine.length) {
            for (const r of mine) {
              this.segments[segHash(r.en)] = {
                en: r.en, vi: r.vi, page: r.page, order: r.order,
                approved: !!r.approved, updatedAt: r.updatedAt || null,
                status: r.status || (r.vi ? 'done' : 'pending'), error: r.error || null
              };
            }
            if (mine[0].fileName) this.fileName = mine[0].fileName;
            return;
          }
        }
      } catch (e) { /* roi xuong localStorage */ }
      // 2. Fallback: localStorage cu (ban chua migrate, hoac IDB loi)
      try {
        const raw = localStorage.getItem(`pdf_trans_store_v1:${fileId}`);
        if (raw) {
          const data = JSON.parse(raw);
          this.segments = data.segments || {};
          this.fileName = data.fileName || this.fileName;
        }
      } catch (e) { this.segments = {}; }
    },
    save() {
      if (!this.fileId) return;
      clearTimeout(this._saveTimer);
      this._saveTimer = setTimeout(() => { this._writeNow(); }, 300);
    },
    // Ghi ngay lap tuc (khong doi debounce): dung khi can doc kho ngay sau
    // do, vd. mo bang tien do ngay sau khi batch dich xong.
    flushSave() {
      clearTimeout(this._saveTimer);
      return this._writeNow();
    },
    _writeNow() {
      if (!this.fileId) return Promise.resolve();
      let idbDone = Promise.resolve();
      // Ghi kho chinh: IndexedDB (moi doan 1 ban ghi, id gom ca hash
      // de khong dung do khi 2 doan cung trang + cung order, vd. tooltip)
      if (window.PdfTransDB) {
        const rows = Object.keys(this.segments).map(h => {
          const s = this.segments[h];
          return {
            id: `${this.fileId}:${s.page}:${s.order}:${h.slice(0, 8)}`,
            fileId: this.fileId, fileName: this.fileName,
            en: s.en, vi: s.vi || '', page: s.page, order: s.order,
            approved: !!s.approved, status: s.status || (s.vi ? 'done' : 'pending'),
            error: s.error || null, updatedAt: s.updatedAt || null
          };
        });
        idbDone = Promise.all(rows.map(r => window.PdfTransDB.put(window.PdfTransDB.stores.segments, r)))
          .catch(() => { /* IDB loi thi con ban sao localStorage ben duoi */ });
      }
      // Ban sao du phong: localStorage cu (best-effort, het quota thi thoi)
      try {
        localStorage.setItem(`pdf_trans_store_v1:${this.fileId}`, JSON.stringify({
          fileName: this.fileName,
          savedAt: new Date().toISOString(),
          segments: this.segments
        }));
      } catch (e) {
        if (!window.PdfTransDB || window.PdfTransDB.backendName === 'memory') {
          alert('Khong luu duoc ban dich: bo nho trinh duyet day. Hay xuat file .md/.json ngay.');
        }
      }
      return idbDone;
    },
    get(en) { return this.segments[segHash(en)] || null; },
    set(en, vi, page, order) {
      this.segments[segHash(en)] = {
        en, vi, page, order,
        approved: (this.segments[segHash(en)] || {}).approved || false,
        updatedAt: new Date().toISOString(),
        status: 'done', error: null
      };
      this.save();
    },
    // Ghi loi dich cua 1 doan (U2 batch): giu lai en/page/order de dich lai sau
    setError(en, page, order, message) {
      const prev = this.segments[segHash(en)] || {};
      this.segments[segHash(en)] = {
        en, vi: prev.vi || '', page, order,
        approved: prev.approved || false,
        updatedAt: new Date().toISOString(),
        status: 'error', error: message || 'Loi dich'
      };
      this.save();
    },
    setApproved(en, approved) {
      const s = this.segments[segHash(en)];
      if (s) { s.approved = !!approved; this.save(); }
    },
    // U8: xoa 1 doan khoi kho (khi sua text goc / tach / gop doan OCR).
    // Xoa ca ban ghi IDB: id ket bang :<hash8> cua text cu. Store von
    // khoa theo hash cua en nen 2 doan cung text tren 2 trang chia
    // chung 1 ban ghi — xoa theo hash la dung ngu nghia hien co.
    async remove(en) {
      const h = segHash(en);
      delete this.segments[h];
      if (window.PdfTransDB) {
        try {
          const rows = await window.PdfTransDB.getAll(window.PdfTransDB.stores.segments);
          const suffix = ':' + h.slice(0, 8);
          const mine = rows.filter(r => r.fileId === this.fileId && typeof r.id === 'string' && r.id.endsWith(suffix));
          await Promise.all(mine.map(r => window.PdfTransDB.del(window.PdfTransDB.stores.segments, r.id)));
        } catch (e) { /* bo qua — ban sao localStorage se ghi lai o save() */ }
      }
      this.save();
    },
    allSorted() {
      return Object.values(this.segments)
        .sort((a, b) => (a.page - b.page) || (a.order - b.order));
    },
    stats() {
      const all = this.allSorted();
      return {
        total: all.length,
        translated: all.filter(s => s.status === 'done' || (s.vi && s.status !== 'error')).length,
        approved: all.filter(s => s.approved).length,
        failed: all.filter(s => s.status === 'error').length
      };
    },
    toMarkdown() {
      const all = this.allSorted();
      const lines = [`# Ban dich — ${this.fileName || 'PDF'}`, '', `_Xuat tu PDF Translator, ${new Date().toLocaleString('vi-VN')}. Tong ${all.length} doan, da duyet ${all.filter(s => s.approved).length}._`, ''];
      let curPage = null;
      for (const s of all) {
        if (s.page !== curPage) { curPage = s.page; lines.push(`## Trang ${curPage}`, ''); }
        lines.push(`${s.approved ? '✅' : '⬜'} **EN:** ${s.en}`, '', `**VI:** ${s.vi}`, '', '---', '');
      }
      return lines.join('\n');
    },
    toJSON() {
      return JSON.stringify({
        fileName: this.fileName, exportedAt: new Date().toISOString(),
        stats: this.stats(), segments: this.allSorted()
      }, null, 2);
    }
  };
  window.translationStore = translationStore;

  // U1: dich 1 doan co ap dung tu dien thuat ngu.
  // Tra ve {vi, applied, unapplied}: applied = co thuat ngu duoc ap,
  // unapplied = thuat ngu co trong cau goc ma ban dich khong dung tu da chot.
  async function translateWithGlossary(text) {
    if (window.Glossary) await window.Glossary.ready();
    const applied0 = window.Glossary ? window.Glossary.applyToText(text) : { text, map: [] };
    const viRaw = await window.translator.translate(applied0.text);
    const vi = window.Glossary ? window.Glossary.restorePlaceholders(viRaw, applied0.map) : viRaw;
    const unapplied = window.Glossary ? window.Glossary.findUnapplied(text, vi) : [];
    return { vi, applied: applied0.map.length > 0, unapplied };
  }

  function downloadFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // U4: nap thu vien docx (vendor, 1.06 MB) CHI KHI bam "Xuat .docx" — khong nang trang luc mo.
  let docxLibPromise = null;
  function ensureDocxLib() {
    if (window.docx) return Promise.resolve(window.docx);
    if (docxLibPromise) return docxLibPromise;
    docxLibPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'vendor/docx-9.16.0.iife.js';
      script.onload = () => {
        if (window.docx) resolve(window.docx);
        else reject(new Error('Thu vien docx tai xong nhung khong khoi tao duoc.'));
      };
      script.onerror = () => reject(new Error('Khong tai duoc thu vien docx (vendor/docx-9.16.0.iife.js).'));
      document.head.appendChild(script);
    });
    return docxLibPromise;
  }

  // U4: xuat .docx — kho A4 mac dinh, tieu de theo file + ngay xuat,
  // moi trang 1 muc Heading 2, doan chua duyet them "(chua duyet)", doan loi bo qua.
  async function exportDocx() {
    const all = translationStore.allSorted().filter(seg => seg.vi);
    if (!all.length) { alert('Chua co doan dich nao de xuat. Hay dich mot trang truoc.'); return; }
    const oldLabel = btnExportDocx.innerHTML;
    btnExportDocx.disabled = true;
    btnExportDocx.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Đang tạo .docx…';
    try {
      const lib = await ensureDocxLib();
      const doc = window.buildDocxDocument(lib, {
        fileName: translationStore.fileName || 'PDF',
        exportedAt: new Date(),
        stats: translationStore.stats(),
        segments: all
      });
      const blob = await lib.Packer.toBlob(doc);
      downloadBlob(`${exportBaseName()}-dich.docx`, blob);
    } catch (err) {
      alert(`Không xuất được .docx: ${err.message || err}`);
    } finally {
      btnExportDocx.disabled = false;
      btnExportDocx.innerHTML = oldLabel;
    }
  }

  function exportBaseName() {
    const name = (translationStore.fileName || 'ban-dich').replace(/\.pdf$/i, '');
    return name.replace(/[\\/:*?"<>|]/g, '-');
  }

  // Show initial DropZone state (chi che do Quet chon, chua co file)
  updateDropZoneVisibility();
  // U3: chuyen du lieu cu tu localStorage sang IndexedDB (chi 1 lan).
  // Khong chan giao dien; neu chuyen duoc doan nao thi hien dong ghi chu nho o drop zone.
  if (window.PdfTransDB) {
    window.PdfTransDB.migrateFromLocalStorage().then(res => {
      if (res.migrated && res.segments > 0) {
        const note = document.getElementById('migrateNote');
        if (note) {
          note.textContent = `Đã chuyển ${res.segments} đoạn dịch cũ sang kho lưu trữ mới (IndexedDB).`;
          note.classList.remove('hidden');
        }
      }
    }).catch(() => {});
  }
  if (window.pdfViewer) window.pdfViewer.setActiveView('select');
  applyScanFx();

  if (btnToggleScanFx) btnToggleScanFx.addEventListener('click', () => {
    scanFxOn = !scanFxOn;
    localStorage.setItem('pdf_trans_scan_fx', scanFxOn ? 'on' : 'off');
    applyScanFx();
  });

  // ------------------------------------------------------------------------
  // File Upload & PDF Loading
  // ------------------------------------------------------------------------
  pdfFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    // Reset de mo lai cung file van chay (ban cu khong reset)
    e.target.value = '';
    if (!file) return;
    await loadFile(file);
  });

  // Drag & Drop
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', async (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await loadFile(e.dataTransfer.files[0]);
    }
  });

  // Mo file: PDF hoac anh (v3-ocr)
  async function loadFile(file) {
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    const isImage = file.type && file.type.startsWith('image/');
    if (!isPdf && !isImage) {
      alert('Chi ho tro file PDF hoac anh (PNG, JPG, WebP...).');
      return;
    }
    if (isImage) {
      const ok = await window.pdfViewer.loadImageFile(file);
      if (ok) {
        await translationStore.load(window.pdfViewer.fileId, file.name);
        updateDropZoneVisibility();
        if (currentMode === 'bilingual') {
          await window.pdfViewer.renderCurrentPage();
          await renderBilingualPage();
        }
      } else {
        alert('Khong doc duoc file anh nay.');
      }
      return;
    }
    await loadPDFFile(file);
  }

  async function loadPDFFile(file) {
    if (file.size > 80 * 1024 * 1024) {
      if (!confirm('File tren 80MB co the cham / ton RAM. Van mo?')) return;
    }
    const reader = new FileReader();
    reader.onerror = () => alert('Khong doc duoc file nay.');
    reader.onload = async function () {
      const buffer = new Uint8Array(this.result);
      const success = await window.pdfViewer.loadDocument(buffer, file.name);
      if (success) {
        await translationStore.load(window.pdfViewer.fileId, file.name);
        updateDropZoneVisibility();
        if (currentMode === 'bilingual') {
          await window.pdfViewer.renderCurrentPage();
          await renderBilingualPage();
        }
      }
    };
    reader.readAsArrayBuffer(file);
  }

  // Load Sample PDF for Instant Testing
  btnLoadSample.addEventListener('click', async () => {
    createAndLoadSamplePDF();
  });

  // ------------------------------------------------------------------------
  // Mode Switcher (Quet chon <-> Song ngu)
  // ------------------------------------------------------------------------
  btnModeSelect.addEventListener('click', async () => {
    currentMode = 'select';
    btnModeSelect.classList.add('active');
    btnModeBilingual.classList.remove('active');
    btnModeSelect.setAttribute('aria-pressed', 'true');
    btnModeBilingual.setAttribute('aria-pressed', 'false');
    selectionView.classList.remove('hidden');
    bilingualView.classList.add('hidden');
    updateDropZoneVisibility();
    hideTooltip();
    window.pdfViewer.setActiveView('select');
    if (window.pdfViewer.pdfDoc || window.pdfViewer.docType === 'image') await window.pdfViewer.renderCurrentPage();
  });

  btnModeBilingual.addEventListener('click', async () => {
    currentMode = 'bilingual';
    btnModeBilingual.classList.add('active');
    btnModeSelect.classList.remove('active');
    btnModeBilingual.setAttribute('aria-pressed', 'true');
    btnModeSelect.setAttribute('aria-pressed', 'false');
    bilingualView.classList.remove('hidden');
    selectionView.classList.add('hidden');
    updateDropZoneVisibility();
    hideTooltip();
    window.pdfViewer.setActiveView('bilingual');
    if (window.pdfViewer.pdfDoc || window.pdfViewer.docType === 'image') {
      await window.pdfViewer.renderCurrentPage();
      await renderBilingualPage();
    }
  });

  // ------------------------------------------------------------------------
  // PDF Navigation & Zoom Handlers
  // ------------------------------------------------------------------------
  btnPrevPage.addEventListener('click', async () => {
    await window.pdfViewer.prevPage();
    if (currentMode === 'bilingual') await renderBilingualPage();
  });

  btnNextPage.addEventListener('click', async () => {
    await window.pdfViewer.nextPage();
    if (currentMode === 'bilingual') await renderBilingualPage();
  });

  pageNumInput.addEventListener('change', async (e) => {
    const val = parseInt(e.target.value, 10);
    if (Number.isNaN(val)) {
      e.target.value = window.pdfViewer.currentPage;
      return;
    }
    // goToPage da clamp + cap nhat o nhap (ban cu im lang giu so sai)
    await window.pdfViewer.goToPage(val);
    if (currentMode === 'bilingual') await renderBilingualPage();
  });

  btnZoomIn.addEventListener('click', () => window.pdfViewer.zoomIn());
  btnZoomOut.addEventListener('click', () => window.pdfViewer.zoomOut());

  // ------------------------------------------------------------------------
  // Selection Translate Logic (Floating Popover Tooltip)
  // ------------------------------------------------------------------------
  document.addEventListener('mouseup', handleTextSelection);

  async function handleTextSelection(e) {
    // Only in selection mode and if not clicking inside tooltip or controls
    if (currentMode !== 'select') return;
    if (tooltip.contains(e.target) || (e.target.closest && e.target.closest('.app-header'))) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const selectedText = selection.toString().trim();

    if (!selectedText || selectedText.length < 2) {
      // Delay closing to allow clicking inside tooltip
      setTimeout(() => {
        if (!tooltip.contains(document.activeElement)) {
          hideTooltip();
        }
      }, 200);
      return;
    }

    lastSelectedText = selectedText;
    const myId = ++tooltipRequestId;

    // Calculate position for Tooltip near mouse selection
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Tooltip nam trong body (position absolute) nhung PDF cuon trong div rieng:
    // dung rect + scroll cua window la gan dung cho view hien tai; gioi han trong man hinh.
    let top = rect.bottom + 8;
    let left = rect.left + (rect.width / 2) - 170; // Center 340px tooltip

    // Prevent off-screen positioning
    if (left < 10) left = 10;
    if (left + 350 > window.innerWidth) left = window.innerWidth - 360;
    if (top + 180 > window.innerHeight) top = Math.max(10, rect.top - 190);

    // Display Loading Tooltip
    tooltipOriginalText.textContent = selectedText;
    tooltipTranslatedText.innerHTML = '<span class="loading-spinner"><i class="fa-solid fa-circle-notch fa-spin"></i> Đang dịch...</span>';

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
    tooltip.classList.remove('hidden');

    // Call Translation API - chi ap dung neu van la request moi nhat
    try {
      const result = await translateWithGlossary(selectedText);
      const translation = result.vi;
      if (myId !== tooltipRequestId) return; // da co lua chon moi hon
      tooltipTranslatedText.textContent = translation;
      // Luu ca ban dich boi den (trang hien tai) de xuat sau nay
      if (window.pdfViewer.pdfDoc || window.pdfViewer.docType === 'image') {
        translationStore.set(selectedText, translation, window.pdfViewer.currentPage, 9000);
      }
    } catch (err) {
      if (myId !== tooltipRequestId) return;
      tooltipTranslatedText.textContent = '';
      const errDiv = document.createElement('div');
      errDiv.className = 'translation-error';
      errDiv.textContent = `Loi dich: ${err.message}. Boi den lai de thu.`;
      tooltipTranslatedText.appendChild(errDiv);
    }
  }

  function hideTooltip() {
    tooltipRequestId++; // huy request dang chay (ket qua cu se bi bo)
    tooltip.classList.add('hidden');
  }

  btnCloseTooltip.addEventListener('click', hideTooltip);

  btnSpeak.addEventListener('click', () => {
    if (lastSelectedText) window.translator.speak(lastSelectedText);
  });

  btnCopy.addEventListener('click', () => {
    const textToCopy = tooltipTranslatedText.textContent;
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy).catch(() => {});
      btnCopy.innerHTML = '<i class="fa-solid fa-check" style="color:#10b981"></i>';
      setTimeout(() => btnCopy.innerHTML = '<i class="fa-regular fa-copy"></i>', 1500);
    }
  });

  // ------------------------------------------------------------------------
  // Bilingual Mode Handler (Side-by-Side View)
  // ------------------------------------------------------------------------
  btnTranslateAll.addEventListener('click', async () => {
    await renderBilingualPage(true);
  });

  // ------------------------------------------------------------------------
  // U2: Dich het — dich lan luot moi trang, co tien do, tam dung/tiep tuc.
  // Dung lai hang doi dich hien co (toi da 4 request); doan da co trong
  // store/cache thi bo qua, khong dich lai. Loi 1 doan khong dung ca batch.
  // ------------------------------------------------------------------------
  const batch = { running: false, paused: false, stopped: false, resumeResolve: null };

  function updateBatchProgress(donePages, totalPages, doneSegs, failedSegs, extra = '') {
    if (!batchProgress) return;
    const pct = totalPages ? Math.round((donePages / totalPages) * 100) : 0;
    batchProgressFill.style.width = `${pct}%`;
    batchProgressText.textContent =
      `Đang dịch trang ${Math.min(donePages + 1, totalPages)}/${totalPages} — ${doneSegs} đoạn xong, ${failedSegs} đoạn lỗi${extra}`;
  }

  function waitForResume() {
    return new Promise(resolve => { batch.resumeResolve = resolve; });
  }

  async function translateWholeDoc() {
    if (batch.running) return;
    if (!window.pdfViewer.pdfDoc && window.pdfViewer.docType !== 'image') {
      alert('Chưa mở file nào.');
      return;
    }
    if (currentMode !== 'bilingual') {
      alert('Bấm sang chế độ Song ngữ trước rồi bấm “Dịch hết”.');
      return;
    }
    const totalPages = window.pdfViewer.totalPages || 1;
    batch.running = true;
    batch.paused = false;
    batch.stopped = false;
    batchProgress.classList.remove('hidden');
    btnBatchPause.textContent = 'Tạm dừng';
    btnBatchPause.classList.remove('hidden');
    btnBatchStop.textContent = 'Dừng hẳn';
    btnTranslateDoc.disabled = true;
    btnTranslateAll.disabled = true;

    let donePages = 0;
    let doneSegs = 0;
    let failedSegs = 0;
    try {
      for (let page = 1; page <= totalPages; page++) {
        if (batch.stopped) break;
        if (batch.paused) {
          batchProgressText.textContent = `Đã tạm dừng ở trang ${page}/${totalPages} — ${doneSegs} đoạn xong, ${failedSegs} đoạn lỗi. Bấm “Tiếp tục” để dịch tiếp.`;
          await waitForResume();
          if (batch.stopped) break;
          btnBatchPause.textContent = 'Tạm dừng';
        }
        updateBatchProgress(donePages, totalPages, doneSegs, failedSegs);
        await window.pdfViewer.goToPage(page);
        const { jobs, saved } = await renderBilingualPage();
        const results = await Promise.allSettled(jobs);
        doneSegs += saved + results.filter(r => r.status === 'fulfilled' && r.value && r.value.ok).length;
        failedSegs += results.filter(r => r.status === 'fulfilled' && r.value && !r.value.ok).length
          + results.filter(r => r.status === 'rejected').length;
        donePages = page;
        updateBatchProgress(donePages, totalPages, doneSegs, failedSegs);
      }
    } finally {
      batch.running = false;
      btnTranslateDoc.disabled = false;
      btnTranslateAll.disabled = false;
      // Ghi het ban dich xuong kho truoc khi bao xong (bang tien do doc tu kho)
      await translationStore.flushSave();
      if (batchProgressFill) batchProgressFill.style.width = totalPages ? `${Math.round((donePages / totalPages) * 100)}%` : '0%';
      if (batch.stopped) {
        batchProgressText.textContent = `Đã dừng ở trang ${donePages}/${totalPages} — ${doneSegs} đoạn xong, ${failedSegs} đoạn lỗi. Đoạn đã dịch vẫn lưu lại, bấm “Dịch hết” để dịch tiếp.`;
      } else {
        batchProgressText.textContent = `Xong: ${doneSegs} đoạn đã dịch, ${failedSegs} đoạn lỗi${failedSegs ? ' (bấm “Dịch trang này” ở trang có lỗi để thử lại)' : ''}.`;
      }
      btnBatchPause.classList.add('hidden');
      btnBatchStop.textContent = 'Đóng';
    }
  }

  if (btnTranslateDoc) btnTranslateDoc.addEventListener('click', translateWholeDoc);

  if (btnBatchPause) btnBatchPause.addEventListener('click', () => {
    if (!batch.running) return;
    if (batch.paused) {
      batch.paused = false;
      btnBatchPause.textContent = 'Tạm dừng';
      if (batch.resumeResolve) { const r = batch.resumeResolve; batch.resumeResolve = null; r(); }
    } else {
      batch.paused = true;
      btnBatchPause.textContent = 'Tiếp tục';
    }
  });

  if (btnBatchStop) btnBatchStop.addEventListener('click', () => {
    if (batch.running) {
      batch.stopped = true;
      if (batch.paused && batch.resumeResolve) {
        const r = batch.resumeResolve; batch.resumeResolve = null; r();
      }
    } else {
      batchProgress.classList.add('hidden');
    }
  });

  if (btnExportMd) btnExportMd.addEventListener('click', () => {
    if (!translationStore.allSorted().length) { alert('Chua co doan dich nao de xuat. Hay dich mot trang truoc.'); return; }
    downloadFile(`${exportBaseName()}-dich.md`, translationStore.toMarkdown(), 'text/markdown;charset=utf-8');
  });

  if (btnExportJson) btnExportJson.addEventListener('click', () => {
    if (!translationStore.allSorted().length) { alert('Chua co doan dich nao de xuat. Hay dich mot trang truoc.'); return; }
    downloadFile(`${exportBaseName()}-dich.json`, translationStore.toJSON(), 'application/json;charset=utf-8');
  });

  if (btnExportDocx) btnExportDocx.addEventListener('click', exportDocx);

  if (btnOcrPage) btnOcrPage.addEventListener('click', async () => {
    if (!window.pdfViewer.pdfDoc && window.pdfViewer.docType !== 'image') {
      alert('Chua mo file nao.');
      return;
    }
    if (window.pdfViewer.ocrRunning) return;
    btnOcrPage.disabled = true;
    const oldLabel = btnOcrPage.innerHTML;
    btnOcrPage.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Đang OCR…';
    translationPanel.innerHTML = '<div class="empty-translation-state"><i class="fa-solid fa-circle-notch fa-spin"></i><p id="ocrProgressText">Đang tải thư viện OCR…</p><div class="ocr-progress"><div class="ocr-progress-bar" id="ocrProgressBar" style="width:5%"></div></div><p class="ocr-progress-note">Lần đầu chạy OCR sẽ tải khoảng 15 MB về máy, cần mạng. Các lần sau nhanh hơn.</p></div>';
    window.pdfViewer.onOcrProgress = (pct, statusText) => {
      const bar = document.getElementById('ocrProgressBar');
      const txt = document.getElementById('ocrProgressText');
      if (bar) bar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
      if (txt) txt.textContent = statusText;
    };
    try {
      const paras = await window.pdfViewer.runOcrOnCurrentPage();
      // Hien khung OCR vua nhan duoc bang hieu ung scan (neu bat)
      if (scanFxOn && paras.length) {
        window.pdfViewer.playScan(paras).catch(() => {});
      }
      await renderBilingualPage();
    } catch (err) {
      translationPanel.innerHTML = `<div class="empty-translation-state"><i class="fa-solid fa-circle-exclamation"></i><p>${escapeHtml(err.message || 'OCR thất bại.')}</p><p>Bấm “Quét OCR trang này” để thử lại.</p></div>`;
    } finally {
      btnOcrPage.disabled = false;
      btnOcrPage.innerHTML = oldLabel;
      window.pdfViewer.onOcrProgress = null;
    }
  });

  // ------------------------------------------------------------------------
  // U8: Sua tay doan OCR — text goc thanh o sua, luu thi dich lai;
  // tach tai vi tri con tro; huy thi ve nhu cu.
  // ------------------------------------------------------------------------
  function enterOcrEditMode(card, oldText, pageNo, index) {
    const enDiv = card.querySelector('.card-en');
    if (!enDiv) return;
    enDiv.innerHTML = `
      <textarea class="ocr-edit-textarea" rows="3" aria-label="Sửa text gốc OCR">${escapeHtml(oldText)}</textarea>
      <div class="ocr-edit-actions">
        <button class="btn-ocr-save" type="button">💾 Lưu & dịch lại</button>
        <button class="btn-ocr-split" type="button" title="Tách đoạn tại vị trí con trỏ trong ô sửa">✂️ Tách tại con trỏ</button>
        <button class="btn-ocr-cancel" type="button">Hủy</button>
      </div>
      <p class="help-text">Đặt con trỏ vào chỗ muốn tách rồi bấm "Tách tại con trỏ" — hữu ích khi OCR gộp 2 dòng thành 1 đoạn.</p>`;
    const ta = enDiv.querySelector('.ocr-edit-textarea');
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);

    enDiv.querySelector('.btn-ocr-cancel').addEventListener('click', () => { renderBilingualPage(); });

    enDiv.querySelector('.btn-ocr-save').addEventListener('click', async () => {
      const newText = ta.value.trim().replace(/\s+/g, ' ');
      if (newText.length < 3) { alert('Text gốc sau khi sửa phải còn ít nhất 3 ký tự.'); return; }
      if (newText === oldText) { renderBilingualPage(); return; }
      const paras = window.pdfViewer.ocrParagraphs[pageNo];
      if (!paras || !paras[index]) { alert('Không tìm thấy đoạn OCR này nữa, thử tải lại trang.'); return; }
      await translationStore.remove(oldText);
      paras[index].text = newText;
      await renderBilingualPage();
    });

    enDiv.querySelector('.btn-ocr-split').addEventListener('click', async () => {
      const parts = window.OcrEdit.splitTextAtCursor(ta.value, ta.selectionStart);
      if (!parts) { alert('Đặt con trỏ vào giữa đoạn (cả 2 phía còn ít nhất 2 ký tự) rồi bấm Tách.'); return; }
      const paras = window.pdfViewer.ocrParagraphs[pageNo];
      if (!paras || !paras[index]) { alert('Không tìm thấy đoạn OCR này nữa, thử tải lại trang.'); return; }
      await translationStore.remove(oldText);
      const box = paras[index].box;
      paras.splice(index, 1,
        { text: parts[0], box },
        { text: parts[1], box });
      await renderBilingualPage();
    });
  }

  // U2: jobs dich cua trang hien tai (de batch await). renderBilingualPage
  // tra ve {jobs, saved} — cac cho goi cu khong dung gia tri tra ve nen khong doi hanh vi.
  let currentPageJobs = [];
  let currentPageSaved = 0;

  async function renderBilingualPage(forceRetranslate = false) {
    if (!window.pdfViewer.pdfDoc && window.pdfViewer.docType !== 'image') return { jobs: [], saved: 0 };
    currentPageJobs = [];
    currentPageSaved = 0;

    translationPanel.innerHTML = '<div class="empty-translation-state"><i class="fa-solid fa-circle-notch fa-spin"></i><p>Đang trích xuất & dịch toàn bộ trang...</p></div>';

    const currentPage = window.pdfViewer.currentPage;
    const parasWithBoxes = await window.pdfViewer.getPageTextBlocksWithBoxes(currentPage);
    const textBlocks = parasWithBoxes.map(p => p.text);
    // U8: nguon cua tung doan ('ocr' | 'pdf') — chi doan OCR moi co nut Sua/Tach/Gop
    const paraSources = parasWithBoxes.map(p => p.source || 'pdf');

    // v2-scan: vach quet + khung vung tren pane PDF trai, chay song song
    // voi viec dich ben phai (khong await, khong chan dich).
    if (scanFxOn && parasWithBoxes.length) {
      window.pdfViewer.playScan(parasWithBoxes).catch(() => {});
    }

    if (!textBlocks || textBlocks.length === 0) {
      const isImage = window.pdfViewer.docType === 'image';
      translationPanel.innerHTML = `<div class="empty-translation-state"><i class="fa-solid fa-circle-exclamation"></i><p>${isImage
        ? 'Ảnh này chưa quét OCR nên chưa có chữ để dịch.'
        : 'Trang này không có văn bản dạng text (có thể là PDF scan).'}</p><p>Bấm nút “Quét OCR trang này” ở trên để nhận dạng chữ rồi dịch.</p></div>`;
      return { jobs: [], saved: 0 };
    }

    translationPanel.innerHTML = ''; // Clear panel

    // Translate each paragraph block and append cards
    for (let i = 0; i < textBlocks.length; i++) {
      const textEN = textBlocks[i];
      if (!textEN || textEN.length < 3) continue;
      const isOcr = paraSources[i] === 'ocr';

      const saved = forceRetranslate ? null : translationStore.get(textEN);
      const card = document.createElement('div');
      card.className = 'bilingual-card' + (saved && saved.approved ? ' approved' : '');
      card.innerHTML = `
        <div class="card-en"><i class="fa-regular fa-bookmark"></i> ${escapeHtml(textEN)}</div>
        <div class="card-vi">${saved ? escapeHtml(saved.vi) : '<i class="fa-solid fa-circle-notch fa-spin"></i> Đang dịch...'}</div>
        <div class="card-actions">
          <button class="btn-approve" type="button">${saved && saved.approved ? '✅ Đã duyệt' : '⬜ Duyệt đoạn này'}</button>
          ${isOcr ? '<button class="btn-ocr-edit" type="button" title="Sửa text gốc OCR rồi dịch lại">✏️ Sửa text gốc</button>' : ''}
          ${isOcr && i < textBlocks.length - 1 ? '<button class="btn-ocr-merge" type="button" title="Gộp đoạn này với đoạn dưới">🔗 Gộp với đoạn dưới</button>' : ''}
        </div>
      `;
      translationPanel.appendChild(card);

      const viDiv = card.querySelector('.card-vi');
      const approveBtn = card.querySelector('.btn-approve');
      approveBtn.addEventListener('click', () => {
        const cur = translationStore.get(textEN);
        if (!cur || !cur.vi) { alert('Doan nay chua co ban dich, chua duyet duoc.'); return; }
        const next = !cur.approved;
        translationStore.setApproved(textEN, next);
        card.classList.toggle('approved', next);
        approveBtn.textContent = next ? '✅ Đã duyệt' : '⬜ Duyệt đoạn này';
      });

      // U8: sua tay / tach / gop doan OCR (chi doan OCR moi co nut)
      if (isOcr) {
        const editBtn = card.querySelector('.btn-ocr-edit');
        if (editBtn) editBtn.addEventListener('click', () => enterOcrEditMode(card, textEN, currentPage, i));
        const mergeBtn = card.querySelector('.btn-ocr-merge');
        if (mergeBtn) mergeBtn.addEventListener('click', async () => {
          const paras = window.pdfViewer.ocrParagraphs[currentPage];
          const next = paras && paras[i + 1];
          if (!next) { alert('Đây là đoạn cuối cùng, không còn đoạn dưới để gộp.'); return; }
          const merged = window.OcrEdit.mergeTexts(textEN, next.text);
          await translationStore.remove(textEN);
          await translationStore.remove(next.text);
          paras[i].text = merged;
          paras.splice(i + 1, 1);
          await renderBilingualPage();
        });
      }

      if (saved) { currentPageSaved++; continue; } // dung lai ban dich da luu, khong goi API

      // Async translate to render progressively - hang doi trong translator gioi han 4
      const job = translateWithGlossary(textEN).then(({ vi: transVI, applied, unapplied }) => {
        // Card co the da bien mat (nguoi dung sua/tach/gop doan trong luc
        // dich dang chay): bo qua ghi kho, khong de ban dich cu song lai.
        if (!translationPanel.contains(card)) return { ok: true };
        if (viDiv) viDiv.textContent = transVI;
        translationStore.set(textEN, transVI, currentPage, i);
        // U1: danh dau doan da ap thuat ngu / canh bao thuat ngu chua ap
        if (applied) {
          const badge = document.createElement('span');
          badge.className = 'glossary-badge';
          badge.textContent = 'Đã áp thuật ngữ';
          card.querySelector('.card-actions').appendChild(badge);
        }
        if (unapplied.length && viDiv) {
          const warn = document.createElement('div');
          warn.className = 'glossary-warn';
          warn.textContent = 'Chưa áp thuật ngữ: ' + unapplied.map(t => t.en).join(', ');
          viDiv.appendChild(warn);
        }
        return { ok: true };
      }).catch(err => {
        if (!translationPanel.contains(card)) return { ok: true };
        translationStore.setError(textEN, currentPage, i, err.message);
        if (viDiv) {
          viDiv.textContent = '';
          const errDiv = document.createElement('div');
          errDiv.className = 'translation-error';
          errDiv.textContent = `Loi dich: ${err.message}. Bam "Dich trang nay" de thu lai.`;
          viDiv.appendChild(errDiv);
        }
        return { ok: false };
      });
      currentPageJobs.push(job);
    }
    return { jobs: currentPageJobs, saved: currentPageSaved };
  }

  // Synchronized Scrolling Toggle
  btnToggleSync.addEventListener('click', () => {
    isSyncScroll = !isSyncScroll;
    btnToggleSync.classList.toggle('active', isSyncScroll);
    btnToggleSync.setAttribute('aria-pressed', String(isSyncScroll));
  });

  // Sync scroll left PDF container with right Translation panel
  bilingualPdfWrapper.addEventListener('scroll', () => {
    if (!isSyncScroll) return;
    const leftRange = bilingualPdfWrapper.scrollHeight - bilingualPdfWrapper.clientHeight;
    const rightRange = translationPanel.scrollHeight - translationPanel.clientHeight;
    if (leftRange <= 0 || rightRange <= 0) return; // chong chia 0 -> NaN (ban cu)
    const percentage = bilingualPdfWrapper.scrollTop / leftRange;
    translationPanel.scrollTop = percentage * rightRange;
  });

  // ------------------------------------------------------------------------
  // Settings Modal (Engine & Gemini Key)
  // ------------------------------------------------------------------------
  btnSettings.addEventListener('click', async () => {
    engineSelect.value = window.translator.engine;
    geminiApiKeyInput.value = window.translator.geminiApiKey;
    const modelInfo = document.getElementById('geminiModelInfo');
    if (modelInfo) modelInfo.textContent = `Model đang dùng: ${window.translator.geminiModel} (kiểm tra 24/11/2026 theo tài liệu Google)`;
    toggleGeminiKeyGroup();
    if (window.Glossary) { await window.Glossary.ready(); renderGlossaryList(); }
    settingsModal.classList.remove('hidden');
  });

  btnCloseModal.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
  });

  engineSelect.addEventListener('change', toggleGeminiKeyGroup);

  function toggleGeminiKeyGroup() {
    if (engineSelect.value === 'gemini') {
      geminiKeyGroup.classList.remove('hidden');
    } else {
      geminiKeyGroup.classList.add('hidden');
    }
  }

  btnSaveSettings.addEventListener('click', () => {
    window.translator.setEngine(engineSelect.value);
    window.translator.setGeminiApiKey(geminiApiKeyInput.value);
    settingsModal.classList.add('hidden');
    alert('Đã lưu cấu hình dịch thành công!');
  });

  // ------------------------------------------------------------------------
  // U6: Bang tien do theo file
  // ------------------------------------------------------------------------
  async function renderFileProgress() {
    if (!fileProgressList) return;
    await translationStore.flushSave();
    if (!window.PdfTransDB || !window.computeFileProgress) {
      fileProgressList.innerHTML = '<p class="glossary-empty">Không đọc được kho lưu trữ.</p>';
      return;
    }
    const [segments, meta] = await Promise.all([
      window.PdfTransDB.getAll(window.PdfTransDB.stores.segments),
      window.PdfTransDB.getAll(window.PdfTransDB.stores.meta)
    ]);
    const files = window.computeFileProgress(segments, meta);
    if (!files.length) {
      fileProgressList.innerHTML = '<p class="glossary-empty">Chưa có file nào được dịch. Mở 1 file PDF và dịch thử 1 trang.</p>';
      return;
    }
    fileProgressList.innerHTML = '';
    files.forEach(f => {
      const row = document.createElement('button');
      row.className = 'file-progress-row';
      row.type = 'button';
      const lastOpened = f.lastOpenedAt
        ? new Date(f.lastOpenedAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
        : '—';
      row.innerHTML = `
        <span class="file-progress-name">${escapeHtml(f.fileName || f.fileId)}</span>
        <span class="file-progress-bar"><span class="file-progress-fill" style="width:${f.percent}%"></span></span>
        <span class="file-progress-meta">Đã dịch ${f.translated}/${f.total} đoạn • Đã duyệt ${f.approved} • ${f.failed} lỗi • ${f.percent}% • Mở gần nhất: ${escapeHtml(lastOpened)}</span>`;
      row.addEventListener('click', () => {
        fileProgressModal.classList.add('hidden');
        // Trinh duyet khong cho mo file tu dong: hoi nguoi dung chon lai file do
        pdfFileInput.click();
      });
      fileProgressList.appendChild(row);
    });
  }

  if (btnFileProgress) btnFileProgress.addEventListener('click', async () => {
    await renderFileProgress();
    fileProgressModal.classList.remove('hidden');
  });

  if (btnCloseFileProgress) btnCloseFileProgress.addEventListener('click', () => {
    fileProgressModal.classList.add('hidden');
  });

  // ------------------------------------------------------------------------
  // U9: Tim & thay trong ban dich (toan bo file nay, moi trang)
  // ------------------------------------------------------------------------
  function updateFindReplaceCount() {
    const find = findInput.value;
    if (!find) {
      findReplaceCount.textContent = '';
      btnReplaceAll.disabled = true;
      return;
    }
    const m = window.OcrEdit.countFindMatches(Object.values(translationStore.segments), find);
    findReplaceCount.textContent = m.segments
      ? `Tìm thấy ${m.segments} đoạn, ${m.occurrences} chỗ chứa "${find}".`
      : `Không tìm thấy đoạn nào chứa "${find}".`;
    btnReplaceAll.disabled = m.segments === 0;
  }

  if (btnFindReplace) btnFindReplace.addEventListener('click', () => {
    findReplaceResult.textContent = '';
    updateFindReplaceCount();
    findReplaceModal.classList.remove('hidden');
    findInput.focus();
  });

  if (btnCloseFindReplace) btnCloseFindReplace.addEventListener('click', () => {
    findReplaceModal.classList.add('hidden');
  });

  if (findInput) findInput.addEventListener('input', () => {
    findReplaceResult.textContent = '';
    updateFindReplaceCount();
  });

  if (btnReplaceAll) btnReplaceAll.addEventListener('click', async () => {
    const find = findInput.value;
    const replace = replaceInput.value;
    if (!find) return;
    const res = window.OcrEdit.findReplaceInSegments(Object.values(translationStore.segments), find, replace);
    if (!res.changedSegments) { findReplaceResult.textContent = 'Không có đoạn nào thay đổi.'; return; }
    for (const seg of res.updated) translationStore.segments[segHash(seg.en)] = seg;
    await translationStore.flushSave();
    findReplaceResult.textContent = `Đã thay ${res.occurrences} chỗ trong ${res.changedSegments} đoạn. Các đoạn đã thay đã bỏ duyệt — nhớ duyệt lại.`;
    updateFindReplaceCount();
    if (currentMode === 'bilingual') await renderBilingualPage();
  });

  // ------------------------------------------------------------------------
  // Glossary UI trong modal Cai dat (U1)
  // ------------------------------------------------------------------------
  function renderGlossaryList() {
    if (!glossaryList || !window.Glossary) return;
    const terms = window.Glossary.terms;
    if (!terms.length) {
      glossaryList.innerHTML = '<p class="glossary-empty">Chưa có thuật ngữ nào. Thêm từ đầu tiên ở dưới.</p>';
      return;
    }
    glossaryList.innerHTML = '';
    terms.forEach(t => {
      const row = document.createElement('div');
      row.className = 'glossary-row';
      row.innerHTML = `<span class="glossary-term"><strong>${escapeHtml(t.en)}</strong> &rarr; ${escapeHtml(t.vi)}</span>`;
      const del = document.createElement('button');
      del.className = 'btn-icon-plain';
      del.type = 'button';
      del.title = 'Xóa thuật ngữ này';
      del.setAttribute('aria-label', `Xóa thuật ngữ ${t.en}`);
      del.innerHTML = '<i class="fa-solid fa-xmark"></i>';
      del.addEventListener('click', async () => {
        await window.Glossary.removeTerm(t.en);
        renderGlossaryList();
      });
      row.appendChild(del);
      glossaryList.appendChild(row);
    });
  }

  if (btnGlossaryAdd) btnGlossaryAdd.addEventListener('click', async () => {
    try {
      await window.Glossary.addTerm(glossaryEnInput.value, glossaryViInput.value);
      glossaryEnInput.value = '';
      glossaryViInput.value = '';
      renderGlossaryList();
      glossaryEnInput.focus();
    } catch (err) {
      alert(err.message || 'Không thêm được thuật ngữ.');
    }
  });

  if (btnGlossaryExport) btnGlossaryExport.addEventListener('click', () => {
    downloadFile('tu-dien-thuat-ngu.json', window.Glossary.toJSON(), 'application/json;charset=utf-8');
  });

  if (btnGlossaryImport) btnGlossaryImport.addEventListener('click', () => {
    glossaryFileInput.click();
  });

  if (glossaryFileInput) glossaryFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      await window.Glossary.fromJSON(text);
      renderGlossaryList();
      alert(`Đã nhập ${window.Glossary.terms.length} thuật ngữ.`);
    } catch (err) {
      alert(err.message || 'Không đọc được file từ điển.');
    }
  });

  // Helper
  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // ------------------------------------------------------------------------
  // Helper to Create Sample PDF via Canvas/DataURL for immediate test drive
  // ------------------------------------------------------------------------
  async function createAndLoadSamplePDF() {
    const samplePdfBase64 = `JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCA2MTIgNzkyXSAvQ29udGVudHMgNCAwIFIgL1Jlc291cmNlcyA8PCAvRm9udCA8PCAvRjEgNSAwIFIgPj4gPj4gPj4KZW5kb2JqCjQgMCBvYmoKPDwgL0xlbmd0aCA0MTIgPj4Kc3RyZWFtCkJUCi9GMSAyNCBUZgoxMDAgNzAwIFRkCihXZWxjb21lIHRvIFBERiBUcmFuc2xhdG9yIFRvb2wpIFRqCjAgLTQwIFRkCi9GMSAxMiBUZgooVGhpcyBpcyBhIHNhbXBsZSBFbmdsaXNoIFBERiBkb2N1bWVudCBkZXNpZ25lZCB0byB0ZXN0IHRoZSB0cmFuc2xhdGlvbiBmdW5jdGlvbnMuKSBUagowIC0yMCBUZAooWW91IGNhbiBzZWxlY3QgYW55IHRleHQgaGVyZSB0byBzZWUgaW5zdGFudCBWaWV0bmFtZXNlIHRyYW5zbGF0aW9uLikgVGoKMCAtMjAgVGQKKEJpbGluZ3VhbCBtb2RlIGFsbG93cyB5b3UgdG8gcmVhZCB0aGUgZW50aXJlIHBhZ2Ugc2lkZS1ieS1zaWRlLikgVGoKMCAtMjAgVGQKKEFydGlmaWNpYWwgaW50ZWxsaWdlbmNlIGlzIHRyYW5zZm9ybWluZyBob3cgd2UgbGVhcm4gYW5kIGNvbW11bmljYXRlLikgVGoKRVQKZW5kc3RyZWFtCmVuZG9iago1IDAgb2JqCjw8IC9UeXBlIC9Gb250IC9TdWJ0eXBlIC9UeXBlMSAvQmFzZUZvbnQgL0hlbHZldGljYSA+PgplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDE1IDAwMDAwIG4gCjAwMDAwMDAwNjQgMDAwMDAgbiAKMDAwMDAwMDEyMSAwMDAwMCBuIAowMDAwMDAwMjQ3IDAwMDAwIG4gCjAwMDAwMDA3MTAgMDAwMDAgbiAKdHJhaWxlcgo8PCAvU2l6ZSA2IC9Sb290IDEgMCBSID4+CnN0YXJ0eHJlZgo3ODAKJSVFT0Y=`;

    const binaryString = window.atob(samplePdfBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const success = await window.pdfViewer.loadDocument(bytes, 'sample.pdf');
    if (success) {
      await translationStore.load(window.pdfViewer.fileId, 'sample.pdf');
      updateDropZoneVisibility();
    }
  }
});
