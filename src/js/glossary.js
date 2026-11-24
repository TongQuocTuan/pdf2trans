/* ==========================================================================
   Tu dien thuat ngu (U1, spec 002)
   - 1 sach = 1 bang: id `glossary:kim-chi-nam` (sach dang dich)
   - Luu IndexedDB (store glossaries), du phong localStorage
   - Ap dung: thay thuat ngu trong cau goc bang placeholder truoc khi dich,
     dich xong tra lai tu da chot. Khop theo ranh gioi tu, tu dai truoc.
   ========================================================================== */
(function (global) {
  'use strict';

  var BOOK_ID = 'kim-chi-nam';
  var GLOSSARY_ID = 'glossary:' + BOOK_ID;
  var LS_KEY = 'pdf_trans_glossary_v1';
  // Placeholder: \u0001 + so thu tu + \u0002 (ky tu dieu khien, engine dich
  // thuong giu nguyen; neu engine lam mat thi restore se giu ban dich goc)
  var PH_OPEN = '\u0001';
  var PH_CLOSE = '\u0002';

  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  var Glossary = {
    bookId: BOOK_ID,
    terms: [], // [{en, vi, note}]
    version: 0,
    _ready: null,

    ready: function () {
      if (!this._ready) this._ready = this.load();
      return this._ready;
    },

    load: async function () {
      this.terms = [];
      try {
        if (global.PdfTransDB) {
          var row = await global.PdfTransDB.get(global.PdfTransDB.stores.glossaries, GLOSSARY_ID);
          if (row && Array.isArray(row.terms)) {
            this.terms = row.terms.filter(function (t) { return t && t.en && t.vi; });
            this.version = row.version || 0;
            return this.terms;
          }
        }
      } catch (e) { /* roi xuong localStorage */ }
      try {
        if (typeof global.localStorage !== 'undefined') {
          var raw = global.localStorage.getItem(LS_KEY);
          if (raw) {
            var data = JSON.parse(raw);
            if (data && Array.isArray(data.terms)) {
              this.terms = data.terms.filter(function (t) { return t && t.en && t.vi; });
              this.version = data.version || 0;
            }
          }
        }
      } catch (e) { this.terms = []; }
      return this.terms;
    },

    save: async function () {
      this.version++;
      var data = { id: GLOSSARY_ID, bookId: BOOK_ID, terms: this.terms, version: this.version, updatedAt: Date.now() };
      try {
        if (global.PdfTransDB) {
          await global.PdfTransDB.put(global.PdfTransDB.stores.glossaries, data);
        }
      } catch (e) { /* IDB loi thi con ban sao localStorage */ }
      try {
        if (typeof global.localStorage !== 'undefined') {
          global.localStorage.setItem(LS_KEY, JSON.stringify(data));
        }
      } catch (e) { /* het quota thi thoi */ }
      return data;
    },

    addTerm: function (en, vi, note) {
      en = (en || '').trim();
      vi = (vi || '').trim();
      if (!en || !vi) throw new Error('Thieu tu tieng Anh hoac tieng Viet.');
      var key = en.toLowerCase();
      var found = this.terms.find(function (t) { return t.en.toLowerCase() === key; });
      if (found) { found.vi = vi; found.note = note || ''; }
      else this.terms.push({ en: en, vi: vi, note: note || '' });
      this.terms.sort(function (a, b) { return a.en.localeCompare(b.en); });
      return this.save();
    },

    removeTerm: function (en) {
      var key = (en || '').trim().toLowerCase();
      this.terms = this.terms.filter(function (t) { return t.en.toLowerCase() !== key; });
      return this.save();
    },

    /**
     * Thay thuat ngu trong text bang placeholder.
     * Tra ve {text, map} — map: index -> {en, vi}. Khop dai truoc,
     * chi khop tron tu (ky tu ke ben khong phai chu/so/gach duoi).
     */
    applyToText: function (text) {
      var map = [];
      if (!text || !this.terms.length) return { text: text, map: map };
      var sorted = this.terms.slice().sort(function (a, b) { return b.en.length - a.en.length; });
      var pattern = sorted.map(function (t) { return escapeRegExp(t.en); }).join('|');
      var re = new RegExp('(^|[^A-Za-z0-9_])(' + pattern + ')(?![A-Za-z0-9_])', 'gi');
      var out = text.replace(re, function (match, pre, term) {
        var found = sorted.find(function (t) { return t.en.toLowerCase() === term.toLowerCase(); });
        if (!found) return match;
        var idx = map.length;
        map.push({ en: found.en, vi: found.vi });
        return pre + PH_OPEN + idx + PH_CLOSE;
      });
      return { text: out, map: map };
    },

    restorePlaceholders: function (text, map) {
      if (!text || !map || !map.length) return text;
      return text.replace(new RegExp(PH_OPEN + '(\\d+)' + PH_CLOSE, 'g'), function (m, idx) {
        var entry = map[Number(idx)];
        return entry ? entry.vi : m;
      });
    },

    /** Thuật ngữ có trong câu gốc mà bản dịch không dùng từ đã chốt. */
    findUnapplied: function (enText, viText) {
      if (!enText || !viText || !this.terms.length) return [];
      var out = [];
      this.terms.forEach(function (t) {
        var re = new RegExp('(^|[^A-Za-z0-9_])' + escapeRegExp(t.en) + '(?![A-Za-z0-9_])', 'i');
        // So sanh khong phan biet hoa/thuong: ban dich hay viet hoa dau cau
        if (re.test(enText) && viText.toLowerCase().indexOf(t.vi.toLowerCase()) === -1) out.push(t);
      });
      return out;
    },

    toJSON: function () {
      return JSON.stringify({ bookId: BOOK_ID, updatedAt: Date.now(), terms: this.terms }, null, 2);
    },

    /** Doc file .json nhap vao; sai dinh dang thi throw, khong nhap nua chung. */
    fromJSON: function (text) {
      var data;
      try { data = JSON.parse(text); } catch (e) { throw new Error('File từ điển không đúng định dạng (không phải JSON).'); }
      if (!data || !Array.isArray(data.terms)) {
        throw new Error('File từ điển không đúng định dạng (thiếu mảng terms).');
      }
      var terms = [];
      data.terms.forEach(function (t, i) {
        if (!t || typeof t.en !== 'string' || typeof t.vi !== 'string' || !t.en.trim() || !t.vi.trim()) {
          throw new Error('File từ điển không đúng định dạng (term thứ ' + (i + 1) + ' thiếu en/vi).');
        }
        terms.push({ en: t.en.trim(), vi: t.vi.trim(), note: (t.note || '').trim() });
      });
      this.terms = terms;
      this.terms.sort(function (a, b) { return a.en.localeCompare(b.en); });
      return this.save();
    }
  };

  global.Glossary = Glossary;
  if (typeof module !== 'undefined' && module.exports) module.exports = Glossary;
})(typeof window !== 'undefined' ? window : globalThis);
