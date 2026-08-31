// Configuration for Supabase
const SUPABASE_URL = 'https://ojsdyaypjahrkclhszpp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qc2R5YXlwamFocmtjbGhzenBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMjgxMDEsImV4cCI6MjEwMzYwNDEwMX0.KSnEplvsKrSTTCJhUQqENoHbLUv-VOdM-dZf2R9i1qk';

// Initialize the Supabase client
const _supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabase = _supabaseClient;

// Utility to check session on protected pages
async function requireAuth() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) {
    window.location.href = 'login.html';
    return null;
  }
  
  // Fetch associate role and status
  const { data: associate } = await supabase
    .from('associates')
    .select('status, role')
    .eq('user_id', session.user.id)
    .single();
    
  return { session, associate };
}

// Utility to enforce Admin access
async function requireAdminAuth() {
  const authData = await requireAuth();
  if (!authData || !authData.associate || authData.associate.role !== 'ADMIN') {
    alert('Access Denied: Admin privileges required.');
    window.location.href = 'index.html'; // Redirect to associate dashboard
    return null;
  }
  return authData;
}
// Utility to logout
async function handleLogout() {
  await supabase.auth.signOut();
  window.location.href = 'login.html';
}
