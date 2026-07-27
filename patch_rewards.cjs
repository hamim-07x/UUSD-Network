const fs = require('fs');
const file = 'src/pages/Rewards.tsx';
let content = fs.readFileSync(file, 'utf8');

const originalTimer = `                  {/* Subtle Top Right: Timer */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/20 backdrop-blur-sm px-2 py-1 rounded-md">
                    <Clock className="w-2.5 h-2.5 text-[#8792FF]/80" />
                    <div className="flex items-center text-white/80 font-mono text-[9px] font-medium tracking-wide">
                      <span>{String(tLeft.days).padStart(2, '0')}</span><span className="text-white/40 mx-[1px]">d</span>
                      <span>{String(tLeft.hours).padStart(2, '0')}</span><span className="text-white/40 mx-[1px]">h</span>
                      <span>{String(tLeft.mins).padStart(2, '0')}</span><span className="text-white/40 mx-[1px]">m</span>
                      <span>{String(tLeft.secs).padStart(2, '0')}</span><span className="text-white/40 ml-[1px]">s</span>
                    </div>
                  </div>`;

const replacementTimer = `                  {/* Subtle Top Right: Timer */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/20 backdrop-blur-sm px-2 py-1 rounded-md z-20">
                    {ev.isEnded ? (
                      <span className="text-red-400 font-bold text-[9px] tracking-widest uppercase">FINISHED</span>
                    ) : (
                      <>
                        <Clock className="w-2.5 h-2.5 text-[#8792FF]/80" />
                        <div className="flex items-center text-white/80 font-mono text-[9px] font-medium tracking-wide">
                          <span>{String(tLeft.days).padStart(2, '0')}</span><span className="text-white/40 mx-[1px]">d</span>
                          <span>{String(tLeft.hours).padStart(2, '0')}</span><span className="text-white/40 mx-[1px]">h</span>
                          <span>{String(tLeft.mins).padStart(2, '0')}</span><span className="text-white/40 mx-[1px]">m</span>
                          <span>{String(tLeft.secs).padStart(2, '0')}</span><span className="text-white/40 ml-[1px]">s</span>
                        </div>
                      </>
                    )}
                  </div>`;

content = content.replace(originalTimer, replacementTimer);

const originalImage = `                  <img 
                    src={ev.posterUrl || undefined}
                    alt={ev.title}
                    onError={(e) => { e.currentTarget.src = 'https://placehold.co/600x400/1a1b23/8792FF.png?text=Invalid+Image+URL'; e.currentTarget.onerror = null; }}
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f]/80 via-transparent to-transparent"></div>`;

const replacementImage = `                  <img 
                    src={ev.posterUrl || undefined}
                    alt={ev.title}
                    onError={(e) => { e.currentTarget.src = 'https://placehold.co/600x400/1a1b23/8792FF.png?text=Invalid+Image+URL'; e.currentTarget.onerror = null; }}
                    className={\`absolute inset-0 w-full h-full object-contain \${ev.isEnded ? 'opacity-50 grayscale-[50%]' : ''}\`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f]/90 via-[#0a0a0f]/20 to-transparent"></div>
                  
                  {ev.isEnded && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-10 flex items-center justify-center">
                      <div className="bg-red-500/90 text-white font-black text-2xl px-6 py-2 rounded-xl rotate-[-5deg] border-2 border-red-400/50 shadow-2xl tracking-widest shadow-red-500/20">
                        FINISHED
                      </div>
                    </div>
                  )}`;

content = content.replace(originalImage, replacementImage);

fs.writeFileSync(file, content);
console.log("Rewards patched.");
