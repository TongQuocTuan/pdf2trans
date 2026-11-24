/* ==========================================================================
   Bang tien do theo file (U6, spec 002) — ham thuan tuy, test duoc bang Node.
   - segmentRows: ban ghi store `segments` (fileId, fileName, vi, status,
     approved, updatedAt)
   - metaRows: ban ghi store `meta` co key `file:<fileId>` ->
     {fileName, lastOpenedAt} (ghi moi lan mo file)
   - Tra ve mang sap theo mo gan nhat: {fileId, fileName, total, translated,
     approved, failed, percent (= approved/total), lastOpenedAt}
   ========================================================================== */
(function (global) {
  'use strict';

  function computeFileProgress(segmentRows, metaRows) {
    var byId = new Map();
    (metaRows || []).forEach(function (m) {
      if (!m || typeof m.key !== 'string' || m.key.indexOf('file:') !== 0) return;
      var fileId = m.key.slice(5);
      var v = m.value || {};
      byId.set(fileId, {
        fileId: fileId,
        fileName: v.fileName || '',
        total: 0, translated: 0, approved: 0, failed: 0,
        lastOpenedAt: v.lastOpenedAt || 0
      });
    });
    (segmentRows || []).forEach(function (r) {
      if (!r || !r.fileId) return;
      var f = byId.get(r.fileId);
      if (!f) {
        f = {
          fileId: r.fileId, fileName: r.fileName || '',
          total: 0, translated: 0, approved: 0, failed: 0, lastOpenedAt: 0
        };
        byId.set(r.fileId, f);
      }
      if (!f.fileName && r.fileName) f.fileName = r.fileName;
      f.total++;
      if (r.status === 'done' || (r.vi && r.status !== 'error')) f.translated++;
      if (r.approved) f.approved++;
      if (r.status === 'error') f.failed++;
      if (r.updatedAt) {
        var t = Date.parse(r.updatedAt);
        if (!isNaN(t) && t > f.lastOpenedAt) f.lastOpenedAt = t;
      }
    });
    var out = Array.from(byId.values()).map(function (f) {
      f.percent = f.total ? Math.round((f.approved / f.total) * 100) : 0;
      return f;
    });
    out.sort(function (a, b) {
      return (b.lastOpenedAt - a.lastOpenedAt) || String(a.fileName).localeCompare(String(b.fileName));
    });
    return out;
  }

  global.computeFileProgress = computeFileProgress;
  if (typeof module !== 'undefined' && module.exports) module.exports = computeFileProgress;
})(typeof window !== 'undefined' ? window : globalThis);
