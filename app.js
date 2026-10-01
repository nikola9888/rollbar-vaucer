const SUPABASE_URL="https://iqqaquhzjjvgxktunjwm.supabase.co";
const SUPABASE_KEY="sb_publishable_YvNlBllWEl8SG8gizS_m-g_4Bxc58GS";
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const $=id=>document.getElementById(id);
const normalize=v=>String(v||"").trim().toUpperCase().replace(/\s+/g,"");

function dateOnly(d){return new Intl.DateTimeFormat("sr-RS",{day:"2-digit",month:"2-digit",year:"numeric"}).format(d)}
function renderQR(code){
  const box=$("qr"); box.innerHTML="";
  const target=location.origin+location.pathname+"?code="+encodeURIComponent(code);
  if(typeof QRCode==="function") new QRCode(box,{text:target,width:160,height:160,colorDark:"#000000",colorLight:"#ffffff",correctLevel:QRCode.CorrectLevel.M});
}
function showVoucher(v){
  $("voucherResult").classList.remove("hidden");
  $("resultCode").textContent=v.code;
  $("resultExpiry").textContent=dateOnly(new Date(v.expires_at));
  $("resultTitle").textContent=v.reward;
  const expired=v.status==="expired" || new Date(v.expires_at)<new Date();
  const used=v.status==="used";
  $("resultStatus").textContent=expired?"ISTEKAO":used?"ISKORIŠĆEN":"AKTIVAN";
  $("resultStatus").style.color=(expired||used)?"#999":"#ff6a00";
  renderQR(v.code);
  $("voucherResult").scrollIntoView({behavior:"smooth",block:"center"});
}
async function checkCode(){
  const code=normalize($("voucherCode").value);
  $("message").textContent="";
  if(!code){$("message").textContent="Unesi kod vaučera.";return}
  const {data,error}=await db.rpc("verify_voucher",{p_code:code});
  if(error||!data||!data.length){$("message").textContent="Vaučer nije pronađen.";return}
  showVoucher(data[0]); $("message").textContent="Vaučer je pronađen.";
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
async function renderList(){
  const list=$("voucherList");
  const {data,error}=await db.rpc("list_vouchers");
  if(error){list.innerHTML='<p style="color:#777">Nema pristupa administraciji.</p>';return}
  if(!data||!data.length){list.innerHTML='<p style="color:#666">Još nema vaučera.</p>';return}
  list.innerHTML=data.map(v=>{
    const expired=v.status==="active"&&new Date(v.expires_at)<new Date();
    const status=expired?"ISTEKAO":v.status==="used"?"ISKORIŠĆEN":"AKTIVAN";
    const disabled=status!=="AKTIVAN"?" disabled":"";
    return '<div class="list-item"><div><b>'+escapeHtml(v.code)+'</b><small>'+escapeHtml(v.reward)+' · '+status+'</small></div><button data-code="'+escapeHtml(v.code)+'" class="use-btn"'+disabled+'>ISKORISTI</button></div>';
  }).join("");
  document.querySelectorAll(".use-btn").forEach(b=>b.onclick=()=>useVoucher(b.dataset.code));
}
async function useVoucher(code){
  if(!confirm("Iskoristiti vaučer "+code+"?"))return;
  const {data,error}=await db.rpc("use_voucher",{p_code:code});
  if(error){alert("Vaučer nije moguće iskoristiti.");return}
  await renderList(); showVoucher(data);
}
async function isAdmin(){
  const {data,error}=await db.rpc("is_admin");
  return !error&&data===true;
}
async function openAdmin(){
  $("adminPanel").classList.remove("hidden");
  const {data:{session}}=await db.auth.getSession();
  if(session&&await isAdmin()){
    $("loginPanel").classList.add("hidden"); $("dashboardPanel").classList.remove("hidden"); await renderList();
  }else{
    $("dashboardPanel").classList.add("hidden"); $("loginPanel").classList.remove("hidden");
  }
  $("adminPanel").scrollIntoView({behavior:"smooth"});
}
$("checkBtn").onclick=checkCode;
$("voucherCode").addEventListener("keydown",e=>{if(e.key==="Enter")checkCode()});
$("adminBtn").onclick=openAdmin;
$("loginBtn").onclick=async()=>{
  const email=$("adminEmail").value.trim(),password=$("adminPassword").value;
  $("loginMessage").textContent="";
  if(!email||!password){$("loginMessage").textContent="Unesi email i lozinku.";return}
  const {error}=await db.auth.signInWithPassword({email,password});
  if(error){$("loginMessage").textContent="Pogrešan email ili lozinka.";return}
  if(!(await isAdmin())){await db.auth.signOut();$("loginMessage").textContent="Ovaj nalog nema admin pristup.";return}
  $("loginPanel").classList.add("hidden");$("dashboardPanel").classList.remove("hidden");await renderList();
};
$("logoutBtn").onclick=async()=>{await db.auth.signOut();$("dashboardPanel").classList.add("hidden");$("loginPanel").classList.remove("hidden")};
$("refreshBtn").onclick=renderList;
$("createBtn").onclick=async()=>{
  const reward=$("reward").value.trim(),days=Math.max(1,Math.min(3650,Number($("days").value)||30));
  $("created").classList.remove("hidden");
  if(!reward){$("created").textContent="Unesi pogodnost.";return}
  const {data,error}=await db.rpc("create_voucher",{p_reward:reward,p_days:days});
  if(error){$("created").textContent="Nije moguće kreirati vaučer.";return}
  $("created").innerHTML="Kreiran: <b>"+escapeHtml(data.code)+"</b><br>Vredi do "+dateOnly(new Date(data.expires_at));
  $("reward").value=""; await renderList(); showVoucher(data);
};
const params=new URLSearchParams(location.search);
if(params.get("code")){$("voucherCode").value=normalize(params.get("code"));checkCode()}
