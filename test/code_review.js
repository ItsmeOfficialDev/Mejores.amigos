const fs = require('fs');
const content = fs.readFileSync('socket/auction.js', 'utf8');
if (content.includes('amount % 5 !== 0')) console.log('[PASS] Bid increment check exists');
