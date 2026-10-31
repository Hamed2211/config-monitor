const fs=require('fs'),path=require('path');
const assets=path.resolve(__dirname,'../../app/src/main/assets');
const font=fs.readFileSync(path.join(assets,'fonts/Vazirmatn.ttf')).toString('base64');
let css=fs.readFileSync(path.join(assets,'style.css'),'utf8').replace(/url\(fonts\/(\w+)\.ttf\)/g,(_,name)=>`url(data:font/ttf;base64,${fs.readFileSync(path.join(assets,'fonts',name+'.ttf')).toString('base64')})`);
let html=fs.readFileSync(path.join(assets,'index.html'),'utf8');
const mock=`
const now=Date.now(), hour=3600000, from=Math.floor(now/hour)*hour-23*hour;
const previewNodes=[
{id:1,name:'آلمان · اصلی',host:'de.example.com:51820',p:'WireGuard',type:'config',transport:'UDP / WireGuard',ms:84,state:'good',uptime:99.8,observedMs:76000000},
{id:2,name:'هلند · پشتیبان',host:'nl.example.com:443',p:'VLESS',type:'config',transport:'TCP / TLS',ms:126,state:'good',uptime:98.4,observedMs:72000000},
{id:3,name:'ترکیه',host:'tr.example.com:443',p:'Trojan',type:'config',transport:'TCP / TLS',ms:-1,state:'bad',uptime:94.2,observedMs:73000000},
{id:4,name:'سرور آلمان',host:'192.0.2.10',p:'TCP',type:'server',transport:'TCP',ms:52,state:'good',uptime:99.9,observedMs:75000000}
].map(n=>({...n,enabled:true,lastCheck:now,raw:'',revision:1}));
const previewPrefs={language:'fa',theme:'dark',interval:20,failureLimit:6,testUrl:'https://www.google.com/generate_204',targets:['https://www.google.com/generate_204'],running:true,tone:'builtin:gentle',volume:80,vibrate:true};
window.Native={call:(op,raw)=>{const p=JSON.parse(raw);
 if(op==='snapshot')return JSON.stringify({nodes:previewNodes,prefs:previewPrefs,events:[],permissions:{notifications:true,fullScreen:true,battery:true,dnd:true,alarmVolume:5}});
 if(op==='schedule')return JSON.stringify({phase:'waiting',remainingMs:12000,intervalMs:20000});
 if(op==='history')return JSON.stringify({samples:Array.from({length:24},(_,i)=>({time:now-(23-i)*20000,ms:p.id===3&&i>16?-1:i===10?-1:55+((i*17+p.id*13)%105)}))});
 if(op==='report')return JSON.stringify({from:Math.floor(now/hour)*hour-(p.hours-1)*hour,to:now,up:76000000,down:152000,coverage:91,availability:99.8,average:84,outages:2,ok:3810,fail:12,buckets:Array.from({length:p.hours},(_,i)=>({time:Math.floor(now/hour)*hour-(p.hours-1-i)*hour,ok:i===17?167:180,fail:i===17?13:0,average:70+(i*11)%90}))});
 if(op==='settings'){Object.assign(previewPrefs,p);return '{"ok":true}';}
 if(op==='toggle'){previewNodes.find(n=>n.id===p.id).enabled=p.enabled;return '{"ok":true}';}
 if(op==='running'){previewPrefs.running=p.value;return '{"ok":true}';}
 if(op==='configFile'){setTimeout(()=>window.receive('message',{message:previewPrefs.language==='fa'?'در برنامهٔ اندروید، انتخاب‌گر فایل گوشی باز می‌شود.':'The Android app opens the device file picker.'}),0);return '{"ok":true}';}
 return JSON.stringify({ok:false,error:previewPrefs.language==='fa'?'این پیش‌نمایش با داده‌های نمونه است؛ این عملیات در برنامهٔ اندروید انجام می‌شود.':'Sample-data preview; this operation is available in the Android app.'});
}};
`;
html=html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/,`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; font-src data:; img-src data:; connect-src 'none'">`);
html=html.replace(/<link[^>]*href="style.css"[^>]*>/,()=>'<style>'+css+'</style>');
html=html.replace(/<script src="lucide.js"><\/script>/,()=>'<script>'+fs.readFileSync(path.join(assets,'lucide.js'),'utf8')+'</script>');
html=html.replace(/<script src="app.js"><\/script>/,()=>'<script>'+mock+'</script><script>'+fs.readFileSync(path.join(assets,'app.js'),'utf8')+'</script>');
const escaped=html.replace(/&/g,'&amp;').replace(/"/g,'&quot;');
const result=`<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Config Monitor · 1.9</title><style>@font-face{font-family:V;src:url(data:font/ttf;base64,${font})}*{box-sizing:border-box}body{margin:0;background:#080e0b;color:#e8f3ee;font-family:V,sans-serif}main{display:flex;align-items:center;justify-content:center;gap:70px;min-height:100vh;padding:32px}section{max-width:380px}h1{font-size:36px;line-height:1.5;font-weight:600;margin:14px 0}p{color:#92a99e;line-height:2;font-size:14px}ul{padding:0 18px;line-height:2.7;color:#c3d6cc;font-size:14px}.tag{color:#24c98b;border:1px solid #24513b;padding:5px 12px;border-radius:30px;font-size:12px}iframe{width:390px;height:840px;max-height:92vh;border:1px solid #294437;border-radius:28px;box-shadow:0 24px 90px #0008;background:#050505;flex:none}.hint{font-size:12px;color:#24c98b}a{color:#24c98b}@media(max-width:820px){main{flex-direction:column;gap:24px;padding:24px 12px}section{max-width:390px}h1{font-size:28px}iframe{width:min(390px,100%);height:800px;max-height:90vh}}</style><main><section><span class="tag">پیش‌نمایش تعاملی · ۱.۹</span><h1>هر لحظهٔ اتصال،<br>زیر نگاهت.</h1><p>رابط واقعی نسخهٔ جدید با داده‌های نمونه. نمودار روی کارت یا صفحهٔ جزئیات را لمس کن؛ زمان تست و پینگ همان لحظه را می‌بینی.</p><ul><li>افزودن WireGuard از فایل، متن و لینک</li><li>آپتایم کوچک کنار نوع کانفیگ</li><li>اعداد فارسی، حتی داخل تنظیمات</li><li>نمودار قابل لمس با حفظ نقطهٔ انتخابی</li></ul><p class="hint">از تنظیمات می‌تونی زبان و تم را هم عوض کنی.</p><p>آپتایم بر اساس زمان مشاهده‌شده است. این صفحه به سرور یا گوشی متصل نیست و تست اتصال واقعی انجام نمی‌دهد.</p></section><iframe title="برنامهٔ Config Monitor نسخهٔ ۱.۹" sandbox="allow-scripts" srcdoc="${escaped}"></iframe></main></html>`;
fs.writeFileSync(process.argv[2],result);console.log('Saved interactive preview with production assets and isolated sample data.');
