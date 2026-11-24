/* ==========================================================================
   Sua tay OCR + Tim & thay (U8/U9, spec 002) — ham thuan tuy, test duoc
   bang Node. Khong cham DOM, khong cham IndexedDB.
   ========================================================================== */
(function (global) {
  'use strict';

  function escapeRegExp(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // U8: tach text tai vi tri con tro trong o sua. Tra ve [truoc, sau]
  // (da trim); tra null neu 1 trong 2 ben ngan hon 2 ky tu.
  function splitTextAtCursor(text, pos) {
    if (typeof text !== 'string') return null;
    var p = Math.max(0, Math.min(pos || 0, text.length));
    var a = text.slice(0, p).trim();
    var b = text.slice(p).trim();
    if (a.length < 2 || b.length < 2) return null;
    return [a, b];
  }

  // U8: gop 2 doan thanh 1 (noi bang 1 khoang trang, gon khoang trang thua).
  function mergeTexts(a, b) {
    return ((a || '') + ' ' + (b || '')).replace(/\s+/g, ' ').trim();
  }

  // U9: dem so doan va so cho xuat hien cua find trong ban dich (vi),
  // khong phan biet hoa/thuong. segments: [{en, vi, approved, ...}].
  function countFindMatches(segments, find) {
    if (!find) return { segments: 0, occurrences: 0 };
    var re = new RegExp(escapeRegExp(find), 'gi');
    var segs = 0, occ = 0;
    (segments || []).forEach(function (s) {
      if (!s || !s.vi) return;
      var m = s.vi.match(re);
      if (m) { segs++; occ += m.length; }
    });
    return { segments: segs, occurrences: occ };
  }

  // U9: thay tat ca find -> replace trong vi cua moi doan. Doan bi thay
  // thi approved=false (can duyet lai). Tra ve
  // {changedSegments, occurrences, updated} — updated la mang moi, doan
  // khong doi giu nguyen object cu, doan doi la object moi.
  function findReplaceInSegments(segments, find, replace) {
    if (!find) return { changedSegments: 0, occurrences: 0, updated: segments };
    var re = new RegExp(escapeRegExp(find), 'gi');
    var changed = 0, occ = 0;
    var updated = (segments || []).map(function (s) {
      if (!s || !s.vi) return s;
      var m = s.vi.match(re);
      if (!m) return s;
      occ += m.length;
      changed++;
      var out = Object.assign({}, s);
      // Dung replacer function de '$' trong chuoi thay khong bi hieu
      // la ky hieu dac biet ($&, $1...) cua String.replace.
      out.vi = s.vi.replace(re, function () { return replace; });
      out.approved = false;
      return out;
    });
    return { changedSegments: changed, occurrences: occ, updated: updated };
  }

  var api = {
    escapeRegExp: escapeRegExp,
    splitTextAtCursor: splitTextAtCursor,
    mergeTexts: mergeTexts,
    countFindMatches: countFindMatches,
    findReplaceInSegments: findReplaceInSegments
  };
  global.OcrEdit = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
