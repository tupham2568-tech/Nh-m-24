let adminTab='report';
function renderAdmin(){
  const u=curAdmin();const box=document.getElementById('adminBox');
  document.getElementById('adminLogin').classList.toggle('active',!u);document.getElementById('adminPanel').classList.toggle('active',!!u);
  document.getElementById('adminUser').textContent=u?u.name:'Khách';document.getElementById('adminLogoutBtn').style.display=u?'':'none';
  if(!u){box.innerHTML='';renderAdminLogin();return}
  if(!u||u.role!=='admin'){box.innerHTML='<div class="panel empty"><div class="big">🔒</div>Trang quản lý dành cho admin.<br>Vui lòng đăng nhập bằng tài khoản <b>tài khoản đã được cấp quyền</b>.</div>';return}
  const rev=orders.filter(o=>o.status!=='Đã hủy').reduce((s,o)=>s+o.total,0);
  const byCat={};PRODUCTS.forEach(x=>{byCat[x.cat]=(byCat[x.cat]||0)+x.stock});
  box.innerHTML=`<h2 class="sec">⚙️ Quản lý cửa hàng</h2>
  <div class="tabs">
   ${[['report','📊 Báo cáo kinh doanh'],['prod','📦 Sản phẩm'],['ord','🧾 Đơn hàng'],['cus','👥 Khách hàng'],['storage','☁️ Dữ liệu & đồng bộ']].map(([k,l])=>`<button class="chip ${adminTab===k?'active':''}" onclick="adminTab='${k}';renderAdmin()">${l}</button>`).join('')}
  </div>
  <div id="adminBody"></div>`;
  const b=document.getElementById('adminBody');
  if(adminTab==='report'){
    const max=Math.max(1,...Object.values(byCat));
    b.innerHTML=`<div class="stats">
      <div class="stat"><div class="lbl">Doanh thu (đơn hiệu lực)</div><div class="val">${vnd(rev)}</div></div>
      <div class="stat"><div class="lbl">Tổng đơn hàng</div><div class="val">${orders.length}</div></div>
      <div class="stat"><div class="lbl">Đang hiển thị</div><div class="val">${PRODUCTS.filter(x=>x.show!==false).length}/${PRODUCTS.length} SP</div></div>
      <div class="stat"><div class="lbl">Khách đã đăng ký</div><div class="val">${users.filter(x=>x.role!=='admin').length}</div></div></div>
     <h3 class="sec">Tồn kho theo danh mục</h3>
     <div class="panel"><div class="bar-chart">${Object.entries(byCat).map(([c,n])=>`<div class="bar-w"><div class="bar" style="height:${n/max*100}%" title="${n}"></div><div class="bar-lbl">${c} (${n})</div></div>`).join('')}</div></div>
     <h3 class="sec">Đơn hàng mới nhất</h3>
     <div style="overflow:auto">${ordersTable(orders.slice(-5).reverse())}</div>`;
  }
  if(adminTab==='prod'){
    b.innerHTML=`<button class="btn" style="margin-bottom:14px" onclick="productModal()">＋ Thêm sản phẩm mới</button>
     <div style="overflow:auto"><table class="tbl"><tr><th>Ảnh</th><th>Sản phẩm</th><th>Danh mục</th><th>Giá (₫)</th><th>Tồn kho</th><th>Hiển thị</th><th>Nguồn</th><th>Thao tác</th></tr>
     ${PRODUCTS.map(x=>`<tr><td><div class="admin-product-thumb">${productThumb(x)}</div></td><td><b>${esc(x.name)}</b></td><td>${esc(x.cat)}</td><td>${vnd(x.price)}</td><td>${x.stock}</td>
      <td><button class="btn sm ghost" onclick="toggleShow(${x.id})">${x.show===false?'🚫 Đang ẩn':'👁 Đang bán'}</button></td>
      <td>${x.verified?'<span class="verified">✓ apple.com/vn</span>':'—'}</td>
      <td><button class="btn sm ghost" onclick="productModal(${x.id})">Sửa</button> <button class="btn sm ghost" onclick="productModal(${x.id});document.getElementById('productImageInput').click()">📷 ${x.image?'Đổi ảnh':'Thêm ảnh'}</button></td></tr>`).join('')}</table></div>`;
  }
  if(adminTab==='ord'){b.innerHTML=`<div style="overflow:auto">${ordersTable(orders.slice().reverse(),true)}</div>`;}
  if(adminTab==='storage'){renderStoragePanel(b);}
  if(adminTab==='cus'){
    b.innerHTML=`<div style="overflow:auto"><table class="tbl"><tr><th>Khách hàng</th><th>Email</th><th>Điện thoại</th><th>Số đơn</th><th>Chi tiêu</th></tr>
     ${users.filter(x=>x.role!=='admin').map(x=>{const os=orders.filter(o=>o.email===x.email);return `<tr><td><b>${esc(x.name)}</b></td><td>${x.email}</td><td>${esc(x.phone||'—')}</td><td>${os.length}</td><td>${vnd(os.reduce((s,o)=>s+o.total,0))}</td></tr>`}).join('')}</table></div>`;
  }
}
function ordersTable(list,manage){
  return `<table class="tbl"><tr><th>Mã đơn</th><th>Khách hàng</th><th>Ngày</th><th>Tổng tiền</th><th>Trạng thái</th>${manage?'<th>Cập nhật</th>':''}</tr>
  ${list.map(o=>`<tr><td><b>#${esc(o.id)}</b></td><td>${esc(o.name)}<div style="color:var(--muted);font-size:12px">${esc(o.email)}</div></td><td>${esc(o.created)}</td><td>${vnd(o.total)}</td>
   <td><span class="status-pill st-${statusClass(o.status)}">${o.status}</span></td>
   ${manage?`<td><select class="sel" style="padding:6px" onchange="setOrderStatus('${esc(o.id)}',this.value)">
     ${[...ORDER_FLOW,'Đã hủy'].map(s=>`<option ${s===o.status?'selected':''}>${s}</option>`).join('')}</select></td>`:''}</tr>`).join('')||'<tr><td colspan="6" style="text-align:center;color:var(--muted)">Chưa có đơn hàng</td></tr>'}</table>`;
}
// setOrderStatus được triển khai trong cloud.js

// toggleShow được triển khai trong cloud.js

function productModal(id){
  if(!curAdmin())return;
  resetProductImage(id?p(id)?.image||'':'');
  editingProduct=id||null;
  editingVersion=id?p(id)?.version||1:0;
  const x=id?p(id):{name:'',cat:'iPhone',price:0,stock:0,emoji:'📦',desc:''};
  document.getElementById('modalBox').innerHTML=`<h2 class="sec" style="font-size:22px">${id?'✏️ Sửa sản phẩm':'＋ Thêm sản phẩm'}</h2>
   <div class="field" style="margin-bottom:10px"><label>Tên sản phẩm</label><input id="fmName" value="${esc(x.name)}"></div>
   <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
    <div class="field"><label>Danh mục</label><select id="fmCat" class="sel" style="width:100%">${CATS.slice(1).map(c=>`<option ${c===x.cat?'selected':''}>${c}</option>`).join('')}</select></div>
    <div class="field"><label>Emoji</label><input id="fmEmoji" value="${esc(x.emoji)}"></div>
    <div class="field"><label>Giá (VND)</label><input id="fmPrice" type="number" value="${x.price}"></div>
    <div class="field"><label>Tồn kho</label><input id="fmStock" type="number" value="${x.stock}"></div></div>
   <div class="field" style="margin-bottom:16px"><label>Mô tả</label><textarea id="fmDesc" rows="2">${esc(x.desc)}</textarea></div>
   <div class="field product-image-field"><label for="productImageInput">📷 Thêm ảnh sản phẩm</label><p class="image-help">Chọn PNG, JPEG hoặc WebP, tối đa 500 KB. Ảnh được tải lên Supabase Storage khi lưu sản phẩm.</p><input id="productImageInput" type="file" accept="image/png,image/jpeg,image/webp" onchange="uploadProductImage(this)"><div id="uploadPreview" class="upload-preview" aria-live="polite">${x.image?`<img src="${esc(x.image)}" alt="Ảnh sản phẩm">`:'<span>Chưa có ảnh — đang dùng emoji của sản phẩm</span>'}</div><button type="button" class="btn sm ghost" onclick="clearProductImage()">Bỏ ảnh</button></div>
   <button class="btn" style="width:100%" id="saveProductBtn" onclick="saveProduct()">${id?'Lưu thay đổi':'Thêm sản phẩm'}</button>
   ${id?`<button class="btn danger" style="width:100%;margin-top:10px" onclick="deleteProduct(${id})">Xóa sản phẩm</button>`:''}`;
  document.getElementById('modalBg').classList.add('open');
}
// saveProduct được triển khai trong cloud.js

// deleteProduct được triển khai trong cloud.js

function renderAdminLogin(){
 document.getElementById('adminLoginBox').innerHTML=`<div class="panel admin-login-card"><h1>Đăng nhập quản trị</h1><p>Tài khoản khách hàng không dùng tại khu vực này.</p><form onsubmit="event.preventDefault();adminLogin()"><div class="field"><label for="adEmail">Email quản trị</label><input id="adEmail" type="email" autocomplete="username" required></div><div class="field"><label for="adPass">Mật khẩu</label><input id="adPass" type="password" autocomplete="current-password" required></div><button class="btn" type="submit">Đăng nhập quản trị</button></form><p class="demo-note">Dùng tài khoản đã được cấp quyền quản trị trên máy chủ.</p><a href="index.html">← Về trang khách hàng</a></div>`;
}
// adminLogin được triển khai trong cloud.js

// adminLogout được triển khai trong cloud.js
