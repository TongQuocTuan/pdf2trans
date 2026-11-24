/* ==========================================================================
   Translation Engine Module (Google Free Translate & Gemini AI API)
   v1-fixed:
   - Hang doi toi da 4 request cung luc (ban cu goi tat ca cung luc -> 429)
   - Chia doan dai > 3500 ky tu theo cau, timeout 15s, retry 2 lan
   - Loi TRA VE BANG throw, khong lan vao ban dich nhu chuoi "Khong the dich..."
   - Cache ben trong localStorage (gioi han 500 muc), khong chi RAM
   ========================================================================== */

// U7: model Gemini hien tai — chot 24/11/2026 theo tai lieu chinh thuc
// https://ai.google.dev/gemini-api/docs/models (trang doc crawled 24/11/2026):
// - gemini-1.5-flash: model cu, da thay bang dong 2.x/3.x
// - gemini-2.5-flash: deprecated, tu 01/12/2026 tu dong chuyen sang gemini-3.5-flash-lite
// - gemini-3.8-flash: badge "Stable", Flash day du the he truoc (khong phai ban Lite)
// Doi model chi can sua 1 cho nay; hien trong Cài đặt de Tống thấy.
const GEMINI_MODEL = 'gemini-3.8-flash';

class TranslationEngine {
  constructor() {
    this.cache = new Map();
    this.engine = localStorage.getItem('pdf_trans_engine') || 'google';
    this.geminiModel = GEMINI_MODEL;
    this.geminiApiKey = localStorage.getItem('pdf_trans_gemini_key') || '';
    // Hang doi
    this.maxConcurrent = 4;
    this.activeCount = 0;
    this.queue = [];
    this.maxChunkChars = 3500;
    this.timeoutMs = 15000;
    this.maxRetries = 2;
    this.maxCacheEntries = 500;
    this._loadPersistentCache();
  }

  setEngine(engine) {
    this.engine = engine;
    localStorage.setItem('pdf_trans_engine', engine);
  }

  setGeminiApiKey(key) {
    this.geminiApiKey = (key || '').trim();
    localStorage.setItem('pdf_trans_gemini_key', this.geminiApiKey);
  }

  /* ---- Cache ben (U3: IndexedDB, fallback localStorage) ---- */
  _cacheStorageKey() { return 'pdf_trans_cache_v1'; }

  // Nap cache: IndexedDB truoc; neu backend la bo nho (IDB bi chan) thi
  // doc localStorage cu. Tra ve promise, translate() await truoc khi dung cache.
  _loadPersistentCache() {
    this._cacheReady = (async () => {
      try {
        if (typeof window !== 'undefined' && window.PdfTransDB) {
          const rows = await window.PdfTransDB.getAll(window.PdfTransDB.stores.cache);
          for (const r of rows.slice(-this.maxCacheEntries)) {
            if (r && typeof r.key === 'string') this.cache.set(r.key, r.value);
          }
          if (rows.length) return;
        }
      } catch (e) { /* roi xuong localStorage */ }
      try {
        if (typeof localStorage === 'undefined') return;
        const raw = localStorage.getItem(this._cacheStorageKey());
        if (!raw) return;
        const entries = JSON.parse(raw);
        if (Array.isArray(entries)) {
          for (const [k, v] of entries.slice(-this.maxCacheEntries)) this.cache.set(k, v);
        }
      } catch (e) { /* cache hong thi bo, khong lam hong app */ }
    })();
    return this._cacheReady;
  }

  _savePersistentCache() {
    const entries = [...this.cache.entries()].slice(-this.maxCacheEntries);
    // Kho chinh: IndexedDB (fire-and-forget, khong chan dich)
    if (typeof window !== 'undefined' && window.PdfTransDB && this._cacheReady) {
      this._cacheReady.then(() => {
        const jobs = entries.map(([k, v]) =>
          window.PdfTransDB.put(window.PdfTransDB.stores.cache, { key: k, value: v }));
        return Promise.all(jobs);
      }).catch(() => {});
    }
    // Ban sao du phong: localStorage cu (best-effort)
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(this._cacheStorageKey(), JSON.stringify(entries));
    } catch (e) {
      // Het quota: xoa nua cu nhat roi thu lai mot lan
      try {
        const kept = entries.slice(-Math.floor(this.maxCacheEntries / 2));
        this.cache = new Map(kept);
        localStorage.setItem(this._cacheStorageKey(), JSON.stringify(kept));
      } catch (_e) { /* bo qua */ }
    }
  }

  _cachePut(key, value) {
    if (this.cache.size >= this.maxCacheEntries) {
      const oldest = this.cache.keys().next().value;
      this.cache.delete(oldest);
    }
    this.cache.set(key, value);
    this._savePersistentCache();
  }

  /* ---- Hang doi ---- */
  _enqueue(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this._pumpQueue();
    });
  }

  _pumpQueue() {
    while (this.activeCount < this.maxConcurrent && this.queue.length) {
      const { task, resolve, reject } = this.queue.shift();
      this.activeCount++;
      task()
        .then(resolve, reject)
        .finally(() => { this.activeCount--; this._pumpQueue(); });
    }
  }

  /* ---- Tien ich ---- */
  _fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    return fetch(url, { ...options, signal: controller.signal })
      .finally(() => clearTimeout(timer));
  }

  async _withRetry(fn, label) {
    let lastErr;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        if (attempt < this.maxRetries) {
          await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
        }
      }
    }
    throw new Error(`${label}: ${lastErr && lastErr.message ? lastErr.message : 'loi khong ro'}`);
  }

  // Chia van ban dai theo cau, moi chunk <= maxChunkChars
  _splitIntoChunks(text) {
    if (text.length <= this.maxChunkChars) return [text];
    const sentences = text.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) || [text];
    const chunks = [];
    let cur = '';
    for (const s of sentences) {
      if ((cur + s).length > this.maxChunkChars && cur) { chunks.push(cur.trim()); cur = s; }
      else cur += s;
    }
    if (cur.trim()) chunks.push(cur.trim());
    // Cau don qua dai: cat cung theo khoang trang
    const out = [];
    for (const c of chunks) {
      if (c.length <= this.maxChunkChars) { out.push(c); continue; }
      const words = c.split(' ');
      let w = '';
      for (const word of words) {
        if ((w + ' ' + word).length > this.maxChunkChars && w) { out.push(w.trim()); w = word; }
        else w = w ? w + ' ' + word : word;
      }
      if (w.trim()) out.push(w.trim());
    }
    return out;
  }

  /**
   * Translate text EN -> VI.
   * Thanh cong: tra ve chuoi tieng Viet.
   * That bai: throw Error (caller phai catch va hien trang thai loi rieng,
   * khong duoc hien loi nhu mot ban dich).
   */
  async translate(text) {
    const cleanText = (text || '').trim().replace(/\s+/g, ' ');
    if (!cleanText) return '';

    // Doi cache nap xong (IndexedDB) truoc khi kiem tra cache
    if (this._cacheReady) await this._cacheReady;

    const cacheKey = `${this.engine}:${cleanText}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

    const translation = await this._enqueue(async () => {
      const chunks = this._splitIntoChunks(cleanText);
      const parts = [];
      for (const chunk of chunks) {
        parts.push(await this._translateOneChunk(chunk));
      }
      return parts.join(' ');
    });

    if (translation) this._cachePut(cacheKey, translation);
    return translation;
  }

  async _translateOneChunk(cleanText) {
    // U7: chon thang MyMemory lam engine chinh (truoc day chi la fallback
    // sau Google). Luu y: MyMemory mien phi co han muc ngay, gap 429 thi
    // doi sang Google hoac Gemini trong Cai dat.
    if (this.engine === 'mymemory') {
      return await this.translateWithMyMemory(cleanText);
    }
    if (this.engine === 'gemini' && this.geminiApiKey) {
      try {
        return await this.translateWithGemini(cleanText);
      } catch (err) {
        console.error('Gemini Error, fallback Google:', err);
        // Fallback co chu dich, nhung neu Google cung loi thi throw
        return await this.translateWithGoogleFree(cleanText);
      }
    }
    return await this.translateWithGoogleFree(cleanText);
  }

  /**
   * Google Translate Free Unofficial Endpoint
   * Luu y: endpoint khong chinh thuc, co the bi gioi han toc do.
   * Throw khi that bai thay vi tra chuoi loi.
   */
  async translateWithGoogleFree(text) {
    return this._withRetry(async () => {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(text)}`;
      const response = await this._fetchWithTimeout(url);
      if (!response.ok) throw new Error(`Google Translate HTTP ${response.status}`);
      const data = await response.json();
      if (data && data[0]) return data[0].map(segment => segment[0]).join('');
      throw new Error('Google Translate tra ve rong');
    }, 'Google Translate').catch(async (err) => {
      console.error('Google Translate Error:', err);
      return this.translateWithMyMemory(text); // throw neu MyMemory cung loi
    });
  }

  /** Fallback MyMemory Free Translation API */
  async translateWithMyMemory(text) {
    return this._withRetry(async () => {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|vi`;
      const response = await this._fetchWithTimeout(url);
      if (!response.ok) throw new Error(`MyMemory HTTP ${response.status}`);
      const data = await response.json();
      const out = data.responseData && data.responseData.translatedText;
      if (!out || out === 'QUERY LENGTH LIMIT EXCEEDED') throw new Error('MyMemory loi / qua gioi han');
      return out;
    }, 'MyMemory');
  }

  /** Gemini AI Translation */
  async translateWithGemini(text) {
    return this._withRetry(async () => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.geminiModel}:generateContent`;
      const payload = {
        contents: [{
          parts: [{
            text: `Ban la tro ly dich thuat chuyen nghiep. Hay dich doan van ban Tieng Anh sau day sang Tieng Viet mot cach tu nhien, chuan xac theo ngu canh. Chi tra ve ket qua dich Tieng Viet, khong kem giai thich them:\n\n"${text}"`
          }]
        }]
      };
      // Key gui qua header thay vi query ?key= (ban cu lo key trong URL/log)
      const response = await this._fetchWithTimeout(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.geminiApiKey },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`Gemini HTTP ${response.status}`);
      const data = await response.json();
      const resultText = data.candidates && data.candidates[0] && data.candidates[0].content
        && data.candidates[0].content.parts && data.candidates[0].content.parts[0]
        && data.candidates[0].content.parts[0].text;
      if (!resultText) throw new Error('Gemini tra ve rong');
      return resultText.trim();
    }, 'Gemini');
  }

  /** Speech Synthesis (Doc Tieng Anh) */
  speak(text) {
    if (!('speechSynthesis' in window)) {
      alert('Trinh duyet khong ho tro phat am.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }
}

window.translator = new TranslationEngine();
