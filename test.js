
const fs = require('fs');
fs.writeFileSync('test.log', 'Start\n');
process.env.NODE_ENV = 'production';
process.env.MicrosoftAppId = 'test';
try {
  const { loadAuthConfigFromEnv } = require('@microsoft/agents-hosting/dist/src/auth/authConfiguration');
  fs.appendFileSync('test.log', JSON.stringify(loadAuthConfigFromEnv()) + '\n');
} catch (e) { 
  fs.appendFileSync('test.log', 'Error: ' + e.message + '\n');
}

