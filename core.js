/* Fungsi bersama untuk halaman siswa & admin */
const KEY='attendify_records_v1', ROSTER_KEY='attendify_roster_v1', PROFILE_KEY='attendify_profile_v1';
const $=id=>document.getElementById(id);
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const today=()=>ymd(new Date());
const parseYmd=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const timeNow=()=>new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}).replace('.',':');
const longDate=d=>d.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
function read(k,fb){try{const v=JSON.parse(localStorage.getItem(k));return v==null?fb:v}catch{return fb}}
function write(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch{toast('Penyimpanan browser penuh atau diblokir.','err');return false}}
const getRecords=()=>read(KEY,[]);
const saveRecords=x=>write(KEY,x);
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
const norm=s=>String(s||'').trim().toLowerCase().replace(/\s+/g,' ');
const same=(a,b)=>norm(a.name)===norm(b.name)&&norm(a.kelas)===norm(b.kelas);
const initial=n=>(String(n||'?').trim()[0]||'?').toUpperCase();
const COLORS=['#0e7fd6','#12b886','#7c5cff','#f08c00','#f0524a','#e64980','#2f9e9e','#5c6bc0'];
const colorFor=n=>{let h=0;for(const c of String(n))h=(h*31+c.charCodeAt(0))>>>0;return COLORS[h%COLORS.length]};
const pillClass=s=>s==='Belum Absen'?'belum':String(s).toLowerCase();

function toast(msg,type=''){
  let box=$('toasts');if(!box){box=document.createElement('div');box.id='toasts';document.body.appendChild(box)}
  const t=document.createElement('div');t.className='toast '+type;t.setAttribute('role','status');
  t.textContent=(type==='ok'?'✓ ':type==='err'?'! ':'')+msg;box.appendChild(t);
  setTimeout(()=>{t.style.opacity='0';t.style.transition='opacity .3s';setTimeout(()=>t.remove(),300)},3200);
}
function confetti(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const cols=['#ffc933','#12b886','#0e7fd6','#f0524a','#7c5cff'];
  for(let i=0;i<40;i++){
    const s=document.createElement('span');s.className='confetti';
    s.style.left=(10+Math.random()*80)+'vw';s.style.background=cols[i%cols.length];
    s.style.setProperty('--dx',(Math.random()*160-80)+'px');s.style.setProperty('--r',(Math.random()*720-360)+'deg');
    s.style.animationDelay=(Math.random()*.4)+'s';document.body.appendChild(s);setTimeout(()=>s.remove(),2400);
  }
}

/* ===== Database online (Supabase via REST/RPC). Kosongkan config.js untuk mode lokal saja ===== */
const DB_ON=()=>typeof SUPABASE_URL!=='undefined'&&!!SUPABASE_URL&&!!SUPABASE_KEY;
async function rpc(fn,args={}){
  const r=await fetch(SUPABASE_URL.replace(/\/$/,'')+'/rest/v1/rpc/'+fn,{method:'POST',headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY,'Content-Type':'application/json'},body:JSON.stringify(args)});
  const t=await r.text();if(!r.ok)throw new Error(t||r.statusText);return t?JSON.parse(t):null;
}
const fromDb=r=>({id:r.id,date:r.date,time:r.time,name:r.name,kelas:r.kelas,status:r.status,note:r.note||''});

/* ===== 1 perangkat = 1 siswa ===== */
const DEVICE_KEY='attendify_device_v1', BIND_KEY='attendify_bound_v1';
function deviceId(){
  try{
    let v=localStorage.getItem(DEVICE_KEY);
    if(!v){v=(crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2));localStorage.setItem(DEVICE_KEY,v)}
    return v;
  }catch{return 'tmp-'+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2)}
}