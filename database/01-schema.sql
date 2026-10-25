-- Apple Store VN: chạy MỘT LẦN trong Supabase SQL Editor, quyền postgres.
-- Không chạy seed / schema tự động trong mỗi lần Netlify deploy.
begin;
create schema if not exists private;
revoke all on schema private from public,anon,authenticated;
create table private.admin_users(user_id uuid primary key references auth.users(id) on delete cascade);
create table private.settings(key text primary key,value jsonb not null);
create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.admin_users where user_id=(select auth.uid()));
$$;
create table public.profiles(
 id uuid primary key references auth.users(id) on delete cascade,
 email text not null, name text not null check(length(name) between 1 and 120),
 phone text not null default '' check(length(phone)<=30),
 address text not null default '' check(length(address)<=1000),
 created_at timestamptz not null default now()
);
create function private.new_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,email,name,phone) values(new.id,coalesce(new.email,''),
 left(coalesce(nullif(trim(new.raw_user_meta_data->>'name'),''),split_part(new.email,'@',1),'Khách hàng'),120),
 left(coalesce(new.raw_user_meta_data->>'phone',''),30));
 return new;
end;$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.new_profile();
-- Hỗ trợ tài khoản đã có trong một dự án mới cài schema.
insert into public.profiles(id,email,name)
 select id,coalesce(email,''),left(coalesce(nullif(raw_user_meta_data->>'name',''),split_part(email,'@',1),'Khách hàng'),120) from auth.users on conflict do nothing;
create table public.products(
 id bigint primary key check(id>0 and id<=9007199254740991), data jsonb not null check(jsonb_typeof(data)='object'),
 stock integer not null check(stock>=0), version integer not null default 1,
 updated_at timestamptz not null default now()
);
create table public.orders(
 id text primary key check(id ~ '^[A-Za-z0-9_-]{1,100}$'),
 user_id uuid references auth.users(id) on delete set null,
 request_id uuid unique, data jsonb not null check(jsonb_typeof(data)='object'),
 created_at timestamptz not null default now()
);
create index orders_owner_idx on public.orders(user_id,created_at);
create table public.reviews(
 id uuid primary key default gen_random_uuid(), product_id bigint not null references public.products(id) on delete cascade,
 user_id uuid references auth.users(id) on delete set null, display_name text not null,
 star integer not null check(star between 1 and 5), body text not null check(length(body)<=3000),
 created_at timestamptz not null default now(), unique(product_id,user_id)
);
create table public.carts(
 user_id uuid primary key references auth.users(id) on delete cascade,
 items jsonb not null default '[]' check(jsonb_typeof(items)='array'),
 version integer not null default 1,updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.reviews enable row level security;
alter table public.carts enable row level security;
create policy profiles_read on public.profiles for select to authenticated using(id=(select auth.uid()) or (select public.is_admin()));
create policy profiles_update on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy products_read on public.products for select to anon,authenticated using(coalesce((data->>'show')::boolean,true) or (select public.is_admin()));
create policy orders_read on public.orders for select to authenticated using(user_id=(select auth.uid()) or (select public.is_admin()));
create policy reviews_read on public.reviews for select to anon,authenticated using(exists(select 1 from public.products p where p.id=product_id));
create policy carts_read on public.carts for select to authenticated using(user_id=(select auth.uid()));
revoke all on public.profiles,public.products,public.orders,public.reviews,public.carts from anon,authenticated;
grant select on public.products to anon,authenticated;
grant select on public.profiles,public.orders,public.carts to authenticated;
grant select(id,product_id,display_name,star,body,created_at) on public.reviews to anon,authenticated;
grant update(name,phone,address) on public.profiles to authenticated;

create function private.validate_product(d jsonb) returns void language plpgsql set search_path='' as $$
begin
 if jsonb_typeof(d)<>'object' or coalesce(length(trim(d->>'name')),0) not between 1 and 200
 or coalesce((d->>'price')::numeric,0)<=0 or (d->>'price')::numeric>1000000000000
 or (d->>'price')::numeric<>trunc((d->>'price')::numeric)
 or coalesce((d->>'stock')::numeric,-1)<0 or (d->>'stock')::numeric>2147483647
 or (d->>'stock')::numeric<>trunc((d->>'stock')::numeric)
 or coalesce(d->>'cat','') not in ('iPhone','iPad','Mac','Watch','AirPods','Phụ kiện')
 or length(coalesce(d->>'desc',''))>10000 or length(coalesce(d->>'emoji',''))>50
 then raise exception 'Sản phẩm không hợp lệ'; end if;
 if coalesce(d->>'image','')<>'' and (d->>'image') !~ '^https://' then raise exception 'Ảnh phải là URL HTTPS'; end if;
 perform (d->>'show')::boolean;
end;$$;
create function public.save_product(d jsonb,expected_version integer) returns void language plpgsql security definer set search_path='' as $$
declare pid bigint := (d->>'id')::bigint;
begin
 if not public.is_admin() then raise exception 'Chỉ quản trị viên được sửa sản phẩm';end if;
 perform private.validate_product(d);
 if expected_version=0 then
  insert into public.products(id,data,stock) values(pid,d-'version',(d->>'stock')::integer);
 else
  update public.products set data=d-'version',stock=(d->>'stock')::integer,version=version+1,updated_at=now() where id=pid and version=expected_version;
  if not found then raise exception 'Sản phẩm đã thay đổi trên thiết bị khác. Hãy tải lại và sửa lại.';end if;
 end if;
end;$$;
create function public.delete_product(pid bigint,expected_version integer) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Không có quyền';end if;
 delete from public.products where id=pid and version=expected_version;
 if not found then raise exception 'Sản phẩm đã thay đổi. Hãy tải lại.';end if;
end;$$;
create function public.save_cart(new_items jsonb,expected_version integer) returns integer language plpgsql security definer set search_path='' as $$
declare result integer; c jsonb;
begin
 if auth.uid() is null then raise exception 'Vui lòng đăng nhập';end if;
 if jsonb_typeof(new_items)<>'array' or jsonb_array_length(new_items)>100 then raise exception 'Giỏ hàng không hợp lệ';end if;
 for c in select value from jsonb_array_elements(new_items) loop
  if (c->>'qty')::numeric<>trunc((c->>'qty')::numeric) or coalesce((c->>'qty')::integer,0) not between 1 and 10000 or coalesce((c->>'id')::bigint,0)<=0 then raise exception 'Số lượng không hợp lệ';end if;
 end loop;
 if expected_version=0 then
  insert into public.carts(user_id,items) values(auth.uid(),new_items) on conflict do nothing returning version into result;
 else
  update public.carts set items=new_items,version=version+1,updated_at=now() where user_id=auth.uid() and version=expected_version returning version into result;
 end if;
 if result is null then raise exception 'Giỏ hàng đã đổi trên thiết bị khác. Đã tải bản mới; vui lòng thử lại.';end if;
 return result;
end;$$;
create function public.place_order(items jsonb,shipping jsonb,payment text,promo_code text,request_key uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); existing public.orders; x public.products; c record;
 line_items jsonb:='[]'; subtotal bigint:=0; discount bigint:=0; shipping_fee bigint:=30000;
 result jsonb; oid text; person public.profiles; n integer;
begin
 if uid is null then raise exception 'Vui lòng đăng nhập để đặt hàng';end if;
 if request_key is null then raise exception 'Thiếu mã yêu cầu';end if;
 -- Serialize retries of one request so a timeout never duplicates the order.
 perform pg_advisory_xact_lock(hashtextextended(request_key::text,0));
 select * into existing from public.orders where request_id=request_key;
 if found then
  if existing.user_id<>uid then raise exception 'Mã yêu cầu đã được dùng';end if;
  return existing.data;
 end if;
 if jsonb_typeof(items)<>'array' or jsonb_array_length(items) not between 1 and 100 then raise exception 'Giỏ hàng không hợp lệ';end if;
 if payment not in ('COD','BANK','MOMO') or payment is null then raise exception 'Phương thức không hợp lệ';end if;
 if coalesce(length(trim(shipping->>'name')),0) not between 1 and 120 or coalesce(length(trim(shipping->>'addr')),0) not between 1 and 1000 or coalesce(shipping->>'phone','') !~ '^0[0-9]{9}$' or length(coalesce(shipping->>'note',''))>2000 then raise exception 'Thông tin giao hàng không hợp lệ';end if;
 for c in select value from jsonb_array_elements(items) loop
  if coalesce((c.value->>'id')::bigint,0)<=0 or coalesce((c.value->>'qty')::numeric,0) not between 1 and 10000 or (c.value->>'qty')::numeric<>trunc((c.value->>'qty')::numeric) then raise exception 'Số lượng không hợp lệ';end if;
 end loop;
 -- Always lock products in ID order to avoid concurrent checkout deadlocks.
 for c in select (value->>'id')::bigint pid,sum((value->>'qty')::integer)::integer qty from jsonb_array_elements(items) group by 1 order by 1 loop
  select * into x from public.products where id=c.pid for update;
  if not found then raise exception 'Sản phẩm không còn tồn tại';end if;
  if not coalesce((x.data->>'show')::boolean,true) or x.stock<c.qty or c.qty>10000 then raise exception 'Sản phẩm hết hàng hoặc tồn kho đã thay đổi';end if;
  subtotal:=subtotal+(x.data->>'price')::bigint*c.qty;
  line_items:=line_items||jsonb_build_array(jsonb_build_object('id',x.id,'qty',c.qty,'name',x.data->>'name','emoji',coalesce(x.data->>'emoji','📦'),'price',(x.data->>'price')::bigint));
  update public.products set stock=stock-c.qty,version=version+1,updated_at=now() where id=x.id;
 end loop;
 case upper(coalesce(promo_code,''))
 when '' then null;
 when 'APPLE10' then discount:=round(subtotal*0.1);
 when 'FREESHIP' then shipping_fee:=0;
 when 'IPHONE500' then if subtotal>=20000000 then discount:=500000;end if;
 else raise exception 'Mã khuyến mãi không hợp lệ';end case;
 select * into strict person from public.profiles where id=uid;
 oid:='ORD'||replace(gen_random_uuid()::text,'-','');
 result:=jsonb_build_object('id',oid,'email',person.email,'name',trim(shipping->>'name'),'phone',shipping->>'phone','addr',trim(shipping->>'addr'),'note',coalesce(shipping->>'note',''),'pay',payment,'promo',upper(coalesce(promo_code,'')),'sub',subtotal,'disc',discount,'ship',shipping_fee,'total',subtotal-discount+shipping_fee,'status','Đặt hàng','created',to_char(now() at time zone 'Asia/Ho_Chi_Minh','DD/MM/YYYY HH24:MI:SS'),'items',line_items);
 insert into public.orders(id,user_id,request_id,data) values(oid,uid,request_key,result);
 insert into public.carts(user_id,items) values(uid,'[]') on conflict(user_id) do update set items='[]',version=public.carts.version+1,updated_at=now();
 return result;
end;$$;
create function public.set_order_status(order_id text,new_status text) returns void language plpgsql security definer set search_path='' as $$
declare o public.orders; c record; stock_now integer; admin boolean:=public.is_admin(); old_status text;
begin
 select * into o from public.orders where id=order_id for update;
 if not found or auth.uid() is null or (not admin and o.user_id is distinct from auth.uid()) then raise exception 'Không có quyền cập nhật đơn';end if;
 old_status:=o.data->>'status';
 if not admin and (new_status is distinct from 'Đã hủy' or old_status not in ('Đặt hàng','Đã xác nhận')) then raise exception 'Không thể hủy đơn ở trạng thái này';end if;
 if new_status is null or new_status not in ('Đặt hàng','Đã xác nhận','Đang giao','Hoàn thành','Đã hủy') then raise exception 'Trạng thái không hợp lệ';end if;
 if old_status=new_status then return;end if;
 if old_status='Đã hủy' or new_status='Đã hủy' then
  for c in select (value->>'id')::bigint pid,sum((value->>'qty')::integer)::integer qty from jsonb_array_elements(o.data->'items') group by 1 order by 1 loop
   select stock into stock_now from public.products where id=c.pid for update;
   if old_status='Đã hủy' then
    if not found or stock_now<c.qty then raise exception 'Không đủ tồn kho để khôi phục đơn';end if;
    update public.products set stock=stock-c.qty,version=version+1,updated_at=now() where id=c.pid;
   else
    update public.products set stock=stock+c.qty,version=version+1,updated_at=now() where id=c.pid;
   end if;
  end loop;
 end if;
 update public.orders set data=jsonb_set(data,'{status}',to_jsonb(new_status)) where id=order_id;
end;$$;
create function public.submit_review(pid bigint,rating integer,review_text text) returns void language plpgsql security definer set search_path='' as $$
declare nm text;
begin
 if auth.uid() is null then raise exception 'Vui lòng đăng nhập';end if;
 if rating is null or rating not between 1 and 5 or review_text is null or length(review_text)>3000 then raise exception 'Đánh giá không hợp lệ';end if;
 if not exists(select 1 from public.products where id=pid and coalesce((data->>'show')::boolean,true)) then raise exception 'Sản phẩm không còn bán';end if;
 select name into strict nm from public.profiles where id=auth.uid();
 insert into public.reviews(product_id,user_id,display_name,star,body) values(pid,auth.uid(),nm,rating,review_text)
 on conflict(product_id,user_id) do update set display_name=excluded.display_name,star=excluded.star,body=excluded.body,created_at=now();
end;$$;
create function public.claim_legacy_orders() returns void language plpgsql security definer set search_path='' as $$
declare verified_email text;
begin
 select email into verified_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if verified_email is not null then
  update public.orders set user_id=auth.uid() where user_id is null and lower(data->>'email')=lower(verified_email);
 end if;
end;$$;
-- Chuyển localStorage một lần, chỉ trước khi cửa hàng có đơn cloud/review.
-- Đây không phải chức năng khôi phục toàn bộ Auth/Storage.
create function public.import_legacy(snapshot jsonb) returns void language plpgsql security definer set search_path='' as $$
declare d jsonb; owner_id uuid; line jsonb;
begin
 if not public.is_admin() then raise exception 'Không có quyền nhập dữ liệu';end if;
 lock table public.products,public.orders,public.reviews in exclusive mode;
 if exists(select 1 from public.orders) or exists(select 1 from public.reviews) or exists(select 1 from private.settings where key='legacy_import') then raise exception 'Chỉ nhập dữ liệu cũ một lần khi chưa có đơn hàng/đánh giá cloud';end if;
 if jsonb_typeof(snapshot->'products') is distinct from 'array' or jsonb_array_length(snapshot->'products')>10000 or jsonb_typeof(snapshot->'orders') is distinct from 'array' or jsonb_array_length(snapshot->'orders')>10000 then raise exception 'Tệp nhập không hợp lệ';end if;
 delete from public.products;
 for d in select value from jsonb_array_elements(snapshot->'products') loop
  perform private.validate_product(d);
  insert into public.products(id,data,stock) values((d->>'id')::bigint,d-'version',(d->>'stock')::integer);
 end loop;
 for d in select value from jsonb_array_elements(snapshot->'orders') loop
  if jsonb_typeof(d->'items') is distinct from 'array' or coalesce(d->>'status','') not in ('Đặt hàng','Đã xác nhận','Đang giao','Hoàn thành','Đã hủy') or coalesce((d->>'total')::numeric,-1)<0 then raise exception 'Đơn hàng cũ không hợp lệ';end if;
  for line in select value from jsonb_array_elements(d->'items') loop
   if coalesce((line->>'id')::bigint,0)<=0 or coalesce((line->>'qty')::numeric,0) not between 1 and 1000000 or (line->>'qty')::numeric<>trunc((line->>'qty')::numeric) or coalesce((line->>'price')::numeric,-1)<0 then raise exception 'Chi tiết đơn hàng cũ không hợp lệ';end if;
  end loop;
  owner_id:=null;
  select u.id into owner_id from auth.users u where lower(u.email)=lower(d->>'email') and u.email_confirmed_at is not null limit 1;
  insert into public.orders(id,user_id,data) values(d->>'id',owner_id,d);
 end loop;
 insert into private.settings values('legacy_import',jsonb_build_object('at',now(),'by',auth.uid()));
end;$$;
-- Public functions are NOT executable by anonymous callers except is_admin().
revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to anon,authenticated;
revoke execute on function public.save_product(jsonb,integer),public.delete_product(bigint,integer),public.save_cart(jsonb,integer),public.place_order(jsonb,jsonb,text,text,uuid),public.set_order_status(text,text),public.submit_review(bigint,integer,text),public.claim_legacy_orders(),public.import_legacy(jsonb) from public,anon;
grant execute on function public.save_product(jsonb,integer),public.delete_product(bigint,integer),public.save_cart(jsonb,integer),public.place_order(jsonb,jsonb,text,text,uuid),public.set_order_status(text,text),public.submit_review(bigint,integer,text),public.claim_legacy_orders(),public.import_legacy(jsonb) to authenticated;
revoke all on all functions in schema private from public,anon,authenticated;
-- Public product-image bucket: visitors can read, ONLY admins can upload/delete.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('product-images','product-images',true,512000,array['image/png','image/jpeg','image/webp']) on conflict(id) do nothing;
create policy apple_images_insert on storage.objects for insert to authenticated with check(bucket_id='product-images' and (select public.is_admin()));
create policy apple_images_delete on storage.objects for delete to authenticated using(bucket_id='product-images' and (select public.is_admin()));
create policy apple_images_admin_read on storage.objects for select to authenticated using(bucket_id='product-images' and (select public.is_admin()));
commit;
