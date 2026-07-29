const fs = require('fs');
const file = 'src/pages/WithdrawCountdown.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace('Withdraw Available Soon', 'Trade & Withdraw Available Soon');
content = content.replace('Withdrawals will be enabled on', 'Trading and Withdrawals will be enabled on');
content = content.replace('<h1 className="text-xl font-bold tracking-tight text-white/90">Withdraw</h1>', '<h1 className="text-xl font-bold tracking-tight text-white/90">Trade & Withdraw</h1>');

fs.writeFileSync(file, content);
console.log("WithdrawCountdown.tsx updated");
