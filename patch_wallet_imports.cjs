const fs = require('fs');
const file = 'src/pages/Wallet.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'import { Copy, Check, Send, Plus, ArrowUp, ArrowDown, ScanLine, Wallet as WalletIcon, Settings, ArrowDownLeft, ArrowUpRight, Gift, Clock, XCircle, CheckCircle2 } from "lucide-react";',
  'import { Copy, Check, Send, Plus, ArrowUp, ArrowDown, ScanLine, Wallet as WalletIcon, Settings, ArrowDownLeft, ArrowUpRight, Gift, Clock, XCircle, CheckCircle2, ArrowLeftRight } from "lucide-react";'
);

fs.writeFileSync(file, content);
console.log("Wallet imports patched");
