const PASS='admin123', SESSION='attendify_admin_session';
let statusF='', view=[], ADMIN_PW='', lastSnap='';
const SC={Hadir:'#12b886',Izin:'#ffc933',Sakit:'#f0524a','Belum Absen':'#c5d2e3'};

function roster(){
  const map=new Map();
  const add=(n,k)=>{const key=norm(n)+'|'+norm(k);if(n&&k&&!map.has(key))map.set(key,{name:String(n).trim(),kelas:String(k).trim()})};
  read(ROSTER_KEY,[]).forEach(s=>add(s.name,s.kelas));getRecords().forEach(r=>add(r.name,r.kelas));
  return [...map.values()];
}
function rowsFor(date,rs=roster(),recs=getRecords()){
  const day=recs.filter(r=>r.date===date);
  return rs.map(s=>{const rec=day.find(r=>same(r,s));return {...s,rec,status:rec?rec.status:'Belum Absen'}});
}
const counts=rows=>({Hadir:rows.filter(r=>r.status==='Hadir').length,Izin:rows.filter(r=>r.status==='Izin').length,Sakit:rows.filter(r=>r.status==='Sakit').length,'Belum Absen':rows.filter(r=>r.status==='Belum Absen').length});

function show(on){$('loginArea').classList.toggle('hidden',on);$('dashboard').classList.toggle('hidden',!on);if(on)render()}
async function login(){
  const pw=$('adminPassword').value;let ok=false;
  if(DB_ON()){try{ok=await rpc('admin_login',{p_pass:pw})}catch(e){toast('Gagal terhubung ke server.','err');return}}else ok=pw===PASS;
  if(ok){ADMIN_PW=pw;sessionStorage.setItem(SESSION,pw);show(true);pull(true)}else{toast('Kata sandi salah.','err');$('adminPassword').select()}
}
$('loginBtn').onclick=login;
$('adminPassword').addEventListener('keydown',e=>{if(e.key==='Enter')login()});
$('logoutBtn').onclick=()=>{ADMIN_PW='';lastSnap='';sessionStorage.removeItem(SESSION);$('adminPassword').value='';show(false)};

function renderDonut(c,total){
  let acc=0,h='<circle cx="50" cy="50" r="38" stroke="#eef3f9"/>';
  if(total)for(const k of Object.keys(SC)){const len=c[k]/total*100;if(len>0){h+=`<circle cx="50" cy="50" r="38" pathLength="100" stroke="${SC[k]}" stroke-dasharray="${len} ${100-len}" stroke-dashoffset="${-acc}"/>`;acc+=len}}
  $('donutSvg').innerHTML=h;
  $('donutPct').textContent=total?Math.round(c.Hadir/total*100)+'%':'0%';
}
function renderBars(date,rs,recs){
  const end=parseYmd(date);let h='';
  for(let i=6;i>=0;i--){
    const d=new Date(end);d.setDate(d.getDate()-i);const k=ymd(d),n=rs.length?rowsFor(k,rs,recs).filter(r=>r.status==='Hadir').length:0,pct=rs.length?Math.round(n/rs.length*100):0;
    h+=`<button class="bar-col ${k===date?'sel':''}" data-d="${k}" title="${n} hadir"><em>${n}</em><div class="col" style="height:${Math.max(pct*1.3,6)}px"></div><small>${d.toLocaleDateString('id-ID',{weekday:'short'})}</small></button>`;
  }
  $('bars').innerHTML=h;
}

function render(){
  if($('dashboard').classList.contains('hidden'))return;
  const date=$('filterDate').value||today(),d=parseYmd(date),rs=roster(),recs=getRecords(),all=rowsFor(date,rs,recs),c=counts(all);
  $('dateLabel').textContent=longDate(d);
  $('totalHadir').textContent=c.Hadir;$('totalIzin').textContent=c.Izin;$('totalSakit').textContent=c.Sakit;$('totalAlpa').textContent=c['Belum Absen'];$('totalRoster').textContent=rs.length;
  $('pctHadir').textContent=rs.length?Math.round(c.Hadir/rs.length*100)+'% dari seluruh siswa':'belum ada siswa terdaftar';
  $('weekendNote').hidden=![0,6].includes(d.getDay());
  renderDonut(c,rs.length);renderBars(date,rs,recs);

  const cur=$('classFilter').value,classes=[...new Set(rs.map(s=>s.kelas))].sort();
  $('classFilter').innerHTML='<option value="">Semua kelas</option>'+classes.map(k=>`<option ${k===cur?'selected':''}>${esc(k)}</option>`).join('');

  const q=norm($('searchInput').value),kf=$('classFilter').value;
  view=all.filter(r=>(!q||norm(r.name).includes(q))&&(!kf||r.kelas===kf)&&(!statusF||r.status===statusF)).sort((a,b)=>a.name.localeCompare(b.name));
  $('countLabel').textContent=`Menampilkan ${view.length} dari ${all.length} siswa`;
  $('adminBody').innerHTML=view.length?view.map((r,i)=>`<tr><td>${i+1}</td><td><div class="name-cell"><span class="avatar-sm" style="background:${colorFor(r.name)}">${esc(initial(r.name))}</span>${esc(r.name)}</div></td><td>${esc(r.kelas)}</td><td><span class="pill ${pillClass(r.status)}">${esc(r.status)}</span></td><td>${esc(r.rec?r.rec.time:'-')}</td><td>${esc(r.rec?.note||'-')}</td><td class="act-col"><select class="act-select" data-i="${i}" aria-label="Ubah status ${esc(r.name)}">${Object.keys(SC).map(s=>`<option ${s===r.status?'selected':''}>${s}</option>`).join('')}</select></td></tr>`).join(''):`<tr><td colspan="7" class="empty">${rs.length?'Tidak ada siswa yang cocok dengan filter ini.':'Belum ada siswa. Tambahkan lewat "Kelola daftar siswa" atau tunggu siswa mengisi absensi.'}</td></tr>`;
  $('rosterInfo').textContent=`${rs.length} siswa terdaftar · ${recs.length} catatan absensi`;
}

async function setStatus(s,date,status){
  if(DB_ON()){
    try{await rpc('admin_set_status',{p_pass:ADMIN_PW,p_date:date,p_name:s.name,p_kelas:s.kelas,p_status:status});toast(`${s.name}: ${status}`,'ok');pull(true)}
    catch(e){toast('Gagal menyimpan ke server.','err');render()}
    return;
  }
  let recs=getRecords();const i=recs.findIndex(r=>r.date===date&&same(r,s));
  if(status==='Belum Absen'){if(i>-1)recs.splice(i,1)}
  else if(i>-1){recs[i].status=status;recs[i].note=recs[i].note||'Diubah admin'}
  else recs.push({id:Date.now(),date,time:timeNow(),name:s.name,kelas:s.kelas,status,note:'Dicatat admin'});
  if(saveRecords(recs)){toast(`${s.name}: ${status}`,'ok');render()}
}
$('adminBody').addEventListener('change',e=>{if(e.target.matches('.act-select')){const r=view[+e.target.dataset.i];if(r)setStatus(r,$('filterDate').value||today(),e.target.value)}});
$('bars').addEventListener('click',e=>{const b=e.target.closest('.bar-col');if(b){$('filterDate').value=b.dataset.d;render()}});
$('statusChips').onclick=e=>{const b=e.target.closest('.chip');if(!b)return;statusF=b.dataset.f;document.querySelectorAll('#statusChips .chip').forEach(x=>x.classList.toggle('on',x===b));render()};
$('filterDate').onchange=render;$('searchInput').oninput=render;$('classFilter').onchange=render;
window.addEventListener('storage',render);$('printBtn').onclick=()=>window.print();

async function addStudents(list){
  if(DB_ON()){const ok=list.filter(s=>s.name&&s.kelas);
    try{await rpc('admin_add_roster',{p_pass:ADMIN_PW,p_list:ok});toast(`${ok.length} siswa diproses.`,'ok');pull(true)}catch(e){toast('Gagal menyimpan ke server.','err')}
    return}
  const cur=read(ROSTER_KEY,[]),known=new Set(roster().map(s=>norm(s.name)+'|'+norm(s.kelas)));let n=0;
  list.forEach(s=>{const k=norm(s.name)+'|'+norm(s.kelas);if(s.name&&s.kelas&&!known.has(k)){cur.push(s);known.add(k);n++}});
  if(write(ROSTER_KEY,cur)){toast(n?`${n} siswa ditambahkan.`:'Tidak ada siswa baru (mungkin sudah terdaftar).',n?'ok':'err');render()}
}
$('addOne').onclick=()=>{const s={name:$('rName').value.trim(),kelas:$('rClass').value.trim()};if(!s.name||!s.kelas){toast('Isi nama dan kelas.','err');return}addStudents([s]);$('rName').value='';$('rName').focus()};
$('addBulk').onclick=()=>{
  const list=$('rBulk').value.split(/\r?\n/).map(l=>l.trim()).filter(Boolean).map(l=>{const i=l.lastIndexOf(',');return i>0?{name:l.slice(0,i).trim(),kelas:l.slice(i+1).trim()}:{name:'',kelas:''}});
  if(!list.some(s=>s.name)){toast('Gunakan format: Nama, Kelas (satu per baris).','err');return}
  addStudents(list);$('rBulk').value='';
};
$('resetAll').onclick=async()=>{if(confirm('Hapus SEMUA data absensi dan daftar siswa di browser DAN di database online? Tindakan ini tidak bisa dibatalkan.')){if(DB_ON()){try{await rpc('admin_reset',{p_pass:ADMIN_PW})}catch(e){toast('Gagal menghapus di server.','err');return}}localStorage.removeItem(KEY);localStorage.removeItem(ROSTER_KEY);lastSnap='';toast('Semua data dihapus.','ok');render()}};

$('exportBtn').onclick=()=>{
  const date=$('filterDate').value||today(),rows=rowsFor(date);
  const data=[['Tanggal','Nama','Kelas','Status','Waktu','Keterangan'],...rows.map(r=>[date,r.name,r.kelas,r.status,r.rec?r.rec.time:'',r.rec?.note||''])];
  const csv=data.map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'})),a=document.createElement('a');
  a.href=url;a.download=`absensi-${date}.csv`;a.click();URL.revokeObjectURL(url);toast('CSV diunduh.','ok');
};

$('filterDate').value=today();
async function pull(force){
  if(!DB_ON()||!ADMIN_PW)return;
  try{
    const [a,b]=await Promise.all([rpc('admin_records',{p_pass:ADMIN_PW}),rpc('admin_roster',{p_pass:ADMIN_PW})]);
    const snap=JSON.stringify([a,b]);if(snap===lastSnap&&!force)return;lastSnap=snap;
    write(KEY,a.map(fromDb));write(ROSTER_KEY,b.map(x=>({name:x.name,kelas:x.kelas})));render();
  }catch(e){if(String(e.message).includes('FORBIDDEN')){$('logoutBtn').click();toast('Sesi berakhir, silakan masuk lagi.','err')}}
}
setInterval(pull,5000);
const sp=sessionStorage.getItem(SESSION);
if(sp&&(DB_ON()||sp===PASS)){ADMIN_PW=sp;show(true);pull(true)}
