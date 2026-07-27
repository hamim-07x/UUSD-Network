const fs = require('fs');
const path = 'src/pages/Wallet.tsx';
let src = fs.readFileSync(path, 'utf8');

const replacementHook = `  const filteredActivities = React.useMemo(() => {
    if (!activities) return [];
    return activities.filter(act => {
      if (activityFilter === 'all') return true;
      if (activityFilter === 'sent') return act.type === 'withdraw' || act.type === 'transfer_out';
      if (activityFilter === 'received') return act.type === 'deposit' || act.type === 'transfer_in';
      if (activityFilter === 'rewards') return act.type === 'earn';
      return true;
    });
  }, [activities, activityFilter]);`;

src = src.replace('  const filteredActivities = React.useMemo(() => {\n\n  const handleCopy = () => {', replacementHook + '\n\n  const handleCopy = () => {');

const earlyReturn = `  // Wallet creation is handled by AppLayout gate.
  // If we somehow land here without a wallet, show a minimal wait state.
  if (needsCreation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 text-center">
        <WalletIcon className="w-12 h-12 text-[#8792FF] mb-4 animate-pulse" />
        <p className="text-white/60 text-sm">Preparing your wallet...</p>
      </div>
    );
  }
`;

src = src.replace(earlyReturn, '');
src = src.replace(replacementHook, replacementHook + '\n\n' + earlyReturn);

fs.writeFileSync(path, src);
