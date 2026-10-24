import json, re, sys
src, lib, out = sys.argv[1], sys.argv[2], sys.argv[3]
FILES = {'GEN':'genesis','EXO':'exodus','LEV':'leviticus','NUM':'numbers','DEU':'deuteronomy','JOS':'joshua','JDG':'judges','RUT':'ruth',
 '1SA':'1samuel','2SA':'2samuel','1KI':'1kings','2KI':'2kings','1CH':'1chronicles','2CH':'2chronicles','NEH':'nehemiah','JOB':'job',
 'PSA':'psalms','PRO':'proverbs','ECC':'ecclesiastes','ISA':'isaiah','JER':'jeremiah','LAM':'lamentations','EZK':'ezekiel','DAN':'daniel',
 'HOS':'hosea','JOL':'joel','MIC':'micah','NAM':'nahum','HAB':'habakkuk','ZEP':'zephaniah','HAG':'haggai','ZEC':'zechariah','MAL':'malachi',
 'MAT':'matthew','MRK':'mark','LUK':'luke','JHN':'john','ACT':'acts','ROM':'romans','1CO':'1corinthians','2CO':'2corinthians','GAL':'galatians',
 'EPH':'ephesians','PHP':'philippians','COL':'colossians','1TH':'1thessalonians','2TH':'2thessalonians','1TI':'1timothy','2TI':'2timothy',
 'TIT':'titus','HEB':'hebrews','JAS':'james','1PE':'1peter','2PE':'2peter','1JN':'1john','JUD':'jude','REV':'revelation'}
text = open(lib).read()
block = text[text.index('export const VERSES = `')+len('export const VERSES = `'):]
block = block[:block.index('`')]
refs = [s.strip() for s in block.split('|') if s.strip()][:366]
cache = {}
result = {}
for ref in refs:
    book, rest = ref[:3], ref[4:]
    ch, vs = rest.split(':')
    a, b = (vs.split('-') + [vs])[:2]
    a, b, ch = int(a), int(b), int(ch)
    if book not in cache:
        cache[book] = json.load(open(f"{src}/{FILES[book]}.json"))
    parts = [x['value'] for x in cache[book] if 'verseNumber' in x and x.get('chapterNumber') == ch and a <= x['verseNumber'] <= b and 'value' in x]
    t = re.sub(r'\s+', ' ', ' '.join(parts)).strip()
    t = re.sub(r'\s+([,.;:!?’”])', r'\1', t)
    # Drop quotation marks left unbalanced by cutting a verse out of a longer speech.
    for o, c in (('“', '”'), ('‘', '’')):
        if t.count(o) < t.count(c) and t.endswith(c): t = t[:-1].rstrip()
        if t.count(o) > t.count(c) and t.startswith(o): t = t[1:].lstrip()
    if t.count('“') != t.count('”'): t = t.replace('“', '').replace('”', '')
    if not t: sys.exit(f'MISSING {ref}')
    result[ref] = t
with open(out, 'w') as f:
    f.write('// World English Bible (WEB) text for the daily memory verses. The WEB is in the public domain.\n')
    f.write('// Generated from the npm package world-english-bible@1.0.1 by scripts/build-verse-text.py. Do not edit by hand.\n')
    f.write('export const VERSE_TEXT = ' + json.dumps(result, ensure_ascii=False, indent=0) + ';\n')
print(len(refs), 'refs,', len(result), 'unique;', 'longest', max(len(v) for v in result.values()), 'chars')
for r in ['PRO 3:9-10', 'PHP 4:13', 'JHN 3:16', 'PSA 23:1', 'JOS 1:9']:
    print(r, '=>', result.get(r))
