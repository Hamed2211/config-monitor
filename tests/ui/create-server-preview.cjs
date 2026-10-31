// Static preview from production markup/styles; fixtures never enter the APK.
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path');
const assets=path.resolve(__dirname,'../../app/src/main/assets');
let css=fs.readFileSync(path.join(assets,'style.css'),'utf8').replace(/url\(fonts\/(\w+)\.ttf\)/g,(_,font)=>`url(data:font/ttf;base64,${fs.readFileSync(path.join(assets,'fonts',font+'.ttf')).toString('base64')})`);
const html=fs.readFileSync(path.join(assets,'index.html'),'utf8');
const names=['آلمان · اصلی','هلند · پشتیبان','فرانسه'];
const from=Math.floor(Date.now()/3600000)*3600000-23*3600000;
const nodes=names.map((name,i)=>({id:i+1,name,host:'192.0.2.'+(i+1),p:'TCP',type:'server',method:'TCP',raw:'https://192.0.2.'+(i+1)+':443',transport:'TCP',enabled:true,state:i===2?'bad':'good',ms:i===2?-1:[84,126][i],lastCheck:from}));
const prefs={language:'fa',theme:'dark',interval:20,failureLimit:6,testUrl:'https://www.google.com/generate_204',running:true};
function screen(name){
 const dom=new JSDOM(html,{url:'https://appassets.androidplatform.net/assets/index.html',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document;
 w.Native={call:(op,raw)=>{
  const p=JSON.parse(raw);
  if(op==='snapshot')return JSON.stringify({nodes,prefs,permissions:{notifications:true,fullScreen:true,battery:true,dnd:true,alarmVolume:4},events:[]});
  if(op==='schedule')return JSON.stringify({phase:'waiting',remainingMs:12000,intervalMs:20000});
  if(op==='history')return JSON.stringify({samples:Array.from({length:24},(_,i)=>({time:from+i*20000,ms:p.id===3&&i>=10&&i<=13?-1:60+((i*17+p.id*7)%75)}))});
  if(op==='report')return JSON.stringify({from,up:86220000,down:180000,availability:99.79,coverage:98,average:84,outages:2,ok:4290,fail:9,buckets:Array.from({length:24},(_,i)=>({time:from+i*3600000,ok:i===17?160:180,fail:i===17?20:0}))});
  return '{"ok":true}';
 }};
 w.eval(fs.readFileSync(path.join(assets,'lucide.js'),'utf8'));w.eval(fs.readFileSync(path.join(assets,'app.js'),'utf8'));
 d.querySelector('[data-category=server]').click();
 if(name==='add'){d.querySelector('[data-action=add]').click();d.querySelector('#raw').value='2001:db8::10';d.querySelector('#raw').setAttribute('value','2001:db8::10');d.querySelector('#method-menu').open=true;}
 if(name==='reports'){d.querySelector('[data-nav=reports]').click();d.querySelector('#report-node').click();}
 const result='<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><style>'+css+'</style>'+d.body.outerHTML+'</html>';
 w.close();return result;
}
const esc=s=>s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
const frames=[['home','سرورها'],['add','افزودن سرور و روش بررسی'],['reports','انتخاب مانیتور در گزارش‌ها']].map(([name,label])=>`<section><h2>${label}</h2><iframe title="${label}" sandbox="allow-same-origin" srcdoc="${esc(screen(name))}"></iframe></section>`).join('');
const output=process.argv[2]||path.resolve(__dirname,'../../design/implemented-preview.html');
fs.writeFileSync(output,`<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Config Monitor 1.8 — implemented UI</title><style>@font-face{font-family:V;src:url(data:font/ttf;base64,${fs.readFileSync(path.join(assets,'fonts/Vazirmatn.ttf')).toString('base64')})}body{background:#090c0b;color:#e6eeea;font-family:V,sans-serif;margin:24px}h1{font-size:22px}p{color:#a4ada8}main{display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start}h2{font-size:14px}iframe{display:block;width:360px;height:860px;border:1px solid #25302b;border-radius:20px;background:#050505}section{flex:none}</style><h1>Config Monitor · ۱.۸</h1><p>چیدمان واقعی رابط با داده‌های نمونه؛ صفحه‌ها اسکرول می‌شوند. این پیش‌نمایش ثابت است و تست روی گوشی محسوب نمی‌شود.</p><main>${frames}</main></html>`);
console.log('Saved static production-markup preview:',output);
