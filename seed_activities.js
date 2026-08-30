const { Client } = require('pg');

async function seed() {
  const connectionString = 'postgresql://postgres:uIM7GuHYiEuInumE@db.ojsdyaypjahrkclhszpp.supabase.co:5432/postgres';
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log("Connected to Supabase Postgres.");
    
    const sql = `
      CREATE TABLE IF NOT EXISTS lead_activities (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
          user_id UUID REFERENCES auth.users(id),
          activity_type VARCHAR(50) NOT NULL, -- call, email, whatsapp, meeting
          duration VARCHAR(50), -- e.g., '15 mins'
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Enable RLS (simplified for prototyping)
      ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
      
      -- Drop policies if they exist to avoid errors on re-run
      DROP POLICY IF EXISTS "Users can view activities for their leads" ON lead_activities;
      DROP POLICY IF EXISTS "Users can insert activities" ON lead_activities;

      -- Allow users to insert activities
      CREATE POLICY "Users can insert activities" 
      ON lead_activities FOR INSERT 
      WITH CHECK (auth.uid() = user_id);

      -- Allow users to view their own activities
      CREATE POLICY "Users can view activities for their leads" 
      ON lead_activities FOR SELECT 
      USING (auth.uid() = user_id);
    `;
    
    await client.query(sql);
    console.log("Lead Activities table successfully created!");
    
  } catch (err) {
    console.error("Error executing SQL:", err);
  } finally {
    await client.end();
  }
}

seed();
