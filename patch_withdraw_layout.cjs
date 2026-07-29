const fs = require('fs');
const file = 'src/pages/Withdraw.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldAmountSection = `{/* Amount */}
        <div className="flex flex-col gap-2 mt-1">
          <div className="flex items-center justify-between">
            <label className="text-[14px] font-medium text-white/70">Amount</label>
            <span className="text-[12px] text-white/50">
              Available: {availableAmount} {UUSD_TOKEN.symbol}
            </span>
          </div>
          <div className="flex items-center p-3 rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/[0.05] focus-within:border-[#8792FF]/50 transition-colors shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full bg-transparent border-none outline-none text-[20px] font-semibold placeholder:text-white/20"
            />
            <div className="flex items-center gap-2">
              {minTransferAmount > 0 && <span className="text-[10px] text-white/40">Min: {minTransferAmount}</span>}
              <button
                onClick={handleMax}
                className="text-[#8792FF] text-[13px] font-bold px-3 py-1.5 rounded-lg bg-[#8792FF]/10 hover:bg-[#8792FF]/20 transition-colors"
              >
                MAX
              </button>
            </div>
          </div>
        </div>`;

const newAmountSection = `{/* Amount */}
        <div className="flex flex-col gap-2 mt-1">
          <label className="text-[14px] font-medium text-white/70">Amount</label>
          <div className="flex items-center p-3 rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/[0.05] focus-within:border-[#8792FF]/50 transition-colors shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full bg-transparent border-none outline-none text-[20px] font-semibold placeholder:text-white/20"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleMax}
                className="text-[#8792FF] text-[13px] font-bold px-3 py-1.5 rounded-lg bg-[#8792FF]/10 hover:bg-[#8792FF]/20 transition-colors"
              >
                MAX
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between mt-1 px-1">
            <span className="text-[12px] text-white/50">
              Available: <strong className="text-white/80">{availableAmount} {UUSD_TOKEN.symbol}</strong>
            </span>
            {minTransferAmount > 0 && (
              <span className="text-[12px] text-white/50">
                Min: <strong className="text-white/80">{minTransferAmount} {UUSD_TOKEN.symbol}</strong>
              </span>
            )}
          </div>
        </div>`;

content = content.replace(oldAmountSection, newAmountSection);
fs.writeFileSync(file, content);
console.log("Withdraw amount layout patched");
