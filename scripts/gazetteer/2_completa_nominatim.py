import json,time,subprocess,urllib.parse,re
S=os.environ.get('GAZ_DIR','.')
miss=json.load(open(f'{S}/gaz/miss.json')); out=json.load(open(f'{S}/gaz/comuni_coord.json'))
UA='riccio-dataset/1.0 (https://github.com/francemazzi/riccio)'
ok=0; still=[]
for nome,sig in miss:
    time.sleep(1.1)
    q=f"{nome.split('/')[0]}, {sig}, Italia"
    u='https://nominatim.openstreetmap.org/search?'+urllib.parse.urlencode({'q':q,'format':'jsonv2','limit':1,'countrycodes':'it'})
    r=subprocess.run(['curl','-sS','-m','25','-A',UA,u],capture_output=True,text=True)
    try: v=json.loads(r.stdout)
    except Exception: v=[]
    if v: out.append([nome,sig,round(float(v[0]['lat']),3),round(float(v[0]['lon']),3)]); ok+=1
    else: still.append((nome,sig))
json.dump(out,open(f'{S}/gaz/comuni_coord_full.json','w'),ensure_ascii=False,separators=(',',':'))
print('recuperati',ok,'di',len(miss),'ancora senza:',still[:20])
