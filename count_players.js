const fs = require('fs');
const content = fs.readFileSync('socket/auction.js', 'utf8');
const match = content.match(/const PLAYER_LIST = (\[[\s\S]*?\]);/);
if (match) {
    const list = eval(match[1]);
    console.log(list.length);
} else {
    console.log("Not found");
}
