const { Client } = require('pg');

async function applySecurity() {
  const connectionString = 'postgresql://postgres:uIM7GuHYiEuInumE@db.ojsdyaypjahrkclhszpp.supabase.co:5432/postgres';
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log("Connected to Supabase Postgres.");

    // 1. Clean up Schema for Supabase Auth Integration
    console.log("Cleaning up schema constraints...");
    await client.query(`
      ALTER TABLE associates DROP CONSTRAINT IF EXISTS associates_user_id_fkey;
      ALTER TABLE associates ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'ASSOCIATE';
      
      -- Insert existing auth.users into associates if they don't exist
      INSERT INTO associates (user_id, referral_code, status, role)
      SELECT id, substr(md5(random()::text), 1, 8), 'PENDING_KYC', 'ASSOCIATE'
      FROM auth.users
      WHERE id NOT IN (SELECT user_id FROM associates);
      
      -- Update Divyam's account to be ADMIN
      UPDATE associates 
      SET role = 'ADMIN', status = 'ACTIVE' 
      WHERE user_id IN (
        SELECT id FROM auth.users WHERE email = '+919327001929@jst.internal'
      );
    `);

    // 2. Auto-create associate on signup
    console.log("Creating auth triggers...");
    await client.query(`
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS trigger AS $$
      BEGIN
        INSERT INTO public.associates (user_id, status, referral_code, role)
        VALUES (new.id, 'PENDING_KYC', substr(md5(random()::text), 1, 8), 'ASSOCIATE');
        RETURN new;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
    `);

    // 3. Row Level Security (RLS)
    console.log("Applying Row Level Security...");
    const rlsSql = `
      -- Enable RLS
      ALTER TABLE associates ENABLE ROW LEVEL SECURITY;
      ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
      ALTER TABLE lead_attributions ENABLE ROW LEVEL SECURITY;
      
      -- Drop existing policies
      DROP POLICY IF EXISTS "Associates can read own data" ON associates;
      DROP POLICY IF EXISTS "Admins can read all associates" ON associates;
      DROP POLICY IF EXISTS "Associates can read own leads" ON leads;
      DROP POLICY IF EXISTS "Associates can insert own leads" ON leads;
      DROP POLICY IF EXISTS "Admins can do everything on leads" ON leads;
      DROP POLICY IF EXISTS "Associates can view own attributions" ON lead_attributions;
      DROP POLICY IF EXISTS "Associates can insert own attributions" ON lead_attributions;
      DROP POLICY IF EXISTS "Admins can view all attributions" ON lead_attributions;

      -- Associates table policies
      CREATE POLICY "Associates can read own data" 
      ON associates FOR SELECT 
      USING (auth.uid() = user_id);
      
      CREATE POLICY "Admins can read all associates" 
      ON associates FOR ALL 
      USING (
        EXISTS (
          SELECT 1 FROM associates a 
          WHERE a.user_id = auth.uid() AND a.role = 'ADMIN'
        )
      );

      -- Leads table policies
      CREATE POLICY "Associates can read own leads" 
      ON leads FOR SELECT 
      USING (
        EXISTS (
          SELECT 1 FROM lead_attributions la
          JOIN associates a ON la.associate_id = a.id
          WHERE la.lead_id = leads.id AND a.user_id = auth.uid()
        )
      );

      CREATE POLICY "Associates can insert own leads" 
      ON leads FOR INSERT 
      WITH CHECK (true); -- allowed to insert, attribution handles linking

      CREATE POLICY "Admins can do everything on leads" 
      ON leads FOR ALL 
      USING (
        EXISTS (
          SELECT 1 FROM associates a 
          WHERE a.user_id = auth.uid() AND a.role = 'ADMIN'
        )
      );

      -- Lead Attributions policies
      CREATE POLICY "Associates can view own attributions" 
      ON lead_attributions FOR SELECT 
      USING (
        EXISTS (
          SELECT 1 FROM associates a 
          WHERE a.id = lead_attributions.associate_id AND a.user_id = auth.uid()
        )
      );

      CREATE POLICY "Associates can insert own attributions" 
      ON lead_attributions FOR INSERT 
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM associates a 
          WHERE a.id = lead_attributions.associate_id AND a.user_id = auth.uid()
        )
      );

      CREATE POLICY "Admins can view all attributions" 
      ON lead_attributions FOR ALL 
      USING (
        EXISTS (
          SELECT 1 FROM associates a 
          WHERE a.user_id = auth.uid() AND a.role = 'ADMIN'
        )
      );
    `;
    await client.query(rlsSql);

    // 4. DB Constraints (Lead Collision Prevention)
    console.log("Applying DB Constraints...");
    await client.query(`
      CREATE OR REPLACE FUNCTION enforce_unique_lead()
      RETURNS trigger AS $$
      BEGIN
        IF EXISTS (SELECT 1 FROM leads WHERE masked_mobile = NEW.masked_mobile) THEN
          RAISE EXCEPTION 'Lead with this mobile number already exists.';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS before_insert_lead ON leads;
      CREATE TRIGGER before_insert_lead
        BEFORE INSERT ON leads
        FOR EACH ROW EXECUTE PROCEDURE enforce_unique_lead();
    `);

    console.log("Security policies successfully applied!");
    
  } catch (err) {
    console.error("Error executing SQL:", err);
  } finally {
    await client.end();
  }
}

applySecurity();
