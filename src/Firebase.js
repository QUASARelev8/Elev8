// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAJPLVBp0K7kZAwosGgz_IZHlaYiQqv1bI",
  authDomain: "sargo-2c940.firebaseapp.com",
  projectId: "sargo-2c940",
  storageBucket: "sargo-2c940.firebasestorage.app",
  messagingSenderId: "715515853772",
  appId: "1:715515853772:web:b200c19b5a96582c8d7b69",
  measurementId: "G-NF3WQFE1LL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);