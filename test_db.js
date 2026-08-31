const { Client } = require('pg');

async function test() {
  const connectionString = 'postgresql://postgres:uIM7GuHYiEuInumE@db.ojsdyaypjahrkclhszpp.supabase.co:5432/postgres';
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    // Check tables
    let res = await client.query("SELECT count(*) FROM users;");
    console.log("users count:", res.rows[0].count);
    
    res = await client.query("SELECT count(*) FROM associates;");
    console.log("associates count:", res.rows[0].count);
    
    res = await client.query("SELECT count(*) FROM leads;");
    console.log("leads count:", res.rows[0].count);

    res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'associates'
    `);
    console.log("associates schema:", res.rows);
    
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
test();
