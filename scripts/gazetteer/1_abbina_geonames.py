import csv,json,re,unicodedata,collections
S=os.environ.get('GAZ_DIR','.')
def n(s): return re.sub(r'[^a-z0-9]+',' ',unicodedata.normalize('NFD',s).encode('ascii','ignore').decode().lower()).strip()
comuni=list(csv.DictReader(open(f'{S}/gaz/comuni.csv',encoding='utf8')))
byprov=collections.defaultdict(list)
for line in open(f'{S}/gaz/geonames/IT.txt',encoding='utf8'):
    f=line.rstrip('\n').split('\t')
    if f[6]!='P': continue
    names={n(f[1]),n(f[2])}|{n(a) for a in f[3].split(',') if a}
    byprov[f[11]].append((names,float(f[4]),float(f[5]),f[7],int(f[14] or 0),f[1]))
RANK={'PPLC':0,'PPLA':1,'PPLA2':2,'PPLA3':3,'PPLA4':4,'PPL':5,'PPLX':6}
out=[];miss=[]
for c in comuni:
    nm=n(c['comune'].split('/')[0]); variants={nm,n(c['comune']),*[n(x) for x in c['comune'].split('/')]}
    cands=[x for x in byprov.get(c['sigla'],[]) if x[0]&variants]
    if not cands: miss.append((c['comune'],c['sigla'])); continue
    cands.sort(key=lambda x:(RANK.get(x[3],9),-x[4]))
    out.append([c['comune'],c['sigla'],round(cands[0][1],3),round(cands[0][2],3)])
print(len(out),'abbinati;',len(miss),'senza coordinate'); print(miss[:25])
json.dump(out,open(f'{S}/gaz/comuni_coord.json','w'),ensure_ascii=False,separators=(',',':'))
json.dump(miss,open(f'{S}/gaz/miss.json','w'),ensure_ascii=False)
