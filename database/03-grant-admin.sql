-- Chạy sau khi tài khoản đã được tạo bằng Authentication → Users → Add user.
-- Dùng email thật của BẠN, đặt mật khẩu mạnh, xác nhận email.
-- Thay email ở HAI chỗ dưới bằng cùng email của bạn rồi chạy SQL.
do $$
begin
 if not exists(select 1 from auth.users where lower(email)=lower('EMAIL_QUAN_TRI_CUA_BAN@example.com')) then
  raise exception 'Chưa có tài khoản với email này. Hãy tạo trong Authentication → Users trước.';
 end if;
end $$;
insert into private.admin_users(user_id)
 select id from auth.users where lower(email)=lower('EMAIL_QUAN_TRI_CUA_BAN@example.com')
 on conflict do nothing;
-- Kiểm tra quyền đã cấp:
select u.email from private.admin_users a join auth.users u on u.id=a.user_id;
-- Thu hồi quyền khi cần (chỉ chạy có chủ đích):
-- delete from private.admin_users where user_id=(select id from auth.users where email='EMAIL_CAN_THU_HOI');
