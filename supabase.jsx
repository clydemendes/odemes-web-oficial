// Supabase client — must load after the Supabase CDN script
const { createClient } = window.supabase;

// Production URL — must match Supabase → Authentication → URL configuration (Site URL + Redirect URLs).
const PRODUCTION_ORIGIN = 'https://odemes-web-oficial-h4vp.vercel.app';

// Where Supabase sends the user after OAuth. If redirectTo is not allowlisted, Supabase falls back to Site URL (often localhost:3000).
window.getAuthRedirectUrl = function() {
  const { hostname, origin, pathname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return origin + (pathname || '/');
  }
  if (hostname.endsWith('.vercel.app') || hostname === 'odemes.com' || hostname.endsWith('.odemes.com')) {
    return origin + '/';
  }
  return PRODUCTION_ORIGIN + '/';
};

window.SupabaseClient = createClient(
  'https://eitnotjnxdpojomqxcqm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpdG5vdGpueGRwb2pvbXF4Y3FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMjE0NzMsImV4cCI6MjA5Mjg5NzQ3M30.ewPG1RnAF3YMP-TTxzw5dr4jciowLDbWc6YRfnmC12g',
  {
    auth: {
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
