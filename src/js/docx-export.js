/* ==========================================================================
   Xuat .docx (U4, spec 002) — ham thuan tuy, dung duoc ca o trinh duyet
   (qua window.docx) va o Node test (qua require docx / file IIFE vendor).
   - Kho A4 mac dinh cua thu vien docx; tieu de theo file + ngay xuat
   - Moi trang 1 muc Heading 2; doan chua duyet them "(chua duyet)"
   - Doan khong co ban dich (loi) thi bo qua, khong ghi vao file
   ========================================================================== */
(function (global) {
  'use strict';

  /**
   * @param {object} docxLib — thu vien docx ({Document, Packer, Paragraph, TextRun, HeadingLevel})
   * @param {object} opts — {fileName, exportedAt (Date|string), stats {total, approved}, segments [{en, vi, page, order, approved}]}
   * @returns {Document} — goi Packer.toBlob(doc) o trinh duyet / toBuffer(doc) o Node
   */
  function buildDocxDocument(docxLib, opts) {
    var Document = docxLib.Document;
    var Paragraph = docxLib.Paragraph;
    var TextRun = docxLib.TextRun;
    var HeadingLevel = docxLib.HeadingLevel;

    var fileName = opts.fileName || 'PDF';
    var exportedAt = opts.exportedAt instanceof Date
      ? opts.exportedAt.toLocaleString('vi-VN')
      : String(opts.exportedAt || new Date().toLocaleString('vi-VN'));
    var stats = opts.stats || { total: 0, approved: 0 };
    var segments = (opts.segments || []).filter(function (s) { return s && s.vi; });

    var children = [
      new Paragraph({ text: 'Bản dịch — ' + fileName, heading: HeadingLevel.TITLE }),
      new Paragraph({ text: 'Xuất từ PDF Translator, ' + exportedAt + '. Tổng ' + stats.total + ' đoạn, đã duyệt ' + stats.approved + '.' }),
      new Paragraph({ text: '' })
    ];
    var curPage = null;
    segments.forEach(function (seg) {
      if (seg.page !== curPage) {
        curPage = seg.page;
        children.push(new Paragraph({ text: 'Trang ' + curPage, heading: HeadingLevel.HEADING_2 }));
      }
      children.push(new Paragraph({
        children: [new TextRun(seg.vi + (seg.approved ? '' : ' (chưa duyệt)'))]
      }));
    });
    return new Document({ sections: [{ children: children }] });
  }

  global.buildDocxDocument = buildDocxDocument;
  if (typeof module !== 'undefined' && module.exports) module.exports = buildDocxDocument;
})(typeof window !== 'undefined' ? window : globalThis);
