/* ==========================================================================
   Main Application Controller & Event Listeners
   v1-fixed:
   - Luu ban dich theo file (localStorage, khoa = fingerprint PDF): doi trang /
     tat tab mo lai van con, co nut Duyet tung doan + Xuat .md / .json
   - Tooltip chong race bang request-id; loi dich hien rieng, khong lan vao ban dich
   - Chi render view dang mo (qua pdfViewer.setActiveView)
   - O so trang co clamp; dong bo cuon chong chia 0; escapeHtml day du
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
  const settingsModal = document.getElementById('settingsModal');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const btnSaveSettings = document.getElementById('btnSaveSettings');
  const engineSelect = document.getElementById('engineSelect');
  const geminiKeyGroup = document.getElementById('geminiKeyGroup');
  const geminiApiKeyInput = document.getElementById('geminiApiKey');

  // Bilingual Elements
  const translationPanel = document.getElementById('translationPanel');
  const btnTranslateAll = document.getElementById('btnTranslateAll');
  const btnToggleSync = document.getElementById('btnToggleSync');
  const bilingualPdfWrapper = document.getElementById('bilingualPdfWrapper');
  const btnExportMd = document.getElementById('btnExportMd');
  const btnExportJson = document.getElementById('btnExportJson');

  let currentMode = 'select'; // 'select' or 'bilingual'
  let isSyncScroll = true;
  let lastSelectedText = '';
  let tooltipRequestId = 0;

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
    segments: {}, // segHash -> {en, vi, page, order, approved, updatedAt}
    _saveTimer: null,
    load(fileId, fileName) {
      this.fileId = fileId;
      this.fileName = fileName || '';
      this.segments = {};
      if (!fileId) return;
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
      this._saveTimer = setTimeout(() => {
        try {
          localStorage.setItem(`pdf_trans_store_v1:${this.fileId}`, JSON.stringify({
            fileName: this.fileName,
            savedAt: new Date().toISOString(),
            segments: this.segments
          }));
        } catch (e) {
          alert('Khong luu duoc ban dich: bo nho trinh duyet day. Hay xuat file .md/.json ngay.');
        }
      }, 300);
    },
    get(en) { return this.segments[segHash(en)] || null; },
    set(en, vi, page, order) {
      this.segments[segHash(en)] = {
        en, vi, page, order,
        approved: (this.segments[segHash(en)] || {}).approved || false,
        updatedAt: new Date().toISOString()
      };
      this.save();
    },
    setApproved(en, approved) {
      const s = this.segments[segHash(en)];
      if (s) { s.approved = !!approved; this.save(); }
    },
    allSorted() {
      return Object.values(this.segments)
        .sort((a, b) => (a.page - b.page) || (a.order - b.order));
    },
    stats() {
      const all = this.allSorted();
      return { total: all.length, approved: all.filter(s => s.approved).length };
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

  function downloadFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportBaseName() {
    const name = (translationStore.fileName || 'ban-dich').replace(/\.pdf$/i, '');
    return name.replace(/[\\/:*?"<>|]/g, '-');
  }

  // Show initial DropZone state
  dropZone.classList.remove('hidden');
  if (window.pdfViewer) window.pdfViewer.setActiveView('select');

  // ------------------------------------------------------------------------
  // File Upload & PDF Loading
  // ------------------------------------------------------------------------
  pdfFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    // Reset de mo lai cung file van chay (ban cu khong reset)
    e.target.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
      alert('Chi ho tro file PDF.');
      return;
    }
    await loadPDFFile(file);
  });

  // Drag & Drop
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', async (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
        await loadPDFFile(file);
      } else {
        alert('Chi ho tro file PDF.');
      }
    }
  });

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
        translationStore.load(window.pdfViewer.fileId, file.name);
        dropZone.classList.add('hidden');
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
    selectionView.classList.remove('hidden');
    bilingualView.classList.add('hidden');
    hideTooltip();
    window.pdfViewer.setActiveView('select');
    if (window.pdfViewer.pdfDoc) await window.pdfViewer.renderCurrentPage();
  });

  btnModeBilingual.addEventListener('click', async () => {
    currentMode = 'bilingual';
    btnModeBilingual.classList.add('active');
    btnModeSelect.classList.remove('active');
    bilingualView.classList.remove('hidden');
    selectionView.classList.add('hidden');
    hideTooltip();
    window.pdfViewer.setActiveView('bilingual');
    if (window.pdfViewer.pdfDoc) {
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
      const translation = await window.translator.translate(selectedText);
      if (myId !== tooltipRequestId) return; // da co lua chon moi hon
      tooltipTranslatedText.textContent = translation;
      // Luu ca ban dich boi den (trang hien tai) de xuat sau nay
      if (window.pdfViewer.pdfDoc) {
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

  if (btnExportMd) btnExportMd.addEventListener('click', () => {
    if (!translationStore.allSorted().length) { alert('Chua co doan dich nao de xuat. Hay dich mot trang truoc.'); return; }
    downloadFile(`${exportBaseName()}-dich.md`, translationStore.toMarkdown(), 'text/markdown;charset=utf-8');
  });

  if (btnExportJson) btnExportJson.addEventListener('click', () => {
    if (!translationStore.allSorted().length) { alert('Chua co doan dich nao de xuat. Hay dich mot trang truoc.'); return; }
    downloadFile(`${exportBaseName()}-dich.json`, translationStore.toJSON(), 'application/json;charset=utf-8');
  });

  async function renderBilingualPage(forceRetranslate = false) {
    if (!window.pdfViewer.pdfDoc) return;

    translationPanel.innerHTML = '<div class="empty-translation-state"><i class="fa-solid fa-circle-notch fa-spin"></i><p>Đang trích xuất & dịch toàn bộ trang...</p></div>';

    const currentPage = window.pdfViewer.currentPage;
    const textBlocks = await window.pdfViewer.getPageTextBlocks(currentPage);

    if (!textBlocks || textBlocks.length === 0) {
      translationPanel.innerHTML = '<div class="empty-translation-state"><i class="fa-solid fa-circle-exclamation"></i><p>Không tìm thấy văn bản dạng text trên trang này.</p></div>';
      return;
    }

    translationPanel.innerHTML = ''; // Clear panel

    // Translate each paragraph block and append cards
    for (let i = 0; i < textBlocks.length; i++) {
      const textEN = textBlocks[i];
      if (!textEN || textEN.length < 3) continue;

      const saved = forceRetranslate ? null : translationStore.get(textEN);
      const card = document.createElement('div');
      card.className = 'bilingual-card' + (saved && saved.approved ? ' approved' : '');
      card.innerHTML = `
        <div class="card-en"><i class="fa-regular fa-bookmark"></i> ${escapeHtml(textEN)}</div>
        <div class="card-vi">${saved ? escapeHtml(saved.vi) : '<i class="fa-solid fa-circle-notch fa-spin"></i> Đang dịch...'}</div>
        <div class="card-actions">
          <button class="btn-approve" type="button">${saved && saved.approved ? '✅ Đã duyệt' : '⬜ Duyệt đoạn này'}</button>
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

      if (saved) continue; // dung lai ban dich da luu, khong goi API

      // Async translate to render progressively - hang doi trong translator gioi han 4
      window.translator.translate(textEN).then(transVI => {
        if (viDiv) viDiv.textContent = transVI;
        translationStore.set(textEN, transVI, currentPage, i);
      }).catch(err => {
        if (viDiv) {
          viDiv.textContent = '';
          const errDiv = document.createElement('div');
          errDiv.className = 'translation-error';
          errDiv.textContent = `Loi dich: ${err.message}. Bam "Dich trang nay" de thu lai.`;
          viDiv.appendChild(errDiv);
        }
      });
    }
  }

  // Synchronized Scrolling Toggle
  btnToggleSync.addEventListener('click', () => {
    isSyncScroll = !isSyncScroll;
    btnToggleSync.classList.toggle('active', isSyncScroll);
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
  btnSettings.addEventListener('click', () => {
    engineSelect.value = window.translator.engine;
    geminiApiKeyInput.value = window.translator.geminiApiKey;
    toggleGeminiKeyGroup();
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
    const samplePdfBase64 = `JVBERi0xLjQKJcOkw7zDtsOfCjEgMCBvYmoKPDwvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iaiA8PC9UeXBlIC9QYWdlcyAvQ291bnQgMSAvS2lkcyBbMyAwIFJdID4+CmVuZG9iagozIDAgb2JqIDw8L1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCA2MTIgNzkyXSAvQ29udGVudHMgNCAwIFIgL1Jlc291cmNlcyA8PC9Gb250IDw8L0YxIDUgMCBSID4+Pj4+CmVuZG9iago0IDAgb2JqIDw8L0xlbmd0aCAyOTkgPj4Kc3RyZWFtCkJUCi9GMSAyNCBUZgoxMDAgNzAwIFRkCihXZWxjb21lIHRvIFBERiBUcmFuc2xhdG9yIFRvb2wpIFRqCjAgLTQwIFRkCi9GMSAxMiBUZgooVGhpcyBpcyBhIHNhbXBsZSBFbmdsaXNoIFBERiBkb2N1bWVudCBkZXNpZ25lZCB0byB0ZXN0IHRoZSB0cmFuc2xhdGlvbiBmdW5jdGlvbnMuKSBUagowIC0yMCBUZgooWW91IGNhbiBzZWxlY3QgYW55IHRleHQgaGVyZSB0byBzZWUgaW5zdGFudCBWaWV0bmFtZXNlIHRyYW5zbGF0aW9uLikgVGoKMCAtMjAgVGRDKEJpbGluZ3VhbCBtb2RlIGFsbG93cyB5b3UgdG8gcmVhZCB0aGUgZW50aXJlIHBhZ2Ugc2lkZS1ieS1zaWRlLikgVGoKMCAtMjAgVGRDKEFydGlmaWNpYWwgaW50ZWxsaWdlbmNlIGlzIHRyYW5zZm9ybWluZyBob3cgd2UgbGVhcm4gYW5kIGNvbW11bmljYXRlLikgVGoKRVQKZW5kc3RyZWFtCmVuZG9iago1IDAgb2JqIDw8L1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhID4+CmVuZG9iagp0cmFpbGVyIDw8L1Jvb3QgMSAwIFIgPj4KJSVFT0Y=`;

    const binaryString = window.atob(samplePdfBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const success = await window.pdfViewer.loadDocument(bytes, 'sample.pdf');
    if (success) {
      translationStore.load(window.pdfViewer.fileId, 'sample.pdf');
      dropZone.classList.add('hidden');
    }
  }
});
