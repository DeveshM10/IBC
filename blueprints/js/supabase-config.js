// Configuration for Supabase
const SUPABASE_URL = 'https://ojsdyaypjahrkclhszpp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qc2R5YXlwamFocmtjbGhzenBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMjgxMDEsImV4cCI6MjEwMzYwNDEwMX0.KSnEplvsKrSTTCJhUQqENoHbLUv-VOdM-dZf2R9i1qk';

// Initialize the Supabase client
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Utility to check session on protected pages
async function requireAuth() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) {
    window.location.href = 'login.html';
  }
  return session;
}

// Utility to logout
async function handleLogout() {
  await supabase.auth.signOut();
  window.location.href = 'login.html';
}
