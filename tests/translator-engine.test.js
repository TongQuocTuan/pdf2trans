// U7 Engine Gemini + MyMemory — mock test (fetch gia lap, khong mang that)
// Chay: node tests/translator-engine.test.js
global.window = global;
global.localStorage = {
  _m: {},
  getItem(k) { return Object.prototype.hasOwnProperty.call(this._m, k) ? this._m[k] : null; },
  setItem(k, v) { this._m[k] = String(v); },
};

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exit(1); }
}

// fetch gia lap: ghi lai URL, tra ket qua theo host
const seenUrls = [];
global.fetch = async (url) => {
  seenUrls.push(String(url));
  if (String(url).includes('translate.googleapis.com')) {
    return { ok: true, json: async () => [[['Xin chào thế giới', 'Hello world', null, null]]] };
  }
  if (String(url).includes('mymemory.translated.net')) {
    return { ok: true, json: async () => ({ responseData: { translatedText: 'Xin chào từ MyMemory' } }) };
  }
  if (String(url).includes('generativelanguage.googleapis.com')) {
    return {
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'Xin chào từ Gemini' }] } }] }),
    };
  }
  throw new Error('fetch khong mong doi: ' + url);
};

const fs = require('fs');
const path = require('path');
eval(fs.readFileSync(path.join(__dirname, '..', 'src', 'js', 'translator.js'), 'utf8'));
const translator = window.translator;

(async () => {
  assert(translator.geminiModel === 'gemini-3.8-flash',
    'model Gemini phai la gemini-3.8-flash, duoc ' + translator.geminiModel);

  // Google (mac dinh)
  translator.setEngine('google');
  let out = await translator.translate('Hello world');
  assert(out === 'Xin chào thế giới', 'Google tra dung ban dich');
  assert(seenUrls.some(u => u.includes('translate.googleapis.com')), 'Google goi dung endpoint');

  // MyMemory lam engine chinh (U7)
  seenUrls.length = 0;
  translator.setEngine('mymemory');
  translator.cache.clear();
  out = await translator.translate('Hello world');
  assert(out === 'Xin chào từ MyMemory', 'MyMemory tra dung ban dich, duoc: ' + out);
  assert(seenUrls.some(u => u.includes('mymemory.translated.net')), 'MyMemory goi dung endpoint');
  assert(!seenUrls.some(u => u.includes('translate.googleapis.com')), 'MyMemory khong roi ve Google');

  // Gemini: URL phai chua model moi
  seenUrls.length = 0;
  translator.setEngine('gemini');
  translator.setGeminiApiKey('fake-key-cho-test');
  translator.cache.clear();
  out = await translator.translate('Hello world');
  assert(out === 'Xin chào từ Gemini', 'Gemini tra dung ban dich');
  assert(seenUrls.some(u => u.includes('generativelanguage.googleapis.com') && u.includes('gemini-3.8-flash')),
    'Gemini goi dung model 3.8-flash: ' + seenUrls.join(' | '));

  // Gemini khong co key -> roi ve Google (hanh vi cu giu nguyen)
  seenUrls.length = 0;
  translator.setGeminiApiKey('');
  translator.cache.clear();
  out = await translator.translate('Hello world');
  assert(out === 'Xin chào thế giới', 'Gemini khong key roi ve Google');
  assert(seenUrls.some(u => u.includes('translate.googleapis.com')), 'fallback Google khi thieu key');

  console.log('translator-engine.test.js PASS');
})();
