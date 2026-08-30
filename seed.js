const { Client } = require('pg');
const fs = require('fs');

async function seed() {
  const connectionString = 'postgresql://postgres:uIM7GuHYiEuInumE@db.ojsdyaypjahrkclhszpp.supabase.co:5432/postgres';
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log("Connected to Supabase Postgres.");
    
    const sql = fs.readFileSync('C:/Users/Devesh/OneDrive/Desktop/JST/JST_Investor_Paradise_Developer_Handover_v2.0/database_schema_starter.sql', 'utf8');
    
    await client.query(sql);
    console.log("Schema successfully applied to Supabase!");
    
  } catch (err) {
    console.error("Error executing SQL:", err);
  } finally {
    await client.end();
  }
}

seed();
