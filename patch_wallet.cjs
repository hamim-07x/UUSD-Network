const fs = require('fs');
const file = 'src/pages/Wallet.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'const filteredActivities = React.useMemo(() => {\\n\\n  const handleCopy = () => {',
  \`const filteredActivities = React.useMemo(() => {
    if (!activities) return [];
    return activities.filter(act => {
      if (activityFilter === 'all') return true;
      if (activityFilter === 'sent') return act.type === 'withdraw' || act.type === 'transfer_out';
      if (activityFilter === 'received') return act.type === 'deposit' || act.type === 'transfer_in';
      if (activityFilter === 'rewards') return act.type === 'earn';
      return true;
    });
  }, [activities, activityFilter]);

  const handleCopy = () => {\`
);

// wait the replace might not match because I escaped it in a string.
