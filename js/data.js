const VND = new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0});
const vnd = n => VND.format(n);

/* Danh mục mẫu gốc. Giá và thông số chưa được xác minh lại; quản trị viên cần kiểm tra trước khi bán. */
const CATS = ['Tất cả','iPhone','iPad','Mac','Watch','AirPods','Phụ kiện'];
let PRODUCTS = [
 {id:1, name:'iPhone 15 Pro Max 256 GB', cat:'iPhone', price:29990000, old:33990000, emoji:'📱', stock:25, isNew:false, verified:false, desc:'Khung titan siêu nhẹ, chip A17 Pro, camera 48MP, màn hình Super Retina XDR 6,7 inch. Hàng chính hãng VN/A.'},
 {id:2, name:'iPhone 15 Pro 128 GB', cat:'iPhone', price:25990000, old:null, emoji:'📱', stock:30, isNew:false, verified:false, desc:'Chip A17 Pro, khung titan, cổng USB-C. Hiệu năng chuyên nghiệp trong thân hình nhỏ gọn.'},
 {id:3, name:'iPhone 15 Plus 128 GB', cat:'iPhone', price:22990000, old:null, emoji:'📱', stock:22, isNew:false, verified:false, desc:'Màn hình 6,7 inch lớn, chip A16, pin dùng cả ngày. Camera 48MP.'},
 {id:4, name:'iPhone 15 128 GB', cat:'iPhone', price:19990000, old:22990000, emoji:'📱', stock:40, isNew:false, verified:false, desc:'Dynamic Island, camera 48MP, cổng USB-C. Màu sắc thời thượng.'},
 {id:5, name:'iPhone 14 128 GB', cat:'iPhone', price:15490000, old:null, emoji:'📱', stock:15, isNew:false, verified:false, desc:'Chip A15 Bionic, camera kép 12MP, màn hình 6,1 inch Super Retina XDR.'},
 {id:6, name:'iPad Pro M4 11" 256 GB Wi-Fi', cat:'iPad', price:35590000, old:null, emoji:'🖥️', stock:10, isNew:true, verified:false, source:'apple.com/vn', desc:'Chip M4 mới nhất, màn hình Ultra Retina XDR tandem OLED, hỗ trợ Apple Pencil Pro. Dành cho sáng tạo chuyên nghiệp.'},
 {id:7, name:'iPad Air M2 11" 128 GB Wi-Fi', cat:'iPad', price:16990000, old:null, emoji:'🖥️', stock:22, isNew:true, verified:false, source:'apple.com/vn', desc:'Chip M2 mạnh mẽ, màn hình Liquid Retina, nhiều màu sắc trẻ trung. Lựa chọn hoàn hảo cho học tập & làm việc.'},
 {id:8, name:'iPad (Gen 10) 64 GB Wi-Fi', cat:'iPad', price:12790000, old:null, emoji:'🖥️', stock:30, isNew:false, verified:false, source:'apple.com/vn', desc:'iPad màn hình toàn phần, đủ màu sắc. Cho mọi tác vụ hằng ngày.'},
 {id:9, name:'iPad mini A17 Pro 128 GB Wi-Fi', cat:'iPad', price:16490000, old:null, emoji:'🖥️', stock:18, isNew:true, verified:false, source:'apple.com/vn', desc:'Trải nghiệm trọn vẹn iPad trong một thiết kế siêu gọn nhẹ. Chip A17 Pro.'},
 {id:10, name:'MacBook Air 13" M3 8 GB / 256 GB', cat:'Mac', price:27990000, old:30990000, emoji:'💻', stock:18, isNew:false, verified:false, desc:'Siêu mỏng, pin 18 giờ, chip Apple M3. Chiếc laptop không quạt êm ái nhất.'},
 {id:11, name:'MacBook Pro 14" M3 8 GB / 512 GB', cat:'Mac', price:39990000, old:null, emoji:'💻', stock:9, isNew:true, verified:false, desc:'Chip M3, màn hình Liquid Retina XDR, hiệu năng đỉnh cao cho lập trình viên và creator.'},
 {id:12, name:'Mac mini M2 8 GB / 256 GB', cat:'Mac', price:14490000, old:null, emoji:'🗜️', stock:14, isNew:false, verified:false, desc:'Máy tính để bàn nhỏ gọn, chip M2 vượt trội — giải pháp tiết kiệm cho văn phòng.'},
 {id:13, name:'Apple Watch Series 9 GPS 41 mm', cat:'Watch', price:10990000, old:12490000, emoji:'⌚', stock:30, isNew:false, verified:false, desc:'Màn hình sáng gấp đôi, cú nhấp đúp tay, theo dõi sức khỏe toàn diện.'},
 {id:14, name:'Apple Watch Ultra 2', cat:'Watch', price:22990000, old:null, emoji:'⌚', stock:6, isNew:false, verified:false, desc:'Vỏ titan 49 mm, màn hình 3000 nits, GPS chuẩn xác — dành cho vận động viên khắt khe.'},
 {id:15, name:'AirPods Pro 2 (USB-C)', cat:'AirPods', price:5990000, old:6490000, emoji:'🎧', stock:50, isNew:false, verified:false, desc:'Chống ồn chủ động tốt nhất, Âm thanh Thích ứng, hộp sạc MagSafe USB-C.'},
 {id:16, name:'AirPods 4', cat:'AirPods', price:3990000, old:null, emoji:'🎧', stock:45, isNew:true, verified:false, desc:'Thiết kế mới, Âm thanh không gian cá nhân hóa, chống nước IPX4.'},
 {id:17, name:'Apple Pencil (thế hệ 2)', cat:'Phụ kiện', price:2590000, old:null, emoji:'🖊️', stock:60, isNew:false, verified:false, desc:'Bút cảm ứng áp lực, sạc từ tính — cặp đôi hoàn hảo với iPad Pro/Air.'},
 {id:18, name:'AirTag (1 cái)', cat:'Phụ kiện', price:790000, old:990000, emoji:'📍', stock:100, isNew:false, verified:false, desc:'Định vị đồ vật chính xác bằng mạng Find My của Apple.'},
 {id:19, name:'MagSafe Charger 1 m', cat:'Phụ kiện', price:1290000, old:null, emoji:'🔋', stock:45, isNew:false, verified:false, desc:'Sạc không dây 15 W gắn từ tính tiện lợi cho iPhone 12 trở lên.'},
 {id:20, name:'Magic Mouse', cat:'Phụ kiện', price:1990000, old:null, emoji:'🖱️', stock:20, isNew:false, verified:false, desc:'Multi-Touch surface, sạc Lightning, thiết kế liền khối.'}
];
const PROMOS = [
 {code:'APPLE10', type:'percent', value:10, note:'Giảm 10% toàn bộ đơn hàng'},
 {code:'FREESHIP', type:'ship', value:0, note:'Miễn phí vận chuyển'},
 {code:'IPHONE500', type:'amount', value:500000, note:'Giảm 500.000₫ cho đơn từ 20 triệu'}
];
const SHIP_FEE = 30000;
const ORDER_FLOW = ['Đặt hàng','Đã xác nhận','Đang giao','Hoàn thành'];
