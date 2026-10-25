/* Chỉ dùng publishable key hoặc anon key. TUYỆT ĐỐI không dùng secret/service_role key.
   Supabase Dashboard → Connect / Settings → API Keys. Hai giá trị dưới đây được công khai.
   Quyền truy cập dữ liệu được bảo vệ bằng SQL/RLS, không bằng cách giấu key. */
window.APP_CONFIG = Object.freeze({
  SUPABASE_URL: 'https://YOUR_PROJECT.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'YOUR_PUBLISHABLE_OR_ANON_KEY',
  SYNC_INTERVAL_MS: 15000
});
