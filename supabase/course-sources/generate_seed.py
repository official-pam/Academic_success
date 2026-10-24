import sys
EP='https://eportal.futminna.edu.ng/ePortal_V2/utme/'
schools=[('SAFT','School of Agronomy and Forestry Technology','https://futminna.edu.ng/saft/'),
('SAHS','School of Allied Health Sciences','https://futminna.edu.ng/sahs/'),
('SAMET','School of Agricultural Management and Extension Technology','https://futminna.edu.ng/samet/'),
('SAT','SAT (full school name not published on the ePortal)',EP),
('SBMS','School of Basic Medical Sciences','https://futminna.edu.ng/sbms/'),
('SEET','School of Engineering and Engineering Technology','https://futminna.edu.ng/seet/'),
('SET','School of Environmental Technology','https://futminna.edu.ng/set/'),
('SFAT','School of Food Science and Agricultural Technology','https://futminna.edu.ng/sfat/'),
('SICT','School of Information and Communications Technology','https://futminna.edu.ng/sict/'),
('SIPET','School of Infrastructure, Process Engineering and Technology','https://futminna.edu.ng/sipet/'),
('SIT','School of Innovative Technology','https://futminna.edu.ng/sit/'),
('SLS','School of Life Sciences','https://futminna.edu.ng/sls/'),
('SPhS','School of Pharmaceutical Sciences','https://futminna.edu.ng/sphs/'),
('SPS','School of Physical Sciences','https://futminna.edu.ng/sps/'),
('SSTE','School of Science and Technology Education','https://futminna.edu.ng/sste/')]
progs={
'SAFT':['Crop Production','Forestry and Wildlife Technology','Horticulture','Soil Science and Land Management'],
'SAHS':['Medical Laboratory Science','Nursing Science'],
'SAMET':['Agricultural Economics and Farm Management','Agricultural Extension and Rural Development','Agribusiness'],
'SAT':['Architecture','Furniture Design Architecture','Interior Architecture and Design','Landscape Architecture'],
'SBMS':['Human Anatomy','Human Physiology','Medicine and Surgery'],
'SEET':['Computer Engineering','Electrical and Electronics Engineering','Mechatronics Engineering','Telecommunication Engineering'],
'SET':['Building Technology','Estate Management & Valuation','Quantity Surveying','Surveying and Geoinformatics','Urban and Regional Planning'],
'SFAT':['Animal Production','Food Science Technology','Human Nutrition and Dietetics','Water Resources Aquaculture and Fisheries Technology'],
'SICT':['Artificial Intelligence','Computer Science','Cyber Security Science','Data Science','Information Technology','Information Science & Media Studies','Intelligence and Security Studies','Software Engineering'],
'SIPET':['Agricultural & Bioresources Engineering','Chemical Engineering','Civil Engineering','Food Engineering','Mechanical Engineering','Material and Metallurgical Engineering','Mining Engineering','Nuclear Engineering','Petroleum and Gas Engineering'],
'SIT':['Entrepreneurship and Business Studies','Financial Technology','Logistics and Supply Chain Management','Logistics and Transport Technology','Procurement Management Technology','Project Management Technology'],
'SLS':['Animal Biology','Biochemistry','Biotechnology','Chemistry','Forensic Science','Microbiology','Public Health','Plant Biology','Water, Sanitation and Hygiene'],
'SPhS':['Doctor of Pharmacy'],
'SPS':['Science Education','Geology','Geophysics','Geography','Industrial Mathematics','Mathematics','Meteorology','Nuclear Science','Physics','Statistics'],
'SSTE':['Agricultural Science Education','Biology Education','Chemistry Education','Geography Education','Mathematics Education','Physics Education','Computer Science Education','Educational Technology','Industrial and Technology Education','Library and Information Science']}
q=lambda s: "'"+s.replace("'","''")+"'"
o=['-- Seed: FUT Minna schools, programmes and verified course records.',
'-- Generated 24 Oct 2026. Schools/programmes: official ePortal programme list ('+EP+').',
'-- Courses: only those published on official department pages, with the page as source.',
'-- Re-runnable: inserts skip rows that already exist.','begin;','']
o.append('insert into public.schools (code, name, source_url) values')
o.append(',\n'.join(f'  ({q(c)}, {q(n)}, {q(u)})' for c,n,u in schools)+'\non conflict (code) do nothing;\n')
rows=[]
for sc,ps in progs.items():
    for p in ps: rows.append(f'  ({q(sc)}, {q(p)}, {q(EP)})')
o.append('insert into public.programmes (school_code, name, source_url) values')
o.append(',\n'.join(rows)+'\non conflict (school_code, name) do nothing;\n')

import glob,re
CODE=re.compile(r'^[A-Z][A-Z-]{1,9} ?[0-9]{3}[A-Z]?$')
total=0
for path in sorted(glob.glob(sys.argv[1]+'/*.txt')):
    lines=[l.rstrip('\n') for l in open(path) if l.strip()]
    sc,prog,url,note=[x.strip() for x in lines[0].lstrip('# ').split('|',3)]
    assert prog in progs[sc], (sc,prog)
    seen=set(); vals=[]
    for l in lines[1:]:
        code,title,units,st,lvl,sem=l.split('|')
        assert CODE.match(code), code
        assert code not in seen, (path,code); seen.add(code)
        assert int(units)<=15 and lvl in ('100','200','300','400','500') and sem in ('1','2'), l
        status={'C':"'compulsory'",'E':"'elective'",'':'null'}[st]
        vals.append(f"  ({q(code)}, {q(title)}, {units}, {lvl}, {sem}, {status})")
    total+=len(vals)
    o.append(f'-- {prog} ({sc}): {len(vals)} courses. Source: {note}')
    o.append('insert into public.courses (programme_id, code, title, credit_units, level, semester, status, verification, source_url, source_note)')
    o.append("select p.id, v.code, v.title, v.units, v.level, v.semester, v.status::public.course_status, 'from_department_page', "+q(url)+", "+q(note))
    o.append('from public.programmes p, (values\n'+',\n'.join(vals)+'\n) as v(code, title, units, level, semester, status)')
    o.append(f"where p.school_code = {q(sc)} and p.name = {q(prog)}\non conflict (programme_id, code, curriculum_version) do nothing;\n")
o.append('commit;')
o[1]='-- Generated 24 Oct 2026. Schools/programmes: official ePortal programme list ('+EP+').'
o[2]='-- Courses: transcribed from official department handbooks/curricula linked from futminna.edu.ng ('+str(total)+' records).'
print('\n'.join(o))
