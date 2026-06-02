const { execSync } = require('child_process');
try {
  const data = { site_id: "87c4701e-08c3-42e7-9d7a-123456789", body: { custom_domain: "772341320.xyz" } };
  // I need the exact site_id for subtle-moxie-311ebe
  const sites = JSON.parse(execSync('netlify api listSites --data {}', { encoding: 'utf-8' }));
  const mySite = sites.find(s => s.name === 'subtle-moxie-311ebe');
  if (mySite) {
      console.log('Found site ID:', mySite.id);
      execSync(`netlify api updateSite --data '${JSON.stringify({ site_id: mySite.id, body: { custom_domain: "772341320.xyz" } })}'`, { stdio: 'inherit' });
      console.log('Domain added successfully!');
  } else {
      console.log('Site not found!');
  }
} catch (e) { console.error(e.message); }
