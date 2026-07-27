const fs = require('fs');
const file = 'src/pages/Rewards.tsx';
let content = fs.readFileSync(file, 'utf8');

const originalStartBtn = `<button 
                      onClick={() => {
                        setSelectedEventId(ev.id);
                        const firstCat = 'All';
                        setActiveCategory(firstCat);
                      }}
                      className="bg-[#8792FF] hover:bg-[#727dee] text-white font-bold py-1.5 px-4 rounded-full active:scale-95 transition-transform shadow-[0_2px_8px_rgba(135,146,255,0.4)] flex items-center gap-1.5 text-[13px] shrink-0 ml-4"
                    >
                      Start <ArrowRight className="w-3.5 h-3.5" />
                    </button>`;

const replacementStartBtn = `{!ev.isEnded && (
                    <button 
                      onClick={() => {
                        setSelectedEventId(ev.id);
                        const firstCat = 'All';
                        setActiveCategory(firstCat);
                      }}
                      className="bg-[#8792FF] hover:bg-[#727dee] text-white font-bold py-1.5 px-4 rounded-full active:scale-95 transition-transform shadow-[0_2px_8px_rgba(135,146,255,0.4)] flex items-center gap-1.5 text-[13px] shrink-0 ml-4 z-20"
                    >
                      Start <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    )}`;

content = content.replace(originalStartBtn, replacementStartBtn);
fs.writeFileSync(file, content);
console.log("Rewards start button patched.");
