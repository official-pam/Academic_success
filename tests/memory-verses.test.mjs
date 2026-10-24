import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

// Load lib/memory-verses.js without a bundler: inline parseDay and strip ESM syntax.
const dates = 'function parseDay(day){const [y,m,d]=day.split("-").map(Number);return new Date(Date.UTC(y,m-1,d,12));}';
const strip = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
  .replace(/^import .*$/gm, '')
  .replace(/export (const|function)/g, '$1');
const src = `${strip('../lib/verse-text.js')}\n${strip('../lib/memory-verses.js')}`;
const ctx = vm.createContext({});
vm.runInContext(`${dates}\n${src}\nthis.api = { VERSES, verseIndexFor, describeVerse, verseFor };`, ctx);
const { VERSES, verseIndexFor, describeVerse, verseFor } = ctx.api;

test('one unique, well-formed reference for every day of a leap year', () => {
  assert.equal(VERSES.length, 366);
  assert.equal(new Set(VERSES).size, 366);
  for (const ref of VERSES) assert.match(ref, /^[0-9A-Z]{3} \d{1,3}:\d{1,3}(-\d{1,3})?$/, ref);
});

test('rotation follows the Lagos calendar day', () => {
  assert.equal(verseIndexFor('2026-01-01'), 0);
  assert.equal(verseIndexFor('2026-12-31'), 364);
  assert.equal(verseIndexFor('2028-12-31'), 365);
  assert.notEqual(verseFor('2026-10-24').ref, verseFor('2026-10-25').ref);
});

test('every verse shows its reference and full WEB text, with no outbound links', () => {
  for (const ref of VERSES) {
    const v = describeVerse(ref);
    assert.ok(v.label && !v.label.startsWith('undefined'), ref);
    assert.ok(v.text.length > 10, `text for ${ref}`);
    assert.equal(v.version, 'WEB');
    assert.equal(v.nkjv, undefined);
    const open = (v.text.match(/“/g) || []).length, close = (v.text.match(/”/g) || []).length;
    assert.equal(open, close, `balanced quotes in ${ref}`);
  }
  assert.equal(describeVerse('PHP 4:6-7').label, 'Philippians 4:6–7');
  assert.equal(describeVerse('PHP 4:13').text, 'I can do all things through Christ, who strengthens me.');
});
