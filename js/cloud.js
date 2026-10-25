/* Supabase adapter. No service key, no shared JSON blob, no fake offline success. */
let db=null, cloudReady=false, cloudUser=null, cloudAdmin=false, cartVersion=0;
let cloudBusy=false, refreshing=false, refreshTimer=null, recoveryMode=false;
let lastSnapshot='', checkoutRequest=null;
const isAdminPage=document.body.classList.contains('admin');
const $=id=>document.getElementById(id);
function cloudStatus(text,bad=false){const el=$('cloudStatus');if(el){el.textContent=text;el.classList.toggle('cloud-error',bad)}}
function failMessage(error){console.error(error);return error?.message||'Không kết nối được máy chủ. Hãy kiểm tra mạng và thử lại.'}
function mustReady(){if(!cloudReady||!db)throw new Error('Chưa kết nối cơ sở dữ liệu. Xem hướng dẫn và điền js/config.js trước.');}
async function query(q){const {data,error}=await q;if(error)throw error;return data}
async function allRows(table,columns='*',sort='id'){
 let result=[],offset=0;
 while(true){const chunk=await query(db.from(table).select(columns).order(sort).range(offset,offset+499));result.push(...chunk);if(chunk.length<500)break;offset+=500;if(offset>100000)throw new Error('Dữ liệu quá lớn để tải trên trình duyệt; cần bổ sung phân trang.');}
 return result;
}
async function rpc(name,args={}){mustReady();return query(db.rpc(name,args))}
function profileUI(x){return {...x,created:new Date(x.created_at).toLocaleDateString('vi-VN'),role:cloudAdmin&&x.id===cloudUser?.id?'admin':'customer'}}
async function refreshCloud(redraw=true){
 if(!db||refreshing)return;
 refreshing=true;
 try{
  const productRows=await allRows('products');
  let profileRows=[],orderRows=[],cartRow=null;
  const reviewRows=await allRows('reviews','id,product_id,display_name,star,body,created_at');
  if(cloudUser){
   [profileRows,orderRows]=await Promise.all([allRows('profiles'),allRows('orders','*','created_at')]);
   if(!isAdminPage)cartRow=await query(db.from('carts').select('*').eq('user_id',cloudUser.id).maybeSingle());
  }
  PRODUCTS=productRows.map(x=>({...x.data,id:Number(x.id),stock:x.stock,version:x.version}));
  users=profileRows.map(profileUI);admins=cloudAdmin?users.filter(x=>x.id===cloudUser?.id).map(x=>({...x,role:'admin'})):[];
  orders=orderRows.map(x=>({...x.data,id:x.id}));
  reviews={};for(const r of reviewRows)(reviews[r.product_id]??=[]).push({user:r.display_name,star:r.star,text:r.body,date:new Date(r.created_at).toLocaleDateString('vi-VN')});
  session=cloudUser&&!isAdminPage?cloudUser.email:null;adminSession=cloudAdmin&&isAdminPage?cloudUser.email:null;
  if(!isAdminPage){cart=normalizeCart(cloudUser?(cartRow?.items||[]):LS.get('cart_guest',[]));cartVersion=cartRow?.version||0;}
  const snapshot=JSON.stringify([PRODUCTS,users,orders,reviews,cart,session,adminSession]);
  const changed=snapshot!==lastSnapshot;lastSnapshot=snapshot;
  cloudReady=true;cloudStatus('☁ Đã kết nối • '+new Date().toLocaleTimeString('vi-VN')+' • tự đồng bộ mỗi 15 giây');
  if(redraw&&changed)paintCloud();
 }catch(e){cloudStatus('⚠ Chưa đồng bộ: '+failMessage(e),true);throw e}
 finally{refreshing=false}
}
function paintCloud(force=false){
 if(isAdminPage){
  // Do not destroy a form/selection while the administrator is editing.
  if(!$('modalBg')?.classList.contains('open')&&(force||!$('adminBox')?.contains(document.activeElement)))renderAdmin();
 }else{
  updateAuthBtn();updateBadge();
  const view=document.querySelector('.view.active')?.id;
  if(view==='v-home')renderGrid();
  if(view==='v-orders')renderOrders();
  if(view==='v-cart')renderCart();
  if(view==='v-account'&&(force||!$('accountBox')?.contains(document.activeElement)))renderAccount();
  if(view==='v-detail'&&window.activeDetailId&&!$('detailBox')?.contains(document.activeElement))openDetail(window.activeDetailId);
 }
}
async function runCloud(action,success){
 if(cloudBusy){toast('Đang xử lý, vui lòng chờ');return false}
 cloudBusy=true;
 let committed=false;
 try{
  mustReady();while(refreshing)await new Promise(resolve=>setTimeout(resolve,40));await action();committed=true;
  try{await refreshCloud(false)}catch(e){cloudStatus('⚠ Đã ghi máy chủ, nhưng chưa tải lại được dữ liệu. Bấm Đồng bộ lại.',true)}
  paintCloud(true);if(success)toast(success);return true;
 }catch(e){toast(failMessage(e));cloudStatus('⚠ Chưa lưu: '+failMessage(e),true);
  if(!committed)try{await refreshCloud(false);paintCloud(true)}catch(_){}
  return false;
 }finally{cloudBusy=false}
}
async function bootCloud(){
 const bar=document.createElement('div');bar.className='cloud-bar';
 const status=document.createElement('span');status.id='cloudStatus';status.textContent='☁ Đang kết nối cơ sở dữ liệu…';
 const button=document.createElement('button');button.type='button';button.textContent='Đồng bộ lại';button.onclick=()=>manualSync();
 bar.append(status,button);document.querySelector('nav').after(bar);
 bindModalBg();
 if(isAdminPage)renderAdmin();else{cart=loadCart();renderChips();renderGrid();updateBadge();updateAuthBtn();go('home')}
 try{
  const cfg=window.APP_CONFIG||{};
  if(!/^https:\/\//.test(cfg.SUPABASE_URL||'')||cfg.SUPABASE_URL.includes('YOUR_')||!cfg.SUPABASE_PUBLISHABLE_KEY||cfg.SUPABASE_PUBLISHABLE_KEY.includes('YOUR_'))throw new Error('Chưa cấu hình Supabase. Mở HUONG-DAN.html trong bộ mã nguồn và sửa js/config.js.');
  let legacyRole='';try{legacyRole=JSON.parse(atob(cfg.SUPABASE_PUBLISHABLE_KEY.split('.')[1])).role||''}catch(_){}
  if(cfg.SUPABASE_PUBLISHABLE_KEY.startsWith('sb_secret_')||legacyRole==='service_role')throw new Error('Không được dùng secret/service_role key trong trình duyệt! Thu hồi key đó và thay bằng publishable key.');
  if(!window.supabase?.createClient)throw new Error('Không tải được thư viện Supabase');
  db=supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY,{auth:{storageKey:isAdminPage?'applevn_cloud_admin_v1':'applevn_cloud_customer_v1',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  db.auth.onAuthStateChange((event)=>{if(event==='PASSWORD_RECOVERY'){recoveryMode=true;setTimeout(showRecovery,0)}});
  const {data,error}=await db.auth.getSession();if(error)throw error;
  cloudUser=data.session?.user||null;
  await loadIdentity();
  await refreshCloud();
  if(recoveryMode)showRecovery();
  // Polling is deliberately used: no Realtime/publication setup is necessary.
  refreshTimer=setInterval(()=>{if(!document.hidden&&!cloudBusy)syncSession().catch(()=>{})},Math.max(5000,Number(cfg.SYNC_INTERVAL_MS)||15000));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!cloudBusy)syncSession().catch(()=>{})});
 }catch(e){cloudStatus('⚠ '+failMessage(e),true);toast(failMessage(e))}
}
async function loadIdentity(){
 cloudAdmin=cloudUser?!!await query(db.rpc('is_admin')):false;
 if(cloudUser)await query(db.rpc('claim_legacy_orders'));
}
async function syncSession(){
 const {data,error}=await db.auth.getSession();if(error)throw error;
 const next=data.session?.user||null;
 if(next?.id!==cloudUser?.id){cloudUser=next;await loadIdentity();}
 await refreshCloud();
}
async function manualSync(){if(cloudBusy)return toast('Đang xử lý');try{if(!db)return toast('Điền cấu hình Supabase rồi tải lại trang');await syncSession();toast('Đã tải dữ liệu mới từ máy chủ')}catch(e){toast(failMessage(e))}}
async function signup(){
 const name=$('suName').value.trim(),email=$('suEmail').value.trim().toLowerCase(),phone=$('suPhone').value.trim(),password=$('suPass').value;
 if(!name||name.length>120||!email||password.length<8)return toast('Nhập tên, email và mật khẩu ít nhất 8 ký tự');
 await runCloud(async()=>{
  const {data,error}=await db.auth.signUp({email,password,options:{data:{name,phone},emailRedirectTo:location.origin+'/index.html'}});if(error)throw error;
  closeModal();cloudUser=data.user&&data.session?data.user:null;
  await loadIdentity();
  if(!data.session)toast('Hãy mở email xác nhận rồi đăng nhập. Kiểm tra cả thư rác.');else toast('Đăng ký thành công');
 });
}
async function signIn(email,password,admin=false){
 await runCloud(async()=>{
  const {data,error}=await db.auth.signInWithPassword({email,password});if(error)throw error;
  cloudUser=data.user;await loadIdentity();
  if(admin&&!cloudAdmin){await db.auth.signOut();cloudUser=null;cloudAdmin=false;throw new Error('Tài khoản chưa được cấp quyền quản trị trong cơ sở dữ liệu.');}
  checkoutRequest=null;
  await refreshCloud(false);
  if(!admin){await mergeGuestCart();go('home')}
 },'Đăng nhập thành công');
}
async function login(){return signIn($('lgEmail').value.trim().toLowerCase(),$('lgPass').value)}
async function adminLogin(){return signIn($('adEmail').value.trim().toLowerCase(),$('adPass').value,true)}
async function logout(){await runCloud(async()=>{const {error}=await db.auth.signOut();if(error)throw error;cloudUser=null;cloudAdmin=false;session=null;adminSession=null;checkoutRequest=null;closeModal();if(!isAdminPage)go('home')},'Đã đăng xuất')}
async function adminLogout(){return logout()}
async function updateAccount(){
 const name=$('acName').value.trim(),phone=$('acPhone').value.trim(),address=$('acAddr').value.trim();
 if(!name)return toast('Vui lòng nhập họ tên');
 await runCloud(async()=>{if(!cloudUser)throw new Error('Vui lòng đăng nhập');await query(db.from('profiles').update({name,phone,address}).eq('id',cloudUser.id))},'Đã lưu thông tin trên máy chủ');
}
const baseRenderLogin=typeof renderLogin==='function'?renderLogin:null;
if(baseRenderLogin)renderLogin=function(){baseRenderLogin();$('loginBox').insertAdjacentHTML('beforeend','<p class="center"><button class="btn sm ghost" onclick="requestPasswordReset()">Quên mật khẩu</button></p>')};
async function requestPasswordReset(){
 const email=$('lgEmail')?.value.trim();if(!email)return toast('Nhập email vào ô Email trước');
 await runCloud(async()=>{const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/index.html'});if(error)throw error},'Đã gửi yêu cầu; kiểm tra email và thư rác');
}
function showRecovery(){
 if(!$('modalBox'))return;
 $('modalBox').innerHTML='<h2>Đặt mật khẩu mới</h2><div class="field"><label>Mật khẩu mới, ít nhất 8 ký tự</label><input id="newPassword" type="password" autocomplete="new-password"></div><button class="btn" onclick="saveRecoveryPassword()">Lưu mật khẩu</button>';
 $('modalBg').classList.add('open');
}
async function saveRecoveryPassword(){const password=$('newPassword')?.value||'';if(password.length<8)return toast('Mật khẩu tối thiểu 8 ký tự');await runCloud(async()=>{const {error}=await db.auth.updateUser({password});if(error)throw error;recoveryMode=false;closeModal();history.replaceState(null,'',location.pathname)},'Đã đổi mật khẩu')}
async function persistCart(next){
 next=normalizeCart(next);
 if(!cloudUser){if(!LS.set('cart_guest',next))throw new Error('Trình duyệt chặn lưu giỏ hàng');cart=next;return;}
 cartVersion=await rpc('save_cart',{new_items:next,expected_version:cartVersion});cart=next;
}
async function mergeGuestCart(){
 const guest=normalizeCart(LS.get('cart_guest',[]));if(!guest.length)return;
 const next=cart.map(c=>({...c}));for(const line of guest){const c=next.find(x=>x.id===line.id);if(c)c.qty=Math.min(p(c.id).stock,c.qty+line.qty);else next.push(line)}
 await persistCart(next);LS.set('cart_guest',[]);
}
async function changeCart(action,message){
 if(cloudBusy)return false;
 if(!cloudUser){try{mustReady();await persistCart(action(cart.map(x=>({...x}))));updateBadge();if(document.querySelector('.view.active')?.id==='v-cart')renderCart();toast(message);return true}catch(e){toast(failMessage(e));return false}}
 return runCloud(async()=>{await persistCart(action(cart.map(x=>({...x}))))},message);
}
async function addToCart(id,qty){
 const x=p(id);if(!x||x.show===false||x.stock<=0){toast('Sản phẩm đã hết hàng hoặc ngừng bán');return false}
 const q=Math.max(1,Math.floor(Number(qty||$('qty'+id)?.value||1)));if(!Number.isFinite(q))return false;
 return changeCart(next=>{const c=next.find(c=>c.id===id);if(c)c.qty=Math.min(x.stock,c.qty+q);else next.push({id,qty:Math.min(x.stock,q)});return next},cloudUser?'Đã lưu giỏ hàng trên máy chủ':'Đã thêm vào giỏ khách trên thiết bị này');
}
async function cartQty(id,d){return changeCart(next=>{const c=next.find(c=>c.id===id);if(c)c.qty=Math.min(p(id).stock,c.qty+d);return next.filter(c=>c.qty>0)},'Đã cập nhật giỏ hàng')}
async function removeCart(id){return changeCart(next=>next.filter(c=>c.id!==id),'Đã xóa sản phẩm khỏi giỏ')}
async function placeOrder(){
 if(!cloudUser){toast('Vui lòng đăng nhập để đặt hàng');go('login');return}
 const shipping={name:$('ckName').value.trim(),phone:$('ckPhone').value.replace(/\s/g,''),addr:$('ckAddr').value.trim(),note:$('ckNote').value.trim()};
 if(!shipping.name||!shipping.addr||!/^0\d{9}$/.test(shipping.phone))return toast('Nhập đủ tên, địa chỉ và số điện thoại Việt Nam 10 chữ số');
 if(!cart.length)return toast('Giỏ hàng trống');
 // Freeze request payload across retries; same key returns the same order after a timeout.
 if(!checkoutRequest)checkoutRequest={items:cart.map(c=>({...c})),shipping,payment:payMethod,promo_code:appliedPromo?.code||'',request_key:crypto.randomUUID()};
 await runCloud(async()=>{
  let o;try{o=await rpc('place_order',checkoutRequest)}catch(e){if(e.code&&e.code!=='PGRST000'&&e.code!=='PGRST001')checkoutRequest=null;throw e}
  checkoutRequest=null;cart=[];appliedPromo=null;checkoutDraft={};
  $('confirmBox').innerHTML=`<div class="panel center" style="max-width:600px;margin:40px auto"><div class="success-ico">✓</div><h2>Đã lưu đơn hàng trên máy chủ</h2><p>Mã đơn: <b>${esc(o.id)}</b></p><p>Tổng tiền: <b>${vnd(o.total)}</b></p><p>Giao đến: ${esc(o.addr)}</p><p>Đây là xác nhận đặt hàng, không phải xác nhận thanh toán.</p><button class="btn" onclick="go('orders')">Xem đơn hàng của tôi</button></div>`;go('confirm');
 },'Đặt hàng thành công');
}
async function cancelOrder(id){await runCloud(()=>rpc('set_order_status',{order_id:id,new_status:'Đã hủy'}),'Đã hủy đơn và hoàn tồn kho trên máy chủ')}
async function setOrderStatus(id,s){await runCloud(()=>rpc('set_order_status',{order_id:id,new_status:s}),'Đã cập nhật trạng thái đơn hàng')}
async function submitReview(pid){const rating=+$('rvStar').value,review_text=$('rvText').value.trim();await runCloud(async()=>{await rpc('submit_review',{pid,rating,review_text});closeModal();window.activeDetailId=pid},'Đã lưu đánh giá trên máy chủ');if(window.activeDetailId===pid)openDetail(pid)}
if(typeof openDetail==='function'){const original=openDetail;openDetail=function(id){window.activeDetailId=id;return original(id)}}
async function uploadImage(image){
 if(!String(image).startsWith('data:'))return image||'';
 const blob=await (await fetch(image)).blob();
 if(!['image/png','image/jpeg','image/webp'].includes(blob.type)||blob.size>512000)throw new Error('Ảnh phải là PNG/JPEG/WebP, tối đa 500 KB');
 const path=crypto.randomUUID()+'.'+{ 'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[blob.type];
 await query(db.storage.from('product-images').upload(path,blob,{contentType:blob.type,upsert:false}));
 return db.storage.from('product-images').getPublicUrl(path).data.publicUrl;
}
async function saveProduct(){
 if(productImageLoading)return toast('Vui lòng chờ đọc ảnh xong');
 const id=editingProduct||Date.now(),old=p(id)||{};
 const data={...old,id,name:$('fmName').value.trim(),cat:$('fmCat').value,price:+$('fmPrice').value,stock:+$('fmStock').value,emoji:$('fmEmoji').value||'📦',desc:$('fmDesc').value.trim(),image:pendingProductImage};
 if(!data.name||!Number.isSafeInteger(data.price)||data.price<=0||!Number.isInteger(data.stock)||data.stock<0)return toast('Nhập tên, giá nguyên dương và tồn kho nguyên không âm');
 const version=editingVersion;
 await runCloud(async()=>{data.image=await uploadImage(data.image);pendingProductImage=data.image;await rpc('save_product',{d:data,expected_version:version});closeModal()},'Đã lưu sản phẩm và ảnh trên máy chủ');
}
async function toggleShow(id){const x=p(id);if(!x)return;await runCloud(()=>rpc('save_product',{d:{...x,show:x.show===false},expected_version:x.version}),'Đã lưu chế độ hiển thị')}
async function deleteProduct(id){if(!confirm('Xóa sản phẩm? Đơn hàng cũ vẫn được giữ.'))return;const x=p(id);if(!x)return;await runCloud(async()=>{await rpc('delete_product',{pid:id,expected_version:x.version});closeModal()},'Đã xóa sản phẩm')}
function renderStoragePanel(box){
 const url=window.APP_CONFIG?.SUPABASE_URL||'';
 box.innerHTML=`<div class="panel"><h2>☁️ Dữ liệu & đồng bộ</h2><p><b>Nguồn dữ liệu chính:</b> Supabase PostgreSQL + Storage</p><p><b>Dự án:</b> ${esc(url)}</p><p>Sản phẩm, đơn hàng, thông tin tài khoản, đánh giá và giỏ của tài khoản được lưu trên máy chủ. Các thiết bị tự tải lại mỗi 15 giây khi đang mở trang; có thể bấm Đồng bộ lại ngay.</p><p>Giỏ chưa đăng nhập chỉ lưu trên thiết bị hiện tại. Mất mạng sẽ báo lỗi, không báo lưu thành công giả.</p><div class="cloud-actions"><button class="btn" onclick="manualSync()">Đồng bộ ngay</button><button class="btn ghost" onclick="exportCloudData()">Xuất dữ liệu cloud (.json)</button></div><hr><h3>Chuyển dữ liệu từ phiên bản cũ</h3><p>Mở trang này trên đúng trình duyệt từng quản lý cửa hàng, cùng tên miền cũ. Xuất dữ liệu cũ trước để giữ bản sao. Chỉ nhập một lần khi chưa có đơn/đánh giá cloud.</p><p><b>Phạm vi chuyển:</b> sản phẩm, ảnh sản phẩm và đơn hàng. Mật khẩu/tài khoản demo, giỏ cũ và đánh giá cũ không được nhập. Khách phải đăng ký lại bằng email cũ và xác nhận email để nhận lại đơn hàng cũ theo email.</p><div class="cloud-actions"><button class="btn ghost" onclick="exportLocalLegacy()">Xuất dữ liệu cũ trên trình duyệt</button><label class="btn ghost" style="cursor:pointer">Chọn tệp cũ để nhập<input type="file" accept="application/json,.json" onchange="importLegacyFile(this)" hidden></label></div><p class="demo-note">Tệp xuất chứa thông tin cá nhân của khách; chỉ lưu ở nơi riêng tư. Tệp JSON không thay thế bản sao lưu Auth/cơ sở dữ liệu/ảnh. Ảnh không còn dùng cần được xóa thủ công trong Storage sau khi kiểm tra; không tự xóa để tránh mất ảnh đang dùng.</p></div>`;
}
function downloadJSON(value,name){const blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000)}
function legacySnapshot(){return {format:'applevn-legacy-v1',products:LS.get('products',LEGACY_PRODUCTS),orders:LS.get('orders',[])}}
function exportLocalLegacy(){downloadJSON(legacySnapshot(),'applevn-du-lieu-cu.json');toast('Đã xuất sản phẩm và đơn hàng cũ; không xuất mật khẩu')}
async function exportCloudData(){await runCloud(async()=>{await refreshCloud(false);downloadJSON({format:'applevn-cloud-export-v1',exportedAt:new Date().toISOString(),products:PRODUCTS,orders,profiles:users,reviews},'applevn-cloud-'+new Date().toISOString().slice(0,10)+'.json')},'Đã xuất dữ liệu nghiệp vụ; ảnh vẫn ở Storage')}
async function importLegacyFile(input){
 const file=input.files?.[0];input.value='';if(!file)return;
 if(file.size>50*1024*1024)return toast('Tệp tối đa 50 MB');
 let snapshot;try{snapshot=JSON.parse(await file.text());if(snapshot.format!=='applevn-legacy-v1'||!Array.isArray(snapshot.products)||!Array.isArray(snapshot.orders))throw new Error('Chọn tệp apple...du-lieu-cu.json được xuất từ mục này')}catch(e){return toast(failMessage(e))}
 if(!confirm('Nhập dữ liệu cũ sẽ thay toàn bộ danh mục hiện tại. Chỉ cho phép một lần khi chưa có đơn/đánh giá cloud. Bạn đã giữ bản sao tệp cũ?'))return;
 await runCloud(async()=>{const products=[];for(const item of snapshot.products){cloudStatus('☁ Đang chuyển ảnh: '+(products.length+1)+'/'+snapshot.products.length);products.push({...item,image:await uploadImage(item.image)})}await rpc('import_legacy',{snapshot:{products,orders:snapshot.orders}})},'Đã chuyển sản phẩm, ảnh và đơn hàng lên máy chủ');
}
