
begin
 if not exists(select 1 from auth.users where lower(email)=lower('EMAIL_QUAN_TRI_CUA_BAN@example.com')) then
  raise exception 'Chưa có tài khoản với email này. Hãy tạo trong Authentication → Users trước.';
 end if;
end $$;
insert into private.admin_users(user_id)
 select id from auth.users where lower(email)=lower('EMAIL_QUAN_TRI_CUA_BAN@example.com')
 on conflict do nothing;

select u.email from private.admin_users a join auth.users u on u.id=a.user_id;