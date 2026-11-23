const MONTH_NOW=new Date();let viewMonth=new Date(MONTH_NOW.getFullYear(),MONTH_NOW.getMonth(),1);
let histFilter='';

const greet=()=>{const h=new Date().getHours();return h<11?'Selamat pagi':h<15?'Selamat siang':h<18?'Selamat sore':'Selamat malam'};
const me=()=>({name:$('studentName').value.trim(),kelas:$('studentClass').value.trim()});
const myRecords=()=>{const s=me();return s.name&&s.kelas?getRecords().filter(r=>same(r,s)):[]};

function tick(){
  const d=new Date();
  $('clock').textContent=`${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  $('todayText').textContent=longDate(d);
}

function streak(recs){
  const map=new Map(recs.map(r=>[r.date,r.status]));let n=0;const d=new Date();
  for(let i=0;i<400;i++){
    const w=d.getDay();
    if(w!==0&&w!==6){
      const st=map.get(ymd(d));
      if(st==='Hadir')n++;
      else if(!st&&i!==0)break;   // izin/sakit tidak memutus rangkaian
    }
    d.setDate(d.getDate()-1);
  }
  return n;
}

function renderCalendar(recs){
  const y=viewMonth.getFullYear(),m=viewMonth.getMonth(),map=new Map(recs.map(r=>[r.date,r]));
  $('calTitle').textContent=viewMonth.toLocaleDateString('id-ID',{month:'long',year:'numeric'});
  const lead=(new Date(y,m,1).getDay()+6)%7,days=new Date(y,m+1,0).getDate(),t=today();
  let h=['Sen','Sel','Rab','Kam','Jum','Sab','Min'].map(d=>`<div class="cal-h">${d}</div>`).join('')+'<div></div>'.repeat(lead);
  for(let d=1;d<=days;d++){
    const k=`${y}-${pad(m+1)}-${pad(d)}`,r=map.get(k),wk=[0,6].includes(new Date(y,m,d).getDay());
    h+=`<div class="cal-d ${wk?'wk':''} ${r?r.status.toLowerCase():''} ${k===t?'now':''}" title="${r?esc(r.status+' · '+r.time):wk?'Akhir pekan':'Belum ada data'}">${d}</div>`;
  }
  $('calGrid').innerHTML=h;
}

function refresh(){
  const s=me(),recs=myRecords(),t=today(),tr=recs.find(r=>r.date===t),has=!!(s.name&&s.kelas);
  const first=s.name.split(' ')[0];
  $('heroTitle').textContent=`${greet()}${first?', '+first:''}!`;
  $('heroSub').textContent=has?(tr?'Absensi hari ini sudah tercatat. Sampai jumpa besok!':'Belum absen hari ini. Ketuk tombol hijau untuk mencatat kehadiranmu.'):'Isi nama dan kelasmu, lalu catat kehadiran hari ini dengan satu ketukan.';
  $('greetingName').textContent=s.name||'Siswa';$('greetingClass').textContent=s.kelas||'Kelas belum diisi';
  $('avatar').textContent=initial(s.name);$('avatar').style.background=colorFor(s.name);

  $('actionBox').classList.toggle('hidden',!!tr);$('stampBox').classList.toggle('hidden',!tr);
  if(tr){
    $('stampText').textContent=tr.status.toUpperCase();$('stampTime').textContent=`${tr.time} WIB`;
    $('stamp').className='stamp '+tr.status.toLowerCase();
    $('stampMsg').textContent=tr.status==='Hadir'?'Kehadiranmu hari ini sudah tercatat.':`Pengajuan ${tr.status.toLowerCase()} terkirim${tr.note?': '+tr.note:'.'}`;
  }

  const c=st=>recs.filter(r=>r.status===st).length,total=recs.length,pct=total?Math.round(c('Hadir')/total*100):0;
  $('countHadir').textContent=c('Hadir');$('countIzin').textContent=c('Izin');$('countSakit').textContent=c('Sakit');$('countTotal').textContent=total;
  $('ringPct').textContent=pct+'%';$('ringBar').style.strokeDashoffset=326.7*(1-pct/100);
  $('ringMsg').textContent=!total?'Mulai absen untuk melihat progresmu.':pct>=90?'Luar biasa, kehadiranmu sangat baik!':pct>=75?'Bagus. Pertahankan kehadiranmu.':'Yuk, tingkatkan lagi kehadiranmu.';
  $('streakNum').textContent=streak(recs);

  renderCalendar(recs);
  const rows=recs.filter(r=>!histFilter||r.status===histFilter).sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id);
  $('historyBody').innerHTML=rows.length?rows.map(r=>`<tr><td>${esc(parseYmd(r.date).toLocaleDateString('id-ID',{weekday:'short',day:'numeric',month:'short',year:'numeric'}))}</td><td><b>${esc(r.name)}</b></td><td>${esc(r.kelas)}</td><td><span class="pill ${pillClass(r.status)}">${esc(r.status)}</span></td><td>${esc(r.time)}</td><td>${esc(r.note||'-')}</td></tr>`).join(''):`<tr><td colspan="6" class="empty">${has?'Belum ada riwayat untuk filter ini.':'Isi nama dan kelas untuk melihat riwayatmu.'}</td></tr>`;
}

let busy=false;
async function submit(status,note=''){
  const s=me();
  if(!s.name||!s.kelas){toast('Isi nama lengkap dan kelas terlebih dahulu.','err');$('studentName').focus();return false}
  if(busy)return false;busy=true;
  try{
    let rec;
    if(DB_ON()){
      try{rec=fromDb(await rpc('student_submit',{p_name:s.name,p_kelas:s.kelas,p_status:status,p_note:note,p_device:deviceId()}))}
      catch(e){
        const m=String(e.message),dup=m.includes('DUPLICATE'),lock=m.includes('DEVICE_LOCKED');
        toast(lock?'Perangkat ini sudah dipakai untuk siswa lain. Satu perangkat hanya untuk satu siswa.':dup?'Kamu sudah mengisi absensi hari ini.':'Gagal terhubung ke server. Coba lagi.','err');
        if(dup)await syncMine();
        if(lock)await loadBinding();
        return false;
      }
    }else{
      if(getRecords().some(r=>r.date===today()&&same(r,s))){toast('Kamu sudah mengisi absensi hari ini.','err');return false}
      rec={id:Date.now(),date:today(),time:timeNow(),name:s.name,kelas:s.kelas,status,note};
    }
    const all=getRecords().filter(r=>!(r.date===rec.date&&same(r,rec)));all.push(rec);
    if(!saveRecords(all))return false;
    write(BIND_KEY,{name:rec.name,kelas:rec.kelas});lockInputs();
    refresh();
    if(status==='Hadir'){confetti();toast('Hadir tercatat. Selamat belajar!','ok')}else toast(`Pengajuan ${status.toLowerCase()} berhasil dikirim.`,'ok');
    return true;
  }finally{busy=false}
}
let syncT;
async function syncMine(){
  const s=me();if(!DB_ON()||!s.name||!s.kelas)return;
  try{const rows=await rpc('student_records',{p_name:s.name,p_kelas:s.kelas});
    saveRecords(getRecords().filter(r=>!same(r,s)).concat(rows.map(fromDb)));refresh()}catch(e){}
}
const onProf=()=>{saveProfile();refresh();clearTimeout(syncT);syncT=setTimeout(syncMine,600)};

function saveProfile(){write(PROFILE_KEY,me())}

/* ===== 1 perangkat = 1 siswa ===== */
function lockInputs(){
  const b=read(BIND_KEY,null);if(!b)return;
  $('studentName').value=b.name;$('studentClass').value=b.kelas;
  $('studentName').disabled=true;$('studentClass').disabled=true;
  saveProfile();refresh();
}
async function loadBinding(){
  if(!DB_ON())return;
  try{const r=await rpc('student_device',{p_device:deviceId()});
    if(r&&r[0]){write(BIND_KEY,{name:r[0].name,kelas:r[0].kelas});lockInputs();syncMine()}}catch(e){}
}

const openModal=()=>{$('requestModal').classList.remove('hidden');$('requestNote').focus()};
const closeModal=()=>$('requestModal').classList.add('hidden');

$('presentBtn').onclick=()=>submit('Hadir');
$('requestBtn').onclick=()=>{const s=me();if(!s.name||!s.kelas){toast('Isi nama dan kelas terlebih dahulu.','err');$('studentName').focus();return}openModal()};
$('closeModal').onclick=closeModal;
$('requestModal').addEventListener('click',e=>{if(e.target.id==='requestModal')closeModal()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
$('submitRequest').onclick=async()=>{if(await submit($('requestType').value,$('requestNote').value.trim())){closeModal();$('requestNote').value=''}};
$('noteChips').onclick=e=>{if(e.target.matches('.chip')){$('requestNote').value=e.target.textContent;if(e.target.textContent==='Demam'||e.target.textContent==='Periksa ke dokter')$('requestType').value='Sakit'}};
$('histChips').onclick=e=>{const b=e.target.closest('.chip');if(!b)return;histFilter=b.dataset.f;document.querySelectorAll('#histChips .chip').forEach(x=>x.classList.toggle('on',x===b));refresh()};
$('prevMonth').onclick=()=>{viewMonth=new Date(viewMonth.getFullYear(),viewMonth.getMonth()-1,1);refresh()};
$('nextMonth').onclick=()=>{viewMonth=new Date(viewMonth.getFullYear(),viewMonth.getMonth()+1,1);refresh()};
$('studentName').oninput=onProf;$('studentClass').oninput=onProf;
window.addEventListener('storage',refresh);

const prof=read(PROFILE_KEY,{});$('studentName').value=prof.name||'';$('studentClass').value=prof.kelas||'';
tick();setInterval(tick,1000);refresh();syncMine();setInterval(syncMine,20000);
lockInputs();loadBinding();