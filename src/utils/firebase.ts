// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAv0UXuDvpZ-pCKNDcA9Kclcao5MJTLLEc",
  authDomain: "yt-music-together.firebaseapp.com",
  databaseURL:
    "https://yt-music-together-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "yt-music-together",
  storageBucket: "yt-music-together.appspot.com",
  messagingSenderId: "118295918393",
  appId: "1:118295918393:web:08849679d3e5aea6061ae8",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);
