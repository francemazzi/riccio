import json,csv,os,sys
S=os.environ.get('GAZ_DIR','.')
src=f'{S}/gaz/comuni_coord_full.json' if os.path.exists(f'{S}/gaz/comuni_coord_full.json') else f'{S}/gaz/comuni_coord.json'
c=json.load(open(src))
prov={}
for r in csv.DictReader(open(f'{S}/gaz/comuni.csv',encoding='utf8')): prov[r['sigla']]=r['den_prov']
seen=set(); out=[]
for x in sorted(c,key=lambda x:(x[1],x[0])):
    k=(x[0],x[1])
    if k in seen: continue
    seen.add(k); out.append(x)
json.dump({'c':out,'p':prov},open('/home/user/riccio/src/data/comuni.json','w'),ensure_ascii=False,separators=(',',':'))
print(src.split('/')[-1],len(out),'comuni',len(prov),'province')
