// Supabase client — must load after the Supabase CDN script
const { createClient } = window.supabase;
window.SupabaseClient = createClient(
  'https://eitnotjnxdpojomqxcqm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpdG5vdGpueGRwb2pvbXF4Y3FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMjE0NzMsImV4cCI6MjA5Mjg5NzQ3M30.ewPG1RnAF3YMP-TTxzw5dr4jciowLDbWc6YRfnmC12g'
);
