// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAx0MAEUiYCGq-fY1OI-nOYR4-uRXh43ws",
  authDomain: "tracker-6f5af.firebaseapp.com",
  databaseURL: "https://tracker-6f5af-default-rtdb.firebaseio.com",
  projectId: "tracker-6f5af",
  storageBucket: "tracker-6f5af.firebasestorage.app",
  messagingSenderId: "311345597895",
  appId: "1:311345597895:web:34bcaecc4403985d45dde2"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
