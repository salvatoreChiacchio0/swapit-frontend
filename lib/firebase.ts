import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAPzKmhdtkBpih-SMC06722TtPHgLXZdKs",
  authDomain: "swapit-26bef.firebaseapp.com",
  projectId: "swapit-26bef",
  storageBucket: "swapit-26bef.appspot.com",
  messagingSenderId: "657747137359",
  appId: "1:657747137359:web:9202176271105c358e2b3a",
  measurementId: "G-XHJKG41E1R"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);


