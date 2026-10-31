import pathlib,json,urllib.request,tarfile,io,hashlib,os
root=pathlib.Path(__file__).resolve().parent
for item in json.loads((root/'dependencies.lock.json').read_text()):
 target=root/item['path']
 if target.exists() and hashlib.sha256(target.read_bytes()).hexdigest()==item['sha256']: continue
 print('Downloading', target.name, target.parent.name)
 data=urllib.request.urlopen(item['url']).read()
 if 'member' in item:
  with tarfile.open(fileobj=io.BytesIO(data),mode='r:gz') as t:
   member=next(m for m in t.getmembers() if m.isfile() and pathlib.PurePosixPath(m.name).name==item['member']);data=t.extractfile(member).read()
 if hashlib.sha256(data).hexdigest()!=item['sha256']: raise RuntimeError('Checksum mismatch')
 target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data);target.chmod(0o755)
