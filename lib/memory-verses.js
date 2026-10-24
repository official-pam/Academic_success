// Daily memory verses: a built-in rotating list of 365 references.
// Only references are stored. NKJV and NIV text is copyrighted, so members read the verse on Bible.com
// in their chosen translation. Day 1 is 1 January (Africa/Lagos); 31 December in a leap year repeats day 365.

import { parseDay } from '@/lib/dates';

// USFM book codes used by Bible.com, with display names.
const BOOKS = {
  GEN: 'Genesis', EXO: 'Exodus', LEV: 'Leviticus', NUM: 'Numbers', DEU: 'Deuteronomy', JOS: 'Joshua', JDG: 'Judges', RUT: 'Ruth',
  '1SA': '1 Samuel', '2SA': '2 Samuel', '1KI': '1 Kings', '2KI': '2 Kings', '1CH': '1 Chronicles', '2CH': '2 Chronicles', NEH: 'Nehemiah',
  JOB: 'Job', PSA: 'Psalm', PRO: 'Proverbs', ECC: 'Ecclesiastes', ISA: 'Isaiah', JER: 'Jeremiah', LAM: 'Lamentations', EZK: 'Ezekiel',
  DAN: 'Daniel', HOS: 'Hosea', JOL: 'Joel', MIC: 'Micah', NAM: 'Nahum', HAB: 'Habakkuk', ZEP: 'Zephaniah', HAG: 'Haggai', ZEC: 'Zechariah', MAL: 'Malachi',
  MAT: 'Matthew', MRK: 'Mark', LUK: 'Luke', JHN: 'John', ACT: 'Acts', ROM: 'Romans', '1CO': '1 Corinthians', '2CO': '2 Corinthians',
  GAL: 'Galatians', EPH: 'Ephesians', PHP: 'Philippians', COL: 'Colossians', '1TH': '1 Thessalonians', '2TH': '2 Thessalonians',
  '1TI': '1 Timothy', '2TI': '2 Timothy', TIT: 'Titus', HEB: 'Hebrews', JAS: 'James', '1PE': '1 Peter', '2PE': '2 Peter',
  '1JN': '1 John', JUD: 'Jude', REV: 'Revelation',
};

// "BOOK chapter:verse" or "BOOK chapter:verse-verse". One per day, in order.
export const VERSES = `
JOS 1:9|PRO 3:5-6|JER 29:11|PHP 4:13|ISA 40:31|ROM 8:28|JAS 1:5|PSA 119:105|MAT 6:33|2TI 2:15|PSA 46:10|ISA 41:10|COL 3:23|PRO 16:3|2TI 1:7|PHP 4:6-7|
ROM 12:2|PSA 37:4|LAM 3:22-23|JHN 14:27|PRO 1:7|DAN 1:17|ECC 9:10|PSA 1:1-2|HEB 11:6|MAT 11:28|PSA 23:1|JHN 3:16|ROM 15:13|1CO 10:13|GAL 6:9|
EPH 2:10|PRO 2:6|ISA 26:3|PSA 121:1-2|1PE 5:7|HEB 12:1|DEU 31:6|PSA 32:8|JAS 1:12|PRO 4:7|COL 3:2|MIC 6:8|PSA 27:1|2CO 5:17|ROM 5:8|
1JN 1:9|PSA 51:10|PRO 18:10|MAT 5:16|JHN 15:5|PHP 1:6|HEB 4:16|PSA 90:12|PRO 22:29|2CO 12:9|ISA 43:2|EPH 3:20|1TH 5:16-18|PSA 139:14|
NUM 6:24-26|PRO 10:4|JHN 16:33|ROM 10:9|GAL 2:20|PSA 103:2|DEU 8:18|PRO 13:20|MAT 7:7|HEB 13:5|1CO 15:58|PSA 19:14|PRO 12:24|EPH 6:10|
ISA 54:17|ROM 8:1|JHN 8:32|PSA 34:8|PRO 21:5|2CH 7:14|PHP 4:19|JAS 4:8|PSA 91:1-2|PRO 15:1|1TI 4:12|COL 3:16|PSA 16:11|ROM 12:12|
HEB 10:23|PRO 11:2|MAT 28:20|PSA 55:22|JHN 1:12|ISA 30:21|EPH 4:32|PSA 27:14|PRO 19:21|1CO 16:13|ROM 8:37|ZEP 3:17|JOS 1:8|PRO 3:13|
GAL 5:22-23|PSA 4:8|HEB 12:2|MAT 5:14|2TH 3:3|PRO 24:16|JHN 14:6|PSA 62:1-2|ROM 1:16|ISA 12:2|PHP 2:3|PSA 118:24|PRO 6:6|1JN 4:18|
COL 1:10|HAB 3:19|PSA 145:18|2PE 1:3|PRO 9:10|JAS 1:22|EPH 5:15-16|PSA 37:5|JER 33:3|MAT 22:37|ROM 13:8|PRO 27:17|PSA 56:3|1PE 2:9|
DAN 2:21|ISA 55:8-9|HEB 4:12|PSA 84:11|PRO 16:9|2CO 4:16|JHN 13:34|PSA 73:26|ROM 6:23|PHP 3:13-14|PRO 14:23|GEN 28:15|MAT 19:26|
PSA 9:10|1CO 2:9|PRO 17:22|EPH 1:3|ISA 58:11|PSA 18:2|JAS 3:17|COL 2:6-7|PRO 20:13|1TH 5:11|ROM 8:31|PSA 31:24|JHN 10:10|HEB 11:1|
MAL 3:10|PRO 3:27|PSA 63:1|GAL 6:2|ISA 61:1|2TI 3:16-17|PSA 100:4|PRO 16:24|MAT 5:44|ROM 12:10|EPH 2:8-9|PSA 28:7|1CO 13:4|PRO 23:12|
ISA 9:6|PSA 30:5|JHN 11:25|PHP 4:8|PRO 4:23|HEB 13:8|PSA 40:1|NAM 1:7|1PE 3:15|MAT 6:34|ROM 5:3-4|PSA 143:10|PRO 10:22|COL 4:2|
JOB 23:10|PSA 25:4-5|2CO 9:8|PRO 28:1|JHN 15:16|ISA 1:18|EPH 6:18|PSA 66:20|1JN 5:14|PRO 22:6|ROM 15:4|PSA 107:1|DEU 28:13|MAT 9:37|
GAL 5:1|PSA 5:3|PRO 29:25|HEB 6:10|ISA 60:1|PSA 34:18|1CO 9:24|JHN 6:35|PRO 8:17|ROM 8:38-39|PSA 86:11|EPH 4:29|2TI 4:7|PRO 15:22|
ACT 1:8|PSA 20:4|JAS 5:16|ISA 40:29|MAT 16:24|PSA 46:1|PHP 2:13|PRO 12:25|1TH 4:11|HEB 12:11|PSA 92:12-13|JHN 4:24|ROM 10:17|PRO 13:4|
2CO 10:5|PSA 3:3|ISA 53:5|COL 3:12|PRO 31:30|MAT 25:21|PSA 147:3|1PE 1:3|EPH 3:16|GEN 1:1|PSA 8:3-4|PRO 11:25|JHN 20:29|ROM 3:23|
PSA 37:23|HEB 13:16|ISA 46:4|1CO 1:9|PRO 21:21|GAL 3:28|PSA 119:11|JAS 1:17|MAT 18:20|EPH 4:2-3|PSA 46:5|PRO 25:11|2TH 3:13|JHN 7:38|
ROM 11:33|PSA 113:3|1JN 3:18|ISA 49:16|PRO 1:5|COL 1:17|PSA 136:1|HEB 2:18|MAT 4:4|JOL 2:25|PSA 125:1|2CO 1:3-4|PRO 18:21|EPH 5:2|
1TI 6:6|PSA 24:1|ISA 25:1|JHN 17:17|ROM 12:18|PRO 16:32|PSA 119:130|HEB 10:24|GAL 6:7|MAT 6:6|PSA 33:12|PHP 1:21|1CO 14:33|PRO 2:10-11|
DEU 6:5|PSA 61:2|ISA 35:4|JAS 2:17|EPH 1:18|PSA 18:30|PRO 10:9|2PE 3:9|JHN 5:24|ROM 14:8|PSA 112:7|1TH 5:24|HAG 2:9|PRO 3:9-10|MAT 7:24|
PSA 65:11|COL 3:15|ISA 42:16|HEB 11:3|PSA 138:8|1PE 4:10|PRO 19:20|GAL 1:10|JHN 14:1|ROM 2:4|PSA 39:7|EPH 6:11|2CO 3:17|PRO 16:16|
NEH 8:10|PSA 119:73|ISA 64:8|1CO 6:19-20|JAS 4:10|MAT 5:8|PSA 71:5|PRO 24:3-4|PHP 4:4|HEB 3:13|JHN 12:26|PSA 145:3|ROM 13:12|ZEC 4:6|
1JN 4:4|PRO 20:24|PSA 42:11|COL 1:13-14|ISA 32:17|2TI 2:22|PSA 128:2|EPH 2:19|PRO 4:18|JAS 3:13|1SA 16:7|PSA 115:1|HEB 7:25|JUD 1:24|
MAT 24:35|PSA 57:2|PRO 30:5|ROM 16:20|LUK 1:37|PSA 37:7|JHN 1:5|2CO 4:7|PRO 22:1|REV 21:4|PSA 150:6|ISA 52:7|PHP 3:10|1KI 3:9|EPH 3:17-19|
PSA 145:9|HEB 13:20-21|PRO 31:8|MAT 5:6|ROM 8:26|PSA 100:3|LUK 2:52|EZK 36:26|1CO 3:9|PRO 28:13|JHN 1:14|PSA 96:1|GAL 4:7|
`.split('|').map((s) => s.trim()).filter(Boolean).slice(0, 366);

const DAY_MS = 86400000;

/** 0-based index into VERSES for a Lagos calendar day 'YYYY-MM-DD'. */
export function verseIndexFor(day) {
  const d = parseDay(day);
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  const n = Math.floor((d.getTime() - start) / DAY_MS); // 0..365
  return Math.min(n, VERSES.length - 1);
}

/** Parse "PHP 4:6-7" into display text and Bible.com links. */
export function describeVerse(ref) {
  const [book, rest] = [ref.slice(0, 3), ref.slice(4)];
  const [chapter, verses] = rest.split(':');
  const name = BOOKS[book];
  const usfm = `${book}.${chapter}.${verses}`;
  return {
    ref,
    label: `${name} ${chapter}:${verses}`,
    nkjv: `https://www.bible.com/bible/114/${usfm}.NKJV`,
    niv: `https://www.bible.com/bible/111/${usfm}.NIV`,
  };
}

export function verseFor(day) {
  return describeVerse(VERSES[verseIndexFor(day)]);
}
