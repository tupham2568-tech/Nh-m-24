/* Xem trước cục bộ; cloud.js tải ảnh lên Storage khi lưu sản phẩm. */
let pendingProductImage='';
let productImageLoading=false;
let productImageVersion=0;
function setProductImageLoading(value){
 productImageLoading=value;
 const button=document.getElementById('saveProductBtn');
 if(button)button.disabled=value;
}
function resetProductImage(image=''){
 productImageVersion++;
 pendingProductImage=image;
 setProductImageLoading(false);
}
function showProductImagePreview(){
 const box=document.getElementById('uploadPreview');if(!box)return;
 box.innerHTML=pendingProductImage?`<img src="${esc(pendingProductImage)}" alt="Ảnh xem trước">`:'<span>Chưa có ảnh — đang dùng emoji của sản phẩm</span>';
}
function uploadProductImage(input){
 const file=input.files?.[0];if(!file)return;
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)){input.value='';return toast('Chỉ nhận PNG, JPEG hoặc WebP')}
 if(file.size>500*1024){input.value='';return toast('Ảnh phải nhỏ hơn hoặc bằng 500 KB')}
 const version=++productImageVersion;
 setProductImageLoading(true);
 const reader=new FileReader();
 const fail=()=>{
  if(version!==productImageVersion)return;
  setProductImageLoading(false);input.value='';showProductImagePreview();toast('Không đọc được ảnh, vui lòng chọn ảnh khác');
 };
 reader.onerror=fail;reader.onabort=fail;
 reader.onload=()=>{
  if(version!==productImageVersion)return;
  const image=new Image();
  image.onerror=fail;
  image.onload=()=>{
   if(version!==productImageVersion)return;
   pendingProductImage=String(reader.result);setProductImageLoading(false);showProductImagePreview();
  };
  image.src=String(reader.result);
 };
 reader.readAsDataURL(file);
}
function clearProductImage(){
 resetProductImage();showProductImagePreview();
 const input=document.getElementById('productImageInput');if(input)input.value='';
}
