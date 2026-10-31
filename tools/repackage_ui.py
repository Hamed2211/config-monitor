"""Offline UI-only release packaging. Output is UNSIGNED; align and sign separately.

Only use with a verified seed APK whose Java/native/resources match this source.
This is not a replacement for compiling Android code when native inputs change.
The compiled manifest's version string must retain its encoded length.
"""
from pathlib import Path
import argparse
import re
import struct
import zipfile

def update_manifest(payload, version_name, version_code):
    data = bytearray(payload)
    u16 = lambda offset: struct.unpack_from('<H', data, offset)[0]
    u32 = lambda offset: struct.unpack_from('<I', data, offset)[0]
    assert u16(0) == 3 and u32(4) == len(data), 'Expected compiled Android XML'
    strings, locations = [], []
    offset, changed = u16(2), set()
    while offset < len(data):
        kind, header, size = struct.unpack_from('<HHI', data, offset)
        assert size >= header and offset+size <= len(data)
        if kind == 1:
            count, flags, start = u32(offset+8), u32(offset+16), u32(offset+20)
            for i in range(count):
                pos = offset+start+u32(offset+header+i*4)
                if flags & 0x100:
                    def length8(at):
                        first=data[at]
                        return (((first&0x7f)<<8)|data[at+1], at+2) if first&0x80 else (first,at+1)
                    chars, pos = length8(pos)
                    length, pos = length8(pos)
                    encoding='utf-8'
                else:
                    length=u16(pos); pos+=2
                    if length&0x8000:
                        length=((length&0x7fff)<<16)|u16(pos);pos+=2
                    chars=length;length*=2;encoding='utf-16-le'
                strings.append(bytes(data[pos:pos+length]).decode(encoding))
                locations.append((pos,length,chars,encoding))
        elif kind == 0x102:
            ext=offset+header
            if strings[u32(ext+4)] == 'manifest':
                attrs=ext+u16(ext+8)
                stride,count=u16(ext+10),u16(ext+12)
                for i in range(count):
                    attr=attrs+i*stride
                    namespace=u32(attr)
                    if namespace == 0xffffffff or strings[namespace]!='http://schemas.android.com/apk/res/android':continue
                    name=strings[u32(attr+4)]
                    if name=='versionCode':
                        assert data[attr+15] in (0x10,0x11) and u32(attr+8)==0xffffffff
                        struct.pack_into('<I',data,attr+16,version_code)
                        changed.add(name)
                    elif name=='versionName':
                        assert data[attr+15]==3
                        index=u32(attr+16)
                        assert u32(attr+8) in (0xffffffff,index)
                        pos,length,chars,encoding=locations[index]
                        replacement=version_name.encode(encoding)
                        assert len(replacement)==length and len(version_name)==chars,'Version string length must match seed'
                        data[pos:pos+length]=replacement
                        changed.add(name)
        offset+=size
    assert changed=={'versionCode','versionName'}
    assert len(data)==len(payload)
    return bytes(data)

def repackage(seed, assets, output, version_name, version_code):
    assets=Path(assets)
    signatures=re.compile(r'^META-INF/(?:MANIFEST\.MF|[^/]+\.(?:SF|RSA|DSA|EC))$',re.I)
    with zipfile.ZipFile(seed) as source, zipfile.ZipFile(output,'w') as target:
        assert source.testzip() is None
        for info in source.infolist():
            # Keep build-generated assets such as dexopt/baseline.prof intact.
            # Replace only files supplied by the production asset directory.
            if signatures.match(info.filename):continue
            if info.filename.startswith('assets/') and (assets/info.filename[7:]).is_file():continue
            payload=source.read(info)
            if info.filename=='AndroidManifest.xml':payload=update_manifest(payload,version_name,version_code)
            target.writestr(info,payload)
        for f in sorted(assets.rglob('*')):
            if f.is_file():target.write(f,'assets/'+f.relative_to(assets).as_posix(),compress_type=zipfile.ZIP_STORED if f.suffix.lower()=='.wav' else zipfile.ZIP_DEFLATED)
    with zipfile.ZipFile(output) as result,zipfile.ZipFile(seed) as source:
        assert result.testzip() is None
        for name in result.namelist():
            if name=='AndroidManifest.xml' or name.startswith('assets/'):continue
            assert result.read(name)==source.read(name),name

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-apk',type=Path,required=True)
    parser.add_argument('--assets',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--version-name',required=True)
    parser.add_argument('--version-code',type=int,required=True)
    args=parser.parse_args()
    repackage(args.base_apk,args.assets,args.output,args.version_name,args.version_code)
