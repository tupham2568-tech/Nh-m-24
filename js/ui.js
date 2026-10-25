/* Tiện ích giao diện dùng chung cho hai trang. */
let toastTimer;
function toast(m){const t=document.getElementById('toast');if(!t)return;t.textContent=m;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2200)}
function closeModal(){document.getElementById('modalBg')?.classList.remove('open')}
function bindModalBg(){const bg=document.getElementById('modalBg');if(!bg||bg.dataset.bound)return;bg.dataset.bound='1';bg.addEventListener('click',e=>{if(e.target===bg)closeModal()});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()})}
function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function statusClass(s){return ({'Đặt hàng':'moi','Đã xác nhận':'xacnhan','Đang giao':'giao','Hoàn thành':'hoanthanh','Đã hủy':'huy'})[s]||'moi'}
function safeImage(value){return /^(https?:\/\/|data:image\/(png|jpeg|webp);base64,)/i.test(String(value||''))?String(value):''}
function productThumb(x){return safeImage(x.image)?`<img src="${esc(safeImage(x.image))}" alt="${esc(x.name)}" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span hidden>${esc(x.emoji||'📦')}</span>`:esc(x.emoji||'📦')}
function go(v){
 if(v==='admin'){location.href='admin.html';return}
 const target=document.getElementById('v-'+v);if(!target)return;
 document.querySelectorAll('.view').forEach(s=>s.classList.remove('active'));target.classList.add('active');
 document.querySelectorAll('[data-nav]').forEach(a=>a.classList.toggle('active',a.dataset.nav===v));window.scrollTo(0,0);
 const render={cart:'renderCart',checkout:'renderCheckout',orders:'renderOrders',login:'renderLogin',account:'renderAccount',home:'renderGrid'}[v];
 if(render&&typeof window[render]==='function')window[render]();
}
