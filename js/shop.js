let activeCat='Tất cả';
function renderChips(){
  document.getElementById('chips').innerHTML=CATS.map(c=>`<button class="chip ${c===activeCat?'active':''}" onclick="activeCat='${c}';renderChips();renderGrid()">${c}</button>`).join('');
}
function renderGrid(){
  const q=(document.getElementById('q')?.value||'').toLowerCase();
  let list=PRODUCTS.filter(x=>x.show!==false);
  if(activeCat!=='Tất cả')list=list.filter(x=>x.cat===activeCat);
  if(q)list=list.filter(x=>x.name.toLowerCase().includes(q)||x.desc.toLowerCase().includes(q));
  const s=document.getElementById('sort').value;
  if(s==='asc')list.sort((a,b)=>a.price-b.price); if(s==='desc')list.sort((a,b)=>b.price-a.price);
  document.getElementById('grid').innerHTML=list.map(x=>{
    const rv=reviews[x.id]||[];const star=rv.length?(rv.reduce((s,r)=>s+r.star,0)/rv.length).toFixed(1):'—';
    const disc=x.old?Math.round((1-x.price/x.old)*100):0;
    return `<div class="card" onclick="openDetail(${x.id})">
      ${disc?`<span class="tag">-${disc}%</span>`:x.isNew?'<span class="tag new">Mới</span>':''}
      <div class="thumb">${productThumb(x)}</div>
      <div class="body"><div class="cat">${esc(x.cat)}${x.verified?' <span class="verified">✓ Xác minh</span>':''}</div><h3>${esc(x.name)}</h3>
      <div class="stars" style="font-size:12px">★ ${star} <span style="color:var(--muted)">(${rv.length})</span></div>
      <div style="margin-top:6px"><span class="price" title="Giá tham khảo apple.com/vn">${vnd(x.price)}</span>${x.old?`<span class="old">${vnd(x.old)}</span>`:''}</div></div></div>`;
  }).join('')||'<div class="empty" style="grid-column:1/-1"><div class="big">🔍</div>Không tìm thấy sản phẩm phù hợp.</div>';
}
function openDetail(id){
  const x=p(id);if(!x||x.show===false)return toast('Sản phẩm không còn được bán');const rv=reviews[id]||[];
  const avg=rv.length?(rv.reduce((s,r)=>s+r.star,0)/rv.length):0;
  document.getElementById('detailBox').innerHTML=`
   <a href="javascript:go('home')" style="font-size:14px">‹ Tiếp tục mua sắm</a>
   <div class="detail" style="margin-top:12px">
    <div class="thumb">${productThumb(x)}</div>
    <div><div class="cat" style="color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.05em">${esc(x.cat)}</div>
     <h2>${esc(x.name)}</h2>
     <div class="meta"><span class="stars">★ ${avg?avg.toFixed(1):'—'}</span><span>${rv.length} đánh giá</span><span class="stock">● ${x.stock>0?'Còn '+x.stock+' sản phẩm':'Tạm hết hàng'}</span>${x.verified?'<a href="https://www.apple.com/vn/" target="_blank" rel="noopener">✓ Giá xác minh từ apple.com/vn</a>':''}</div>
     <div class="price" title="Intl.NumberFormat locale vi-VN, currency VND">${vnd(x.price)}${x.old?`<span class="old" style="font-size:16px">${vnd(x.old)}</span>`:''}</div>
     <p class="desc">${esc(x.desc)}</p>
     <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
      <div class="qty"><button onclick="dq(${x.id})">−</button><input id="qty${x.id}" value="1" readonly><button onclick="iq(${x.id})">+</button></div>
      <button class="btn" ${x.stock<=0?'disabled':''} onclick="addToCart(${x.id})">🛒 Thêm vào giỏ hàng</button>
      <button class="btn ghost" onclick="buyNow(${x.id})">Mua ngay</button>
     </div>
     <h3 class="sec">Đánh giá sản phẩm</h3>
     <div>${rv.map(r=>`<div class="review"><div class="stars" style="font-size:13px">${'★'.repeat(r.star)}${'☆'.repeat(5-r.star)}</div><div class="who">${esc(r.user)} · <span style="color:var(--muted);font-weight:400">${r.date}</span></div>${r.text?`<div>${esc(r.text)}</div>`:''}</div>`).join('')||'<p style="color:var(--muted);font-size:14px">Chưa có đánh giá — mua và là người đầu tiên đánh giá!</p>'}</div>
     <button class="btn sm ghost" style="margin-top:10px" onclick="reviewModal(${x.id})">✍️ Viết đánh giá</button>
    </div></div>`;
  go('detail');
}
function dq(id){const el=document.getElementById('qty'+id);el.value=Math.max(1,+el.value-1)}
function iq(id){const el=document.getElementById('qty'+id);el.value=Math.min(p(id).stock,+el.value+1)}
// addToCart được triển khai trong cloud.js

async function buyNow(id){if(await addToCart(id))go('cart')}

function updateBadge(){const n=cart.reduce((s,c)=>s+c.qty,0);const b=document.getElementById('cartBadge');b.textContent=n;b.style.display=n?'block':'none'}
function renderCart(){
  cart=loadCart();updateBadge();const box=document.getElementById('cartBox');
  if(!cart.length){box.innerHTML='<div class="panel empty"><div class="big">🛒</div>Giỏ hàng của bạn đang trống.<br><br><button class="btn" onclick="go(\'home\')">Mua sắm ngay</button></div>';return}
  const sub=cart.reduce((s,c)=>s+p(c.id).price*c.qty,0);
  box.innerHTML=`<h2 class="sec">🛒 Giỏ hàng của bạn</h2>
  <div class="panel">
   ${cart.map(c=>{const x=p(c.id);return `<div class="cart-line">
     <div class="thumb" onclick="openDetail(${x.id})">${productThumb(x)}</div>
     <div class="grow"><b>${esc(x.name)}</b><div style="color:var(--muted);font-size:13px">${esc(x.cat)}${x.verified?' <span class="verified">✓</span>':''}</div>
      <div class="qty" style="margin-top:8px;width:110px"><button onclick="cartQty(${x.id},-1)">−</button><input value="${c.qty}" readonly><button onclick="cartQty(${x.id},1)">+</button></div></div>
     <div style="text-align:right"><div class="line-total">${vnd(x.price*c.qty)}</div><a href="javascript:void(0)" style="font-size:13px" onclick="removeCart(${x.id})">Xóa</a></div></div>`}).join('')}
   <div style="max-width:360px;margin-left:auto;margin-top:16px">
    <div class="sum-row"><span>Tạm tính</span><b>${vnd(sub)}</b></div>
    <div class="sum-row"><span>Phí vận chuyển (tạm tính)</span><b>${vnd(SHIP_FEE)}</b></div>
    <div class="sum-row total"><span>Tổng cộng</span><span>${vnd(sub+SHIP_FEE)}</span></div>
    <button class="btn" style="width:100%;margin-top:14px" onclick="go('checkout')">Tiến hành đặt hàng →</button>
   </div></div>`;
}
// cartQty được triển khai trong cloud.js

// removeCart được triển khai trong cloud.js

let payMethod='COD';let appliedPromo=null;let checkoutDraft={};
function rememberCheckout(){for(const id of ['ckName','ckPhone','ckAddr','ckNote']){const el=document.getElementById(id);if(el)checkoutDraft[id]=el.value}}
function renderCheckout(){
  cart=loadCart();updateBadge();const box=document.getElementById('checkoutBox');const u=cur();
  if(!u){box.innerHTML='<div class="panel">Vui lòng đăng nhập để đặt hàng và theo dõi đơn trên mọi thiết bị.<br><br><button class="btn" onclick="go(\'login\')">Đăng nhập</button></div>';return}
  if(!cart.length){box.innerHTML='<div class="panel empty"><div class="big">🛒</div>Giỏ hàng trống.</div>';return}
  const sub=cart.reduce((s,c)=>s+p(c.id).price*c.qty,0);
  box.innerHTML=`<h2 class="sec">💳 Thanh toán</h2>
  <div style="display:grid;grid-template-columns:1.4fr 1fr;gap:20px">
   <div class="panel">
    <h3 class="sec" style="margin-top:0">1. Thông tin nhận hàng</h3>
    <div class="form-grid">
     <div class="field"><label>Họ tên người nhận *</label><input id="ckName" value="${esc(u?u.name:'')}"></div>
     <div class="field"><label>Số điện thoại *</label><input id="ckPhone" value="${esc(u?u.phone||'':'')}"></div>
     <div class="field" style="grid-column:1/-1"><label>Địa chỉ giao hàng *</label><input id="ckAddr" placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" value="${esc(u?u.address||'':'')}"></div>
     <div class="field" style="grid-column:1/-1"><label>Ghi chú</label><textarea id="ckNote" rows="2" placeholder="VD: Giao giờ hành chính"></textarea></div>
    </div>
    <h3 class="sec">2. Phương thức thanh toán</h3>
    <div class="pay-opts">
     ${[['COD','💵 Thanh toán khi nhận hàng'],['BANK','🏦 Chuyển khoản ngân hàng'],['MOMO','🟣 Ví MoMo']].map(([k,l])=>`<div class="pay-opt ${payMethod===k?'active':''}" onclick="rememberCheckout();payMethod='${k}';renderCheckout()">${l}</div>`).join('')}
    </div>
    <h3 class="sec">3. Mã khuyến mãi (Epic 06)</h3>
    <div style="display:flex;gap:10px"><input id="promoInput" placeholder="Nhập mã giảm giá…" style="flex:1;border:1px solid var(--border);border-radius:12px;padding:11px 14px;font-size:15px">
    <button class="btn ghost" onclick="applyPromo()">Áp dụng</button></div>
    <div style="font-size:12px;color:var(--muted);margin-top:8px">Mã hiện có: ${PROMOS.map(x=>`<b>${x.code}</b> — ${x.note}`).join(' · ')}</div>
   </div>
   <div class="panel" style="align-self:start;position:sticky;top:80px">
    <h3 class="sec" style="margin-top:0">Đơn hàng</h3>
    ${cart.map(c=>`<div class="sum-row" style="font-size:14px"><span>${esc(p(c.id).emoji)} ${esc(p(c.id).name)} ×${c.qty}</span><b>${vnd(p(c.id).price*c.qty)}</b></div>`).join('')}
    <div class="sum-row"><span>Tạm tính</span><b>${vnd(sub)}</b></div>
    <div class="sum-row" id="promoRow">${appliedPromo?`<span>Mã <b>${appliedPromo.code}</b> ✓</span><b id="promoVal"></b>`:'<span>Giảm giá</span><b>—</b>'}</div>
    <div class="sum-row" id="shipRow"><span>Vận chuyển</span><b id="shipVal">${vnd(SHIP_FEE)}</b></div>
    <div class="sum-row total"><span>Tổng thanh toán</span><span id="grandTotal"></span></div>
    <button class="btn" style="width:100%;margin-top:14px" onclick="placeOrder()">✓ Xác nhận đặt hàng</button>
   </div></div>`;
  for(const [id,value] of Object.entries(checkoutDraft)){const el=document.getElementById(id);if(el)el.value=value}
  recalcTotals(sub);
}
function applyPromo(){
  const code=promoInput.value.trim().toUpperCase();
  const pr=PROMOS.find(x=>x.code===code);
  if(!pr)return toast('Mã giảm giá không hợp lệ');
  rememberCheckout();appliedPromo=pr;toast('Áp dụng mã '+code+' thành công!');renderCheckout();
}
function recalcTotals(sub){
  let disc=0,ship=SHIP_FEE;
  if(appliedPromo){
    if(appliedPromo.type==='percent')disc=Math.round(sub*appliedPromo.value/100);
    if(appliedPromo.type==='amount'&&sub>=20000000)disc=appliedPromo.value;
    if(appliedPromo.type==='ship')ship=0;
  }
  if(document.getElementById('promoVal'))document.getElementById('promoVal').textContent=disc?'-'+vnd(disc):'Không đủ điều kiện';
  document.getElementById('shipVal').textContent=ship?vnd(ship):'Miễn phí';
  document.getElementById('grandTotal').textContent=vnd(sub-disc+ship);
  return {disc,ship};
}
// placeOrder được triển khai trong cloud.js

function renderOrders(){
  const box=document.getElementById('ordersBox');const u=cur();
  let list=orders.filter(canAccessOrder);
  if(!list.length){box.innerHTML='<div class="panel empty"><div class="big">📦</div>Chưa có đơn hàng nào.<br><br><button class="btn" onclick="go(\'home\')">Mua sắm ngay</button></div>';return}
  box.innerHTML=`<h2 class="sec">📦 Đơn hàng của tôi</h2>`+list.slice().reverse().map(orderCard).join('');
}
function canAccessOrder(o){const u=cur();return u?o.email===u.email:o.email==='khach-le'&&LS.get('guestOrders',[]).includes(o.id)}
function orderCard(o){
  const idx=ORDER_FLOW.indexOf(o.status);const canceled=o.status==='Đã hủy';
  return `<div class="panel" style="margin-bottom:16px">
   <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;align-items:center">
    <b>📦 #${esc(o.id)}</b><span class="status-pill st-${statusClass(o.status)}">${o.status}</span></div>
   <div style="font-size:13px;color:var(--muted);margin:4px 0">${esc(o.created)} · ${o.pay==='COD'?'💵 COD':o.pay==='BANK'?'🏦 Chuyển khoản':'🟣 MoMo'} · ${o.items.reduce((s,i)=>s+i.qty,0)} sản phẩm</div>
   ${canceled?'':`<div class="timeline">${ORDER_FLOW.map((s,i)=>`<div class="tl-step ${i<=idx?'done':''}"><div class="dot">${i<=idx?'✓':i+1}</div>${s}</div>`).join('')}</div>`}
   ${o.items.map(i=>`<div style="font-size:14px;padding:3px 0">${esc(i.emoji)} ${esc(i.name)} ×${i.qty}</div>`).join('')}
   <div class="sum-row total"><span>Tổng tiền</span><span>${vnd(o.total)}</span></div>
   ${['Đặt hàng','Đã xác nhận'].includes(o.status)?`<button class="btn sm danger" onclick="cancelOrder('${esc(o.id)}')">Hủy đơn hàng</button>`:''}
  </div>`;
}
function trackOrder(id){go('orders');setTimeout(()=>{const el=[...document.querySelectorAll('#ordersBox b')].find(b=>b.textContent.includes(id));el?.scrollIntoView({behavior:'smooth',block:'center'})},100)}
// cancelOrder được triển khai trong cloud.js

function reviewModal(pid){
  if(!cur())return toast('Vui lòng đăng nhập để đánh giá sản phẩm');
  document.getElementById('modalBox').innerHTML=`<h2 class="sec" style="font-size:22px">✍️ Đánh giá sản phẩm</h2>
   <div class="field" style="margin-bottom:12px"><label>Số sao</label>
   <select id="rvStar" class="sel" style="width:100%"><option>5</option><option>4</option><option>3</option><option>2</option><option>1</option></select></div>
   <div class="field" style="margin-bottom:16px"><label>Nhận xét</label><textarea id="rvText" rows="3" placeholder="Sản phẩm tốt, giao hàng nhanh…"></textarea></div>
   <button class="btn" style="width:100%" onclick="submitReview(${pid})">Gửi đánh giá</button>`;
  document.getElementById('modalBg').classList.add('open');
}
// submitReview được triển khai trong cloud.js
