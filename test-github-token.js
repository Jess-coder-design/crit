// Test script to verify GitHub token can read & write to your repo
// Usage: node test-github-token.js YOUR_TOKEN_HERE

const https = require('https');

const token = process.argv[2];
const owner = 'Jess-coder-design';
const repo = 'crit';

if (!token) {
  console.error('❌ No token provided. Usage: node test-github-token.js YOUR_TOKEN_HERE');
  process.exit(1);
}

console.log(`Testing GitHub token for ${owner}/${repo}...\n`);

// Test 1: Verify token works (get user info)
function testTokenValidity() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: '/user',
      method: 'GET',
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'Token-Test-Script'
      }
    };

    https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const user = JSON.parse(data);
          console.log(`✅ Token is valid. Authenticated as: ${user.login}`);
          resolve(true);
        } else {
          console.error(`❌ Token validation failed: ${res.statusCode}`);
          reject(false);
        }
      });
    }).on('error', reject).end();
  });
}

// Test 2: Try to create a test file
function testFileWrite() {
  return new Promise((resolve, reject) => {
    const testFileName = 'test-token-write.txt';
    const testContent = `Token test at ${new Date().toISOString()}`;
    const encodedContent = Buffer.from(testContent).toString('base64');

    const options = {
      hostname: 'api.github.com',
      path: `/repos/${owner}/${repo}/contents/${testFileName}`,
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'Token-Test-Script',
        'Content-Type': 'application/json'
      }
    };

    const payload = JSON.stringify({
      message: 'Test commit via token',
      content: encodedContent
    });

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 201 || res.statusCode === 200) {
          console.log(`✅ Successfully wrote file: ${testFileName}`);
          resolve(true);
        } else {
          console.error(`❌ File write failed: ${res.statusCode}`);
          console.error(data);
          reject(false);
        }
      });
    }).on('error', reject);

    req.write(payload);
    req.end();
  });
}

// Run tests
(async () => {
  try {
    await testTokenValidity();
    console.log('');
    await testFileWrite();
    console.log('\n✅ All tests passed! Token is ready to use.');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
})();
