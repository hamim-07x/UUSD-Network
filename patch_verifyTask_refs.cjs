const fs = require('fs');
const file = 'src/lib/verifyTask.ts';
let content = fs.readFileSync(file, 'utf8');

const oldGetReferralCount = `/** Count how many people this user has referred (from Firestore only) */
export async function getReferralCount(referrerId: string): Promise<number> {
  try {
    const q = query(collection(db, "referrals"), where("referrerId", "==", referrerId));
    const snap = await getDocs(q);
    return snap.size;
  } catch (e) {
    console.error("getReferralCount error", e);
    return 0;
  }
}`;

const newGetReferralCount = `/** Count how many people this user has referred (from Firestore only) */
export async function getReferralCount(referrerId: string): Promise<number> {
  try {
    const q = query(collection(db, "referrals"), where("referrerId", "==", referrerId));
    const snap = await getDocs(q);
    
    let qualifiedCount = 0;
    
    for (const d of snap.docs) {
      const refData = d.data();
      const completedDoc = await getDoc(doc(db, "completed_tasks", refData.referredId));
      if (completedDoc.exists()) {
        const completedData = completedDoc.data();
        if (Object.keys(completedData || {}).length >= 3) {
          qualifiedCount++;
        }
      }
    }
    
    return qualifiedCount;
  } catch (e) {
    console.error("getReferralCount error", e);
    return 0;
  }
}`;

content = content.replace(oldGetReferralCount, newGetReferralCount);
fs.writeFileSync(file, content);
console.log("verifyTask.ts updated for qualified referrals");
