/**
 * #AI_ZONE: FIREBASE_INIT
 * Connect: fill firebase-applet-config.json (AI Studio can inject).
 * Do not put bot tokens here. Scale: use multi-region / Blaze later.
 */

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

