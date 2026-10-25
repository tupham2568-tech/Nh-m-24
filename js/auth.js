function renderLogin(){
  const box=document.getElementById('loginBox');
  box.innerHTML=`<div class="panel"><h2 class="sec"> 🛡 Đăng nhập Apple Store VN</h2>
   <div class="field" style="margin-bottom:12px"><label>Email</label><input id="lgEmail" type="email" placeholder="ban@example.com"></div>
   <div class="field" style="margin-bottom:18px"><label>Mật khẩu</label><input id="lgPass" type="password" placeholder="••••••••"></div>
   <button class="btn" style="width:100%" onclick="login()">Đăng nhập</button>
   <p class="demo-note">Tài khoản được bảo vệ bằng Supabase Auth; không còn tài khoản demo mặc định.</p>
   <p class="center" style="margin-top:14px;font-size:14px;color:var(--muted)">Chưa có tài khoản? <a href="javascript:signupModal()">Đăng ký ngay</a></p>
   <p style="margin-top:12px;font-size:12px;color:var(--muted)">Khu vực dành cho khách hàng. Quản trị viên đăng nhập tại <a href="admin.html">trang quản trị</a>.</p></div>`;
}
function signupModal(){
  document.getElementById('modalBox').innerHTML=`<h2 class="sec" style="font-size:22px">📝 Tạo tài khoản</h2>
   <div class="field" style="margin-bottom:10px"><label>Họ tên</label><input id="suName" placeholder="Nguyễn Văn A"></div>
   <div class="field" style="margin-bottom:10px"><label>Email</label><input id="suEmail" type="email" placeholder="ban@example.com"></div>
   <div class="field" style="margin-bottom:10px"><label>Số điện thoại</label><input id="suPhone" placeholder="09xx xxx xxx"></div>
   <div class="field" style="margin-bottom:16px"><label>Mật khẩu</label><input id="suPass" type="password"></div>
   <button class="btn" style="width:100%" onclick="signup()">Đăng ký</button>`;
  document.getElementById('modalBg').classList.add('open');
}
// signup được triển khai trong cloud.js

// login được triển khai trong cloud.js

// logout được triển khai trong cloud.js

function updateAuthBtn(){
 const b=document.getElementById('authBtn'),u=cur();if(!b)return;
 b.textContent=u?'👤 '+u.name.split(' ')[0]:'Đăng nhập';b.onclick=()=>go(u?'account':'login');
}

function renderAccount(){
  const u=cur();const box=document.getElementById('accountBox');
  if(!u){box.innerHTML='<div class="panel empty"><div class="big">🔐</div>Vui lòng đăng nhập để xem tài khoản.<br><br><button class="btn" onclick="go(\'login\')">Đăng nhập</button></div>';return}
  const myOrders=orders.filter(o=>o.email===u.email);
  box.innerHTML=`<div class="panel"><h2 class="sec">👤 Tài khoản của tôi</h2>
   <div class="form-grid">
    <div class="field"><label>Họ tên</label><input id="acName" value="${esc(u.name)}"></div>
    <div class="field"><label>Email (không đổi)</label><input value="${esc(u.email)}" disabled></div>
    <div class="field"><label>Số điện thoại</label><input id="acPhone" value="${esc(u.phone||'')}"></div>
    <div class="field"><label>Địa chỉ</label><input id="acAddr" value="${esc(u.address||'')}"></div>
   </div>
   <div style="margin-top:16px;display:flex;gap:10px"><button class="btn" onclick="updateAccount()">Cập nhật thông tin</button>
   
   <button class="btn ghost" onclick="logout()">Đăng xuất</button></div>
   <h3 class="sec">Đơn hàng gần đây (${myOrders.length})</h3>
   ${myOrders.slice(-3).reverse().map(o=>`<div style="padding:10px 0;border-bottom:1px solid #eee;font-size:14px">📦 #${o.id} — ${vnd(o.total)} — <span class="status-pill st-${statusClass(o.status)}">${o.status}</span></div>`).join('')||'<p style="color:var(--muted);font-size:14px">Chưa có đơn hàng nào.</p>'}
  </div>`;
}
// updateAccount được triển khai trong cloud.js

// fillDemoCustomer được triển khai trong cloud.js
