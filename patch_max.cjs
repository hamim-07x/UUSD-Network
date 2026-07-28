const fs = require('fs');
const file = 'src/pages/Withdraw.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '<button\n              onClick={handleMax}\n              className="text-[#8792FF] text-[13px] font-bold px-3 py-1.5 rounded-lg bg-[#8792FF]/10 hover:bg-[#8792FF]/20 transition-colors"\n            >\n              MAX\n            </button>',
  '<div className="flex items-center gap-2">\n              {minTransferAmount > 0 && <span className="text-[10px] text-white/40">Min: {minTransferAmount}</span>}\n              <button\n                onClick={handleMax}\n                className="text-[#8792FF] text-[13px] font-bold px-3 py-1.5 rounded-lg bg-[#8792FF]/10 hover:bg-[#8792FF]/20 transition-colors"\n              >\n                MAX\n              </button>\n            </div>'
);
fs.writeFileSync(file, content);
console.log("Max button patched");
