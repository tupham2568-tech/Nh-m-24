/* Trạng thái bộ nhớ của giao diện. Dữ liệu nghiệp vụ chỉ ghi qua cloud.js.
   localStorage chỉ còn giỏ khách, token Supabase và dữ liệu cũ chờ chuyển đổi. */
const LS={get(k,d){try{return JSON.parse(localStorage.getItem('applevn_'+k))??d}catch{return d}},set(k,v){try{localStorage.setItem('applevn_'+k,JSON.stringify(v));return true}catch{return false}}};
const LEGACY_PRODUCTS=PRODUCTS.map(x=>({...x}));
PRODUCTS=[];
let users=[],admins=[],orders=[],reviews={},session=null,adminSession=null,cart=[],editingProduct=null,editingVersion=0;
const p=id=>PRODUCTS.find(x=>x.id===Number(id));
const cur=()=>session?users.find(u=>u.email===session)||null:null;
const curAdmin=()=>adminSession?admins.find(u=>u.email===adminSession)||null:null;
function cartKey(){return 'cart_guest'}
function normalizeCart(value){return (Array.isArray(value)?value:[]).filter(c=>p(c.id)&&p(c.id).show!==false&&p(c.id).stock>0&&Number.isInteger(c.qty)&&c.qty>0).map(c=>({id:Number(c.id),qty:Math.min(c.qty,p(c.id).stock)}))}
function loadCart(){return normalizeCart(session?cart:LS.get('cart_guest',[]))}
function saveAll(){throw new Error('Không được ghi dữ liệu nghiệp vụ vào localStorage. Hãy dùng hàm cloud tương ứng.');}
