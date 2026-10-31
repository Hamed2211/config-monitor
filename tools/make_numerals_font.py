"""Derive an OFL numeric-input face from bundled Vazirmatn, without new outlines.
Map ASCII digits to Persian digit glyphs; leave input values machine-readable.
Run from any directory. No external dependency. Original licensing is retained.
"""
from pathlib import Path
import struct,hashlib
fontdir=Path(__file__).resolve().parents[1]/'app/src/main/assets/fonts'
source=(fontdir/'Vazirmatn.ttf').read_bytes()
u16=lambda b,p:struct.unpack_from('>H',b,p)[0]
u32=lambda b,p:struct.unpack_from('>I',b,p)[0]
tables={}
for i in range(u16(source,4)):
 tag,checksum,offset,length=struct.unpack_from('>4sIII',source,12+i*16);tables[tag]=source[offset:offset+length]
cmap=tables[b'cmap'];mapping={}
for i in range(u16(cmap,2)):
 platform,encoding,offset=struct.unpack_from('>HHI',cmap,4+i*8)
 if platform not in (0,3):continue
 fmt=u16(cmap,offset)
 if fmt==4:
  n=u16(cmap,offset+6)//2;ends=offset+14;starts=ends+2*n+2;deltas=starts+2*n;ranges=deltas+2*n
  for j in range(n):
   start,end,delta,span=u16(cmap,starts+j*2),u16(cmap,ends+j*2),u16(cmap,deltas+j*2),u16(cmap,ranges+j*2)
   for cp in range(start,min(end,65534)+1):
    glyph=u16(cmap,ranges+j*2+span+2*(cp-start)) if span else cp
    if glyph: mapping[cp]=(glyph+delta)&65535
 elif fmt==12:
  for j in range(u32(cmap,offset+12)):
   start,end,glyph=struct.unpack_from('>III',cmap,offset+16+j*12)
   for cp in range(start,end+1):mapping[cp]=glyph+cp-start
for i in range(10):
 assert mapping[0x6f0+i]>0
 mapping[48+i]=mapping[0x6f0+i]
# Keep a BMP format 4 table for legacy Android and format 12 for Unicode coverage.
bmp=[(cp,g) for cp,g in sorted(mapping.items()) if cp<65535]+[(65535,0)]
n=len(bmp);power=2**(n.bit_length()-1)
fmt4=struct.pack('>7H',4,16+8*n,0,2*n,2*power,power.bit_length()-1,2*n-2*power)
fmt4+=b''.join(struct.pack('>H',cp) for cp,g in bmp)+b'\0\0'
fmt4+=b''.join(struct.pack('>H',cp) for cp,g in bmp)
fmt4+=b''.join(struct.pack('>H',(g-cp)&65535) for cp,g in bmp)+b'\0\0'*n
assert len(fmt4)<65536
items=sorted(mapping.items());fmt12=struct.pack('>HHIII',12,0,16+12*len(items),0,len(items))+b''.join(struct.pack('>III',cp,cp,g) for cp,g in items)
tables[b'cmap']=struct.pack('>HH',0,3)+struct.pack('>HHI',0,3,28)+struct.pack('>HHI',3,1,28)+struct.pack('>HHI',3,10,28+len(fmt4))+fmt4+fmt12
# Rename derivative; retain authorship and OFL license records verbatim.
name=tables[b'name'];count=u16(name,2);offset=u16(name,4);records=[];strings=b''
replacement={1:'CM Numerals',2:'Regular',3:'ConfigMonitor-CMNumerals-1',4:'CM Numerals Regular',6:'CMNumerals-Regular',16:'CM Numerals',17:'Regular'}
for i in range(count):
 platform,encoding,lang,ident,length,pos=struct.unpack_from('>6H',name,6+i*12)
 value=name[offset+pos:offset+pos+length]
 if ident in replacement:value=replacement[ident].encode('utf-16-be' if platform in (0,3) else 'ascii')
 records.append(struct.pack('>6H',platform,encoding,lang,ident,len(value),len(strings)));strings+=value
tables[b'name']=struct.pack('>3H',0,count,6+12*count)+b''.join(records)+strings
head=bytearray(tables[b'head']);head[8:12]=b'\0'*4;tables[b'head']=bytes(head)
def checksum(b):
 b=b+b'\0'*((-len(b))%4);return sum(struct.unpack('>'+str(len(b)//4)+'I',b))&0xffffffff
n=len(tables);power=2**(n.bit_length()-1);header=source[:4]+struct.pack('>4H',n,16*power,power.bit_length()-1,16*n-16*power)
rows=[];payload=b'';headOffset=0
for tag,value in sorted(tables.items()):
 off=12+16*n+len(payload)
 if tag==b'head':headOffset=off
 rows.append(struct.pack('>4sIII',tag,checksum(value),off,len(value)));payload+=value+b'\0'*((-len(value))%4)
result=bytearray(header+b''.join(rows)+payload)
struct.pack_into('>I',result,headOffset+8,(0xb1b0afba-checksum(result))&0xffffffff)
assert checksum(result)==0xb1b0afba
(fontdir/'CMNumerals.ttf').write_bytes(result)
print('Generated CMNumerals.ttf; Persian digit mappings and SFNT checksum verified. Source SHA256:',hashlib.sha256(source).hexdigest())
