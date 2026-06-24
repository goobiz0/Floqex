const { Client } = require('pg');

async function test(url, name) {
  const client = new Client({ connectionString: url, connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
    console.log(`[SUCCESS] ${name} connected!`);
    await client.end();
  } catch (e) {
    console.error(`[FAIL] ${name}: ${e.message}`);
  }
}

async function run() {
  const pw = 'z5b4O)4TK0l:';
  const encodedPw = encodeURIComponent(pw);
  
  await test(`postgresql://postgres:${encodedPw}@db.fisqjoalatwvddzityww.supabase.co:5432/postgres`, 'Direct 5432');
  await test(`postgresql://postgres:${encodedPw}@db.fisqjoalatwvddzityww.supabase.co:6543/postgres`, 'Direct 6543');
  await test(`postgresql://postgres.fisqjoalatwvddzityww:${encodedPw}@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres`, 'Pooler IPv4 6543');
  await test(`postgresql://postgres.fisqjoalatwvddzityww:${encodedPw}@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`, 'Pooler IPv4 5432');
}
run();
