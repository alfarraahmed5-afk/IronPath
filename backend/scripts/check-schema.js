// Standalone schema-drift check. Same probes as the boot-time gate in
// src/lib/schemaProbes.ts — this exists so you can run it against any
// environment from your laptop without redeploying the backend.
//
// Usage: `npm run -w backend check:schema` (rebuilds first via the script)
//
// Required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (in backend/.env).
// Point them at whichever environment you want to verify.

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

let schemaProbes;
try {
  schemaProbes = require('../dist/lib/schemaProbes');
} catch (err) {
  console.error('Could not load dist/lib/schemaProbes — run `npm run -w backend build` first.');
  console.error(err.message);
  process.exit(2);
}

(async () => {
  const url = process.env.SUPABASE_URL;
  if (!url) {
    console.error('SUPABASE_URL is required');
    process.exit(2);
  }
  console.log(`Schema probe target: ${url}`);
  const result = await schemaProbes.runSchemaProbes();
  if (result.ok) {
    console.log(`OK — ${result.total} probes passed.`);
    process.exit(0);
  }
  console.error(`FAIL — ${result.failures.length}/${result.total} probes failed:`);
  for (const f of result.failures) {
    console.error(`  · migration ${f.migration} (${f.description}) — ${f.reason}`);
  }
  console.error('\nProduction is missing one or more migrations. Apply them in the Supabase SQL editor before deploying.');
  process.exit(1);
})();
