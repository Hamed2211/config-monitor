"""Derive an offline country-only range index from the bundled DB-IP City MMDB.
Usage: python build_country_ranges.py source.mmdb output.bin.gz
Requires maxminddb. Output: CMC1, uint32 IPv4/IPv6 counts, then sorted
[start, end, 2-byte ISO] records; IPv4 address=4 bytes, IPv6=16 bytes.
"""
import sys,struct,gzip,ipaddress,hashlib,json
from pathlib import Path
import maxminddb
source,target=map(Path,sys.argv[1:]);groups={4:[],6:[]};count=0
with maxminddb.open_database(source) as reader:
 for network,data in reader:
  code=data.get('country',{}).get('iso_code','')
  if len(code)!=2 or not code.isascii() or not code.isalpha():continue
  start=int(network.network_address);end=int(network.broadcast_address);rows=groups[network.version]
  if rows and rows[-1][1]+1==start and rows[-1][2]==code:rows[-1][1]=end
  else:rows.append([start,end,code])
  count+=1
 print('Converted',count,'networks; compact ranges', {v:len(r) for v,r in groups.items()},flush=True)
 with target.open('wb') as f,gzip.GzipFile(fileobj=f,mode='wb',mtime=0) as out:
  out.write(b'CMC1'+struct.pack('>II',len(groups[4]),len(groups[6])))
  for v in [4,6]:
   previous=-1
   for start,end,code in groups[v]:
    assert previous<start<=end;previous=end
    size=4 if v==4 else 16
    out.write(start.to_bytes(size,'big')+end.to_bytes(size,'big')+code.encode('ascii'))
 # Check actual range boundaries and gaps against source independently of traversal.
 import bisect,random
 rng=random.Random(220);checked=0
 for v,rows in groups.items():
  starts=[r[0] for r in rows]
  samples=[rng.getrandbits(32 if v==4 else 128) for _ in range(4000)]
  for row in rng.sample(rows,min(1000,len(rows))):samples.extend([row[0],row[1],max(0,row[0]-1),row[1]+1])
  for ip in samples:
   if ip>=2**(32 if v==4 else 128):continue
   idx=bisect.bisect_right(starts,ip)-1
   actual=rows[idx][2] if idx>=0 and ip<=rows[idx][1] else ''
   address=ipaddress.IPv4Address(ip) if v==4 else ipaddress.IPv6Address(ip)
   expected=(reader.get(str(address)) or {}).get('country',{}).get('iso_code','')
   assert actual==expected,(address,actual,expected);checked+=1
 print('PASS:',checked,'boundary/random country lookups match original MMDB',flush=True)
print('Output bytes',target.stat().st_size,'SHA256',hashlib.sha256(target.read_bytes()).hexdigest())
