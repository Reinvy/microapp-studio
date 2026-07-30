const https = require('https');

const base = 'https://microapp-studio.vercel.app';
const routes = ['/', '/login', '/app', '/builder', '/dev'];

let allOk = true;
let completed = 0;

routes.forEach(path => {
  const url = new URL(path, base);
  const req = https.request(url, { method: 'HEAD', timeout: 10000 }, (res) => {
    const ok = res.statusCode >= 200 && res.statusCode < 400;
    console.log(`${ok ? '✅' : '❌'} ${path} → HTTP ${res.statusCode}`);
    allOk = allOk && ok;
    completed++;
    if (completed === routes.length) {
      console.log(`\n${allOk ? '✅ All routes OK' : '❌ Some routes failed'}`);
      process.exit(allOk ? 0 : 1);
    }
  });
  req.on('error', (e) => {
    console.log(`❌ ${path} → ${e.message}`);
    allOk = false;
    completed++;
    if (completed === routes.length) {
      console.log(`\n❌ Some routes failed`);
      process.exit(1);
    }
  });
  req.end();
});
