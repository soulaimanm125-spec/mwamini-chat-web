// Paste your unique Firebase configuration here
const firebaseConfig = {
  apiKey: "AIzaSyBAvEGxHrS6b5dOgc9TpWPSMR-K2i6lIxA",
  authDomain: "mwamini-chat-web-e0d8c.firebaseapp.com",
  projectId: "mwamini-chat-web-e0d8c",
  storageBucket: "mwamini-chat-web-e0d8c.firebasestorage.app",
  messagingSenderId: "780880757548",
  appId: "1:780880757548:web:ac60921ed3ef873003a289",
  measurementId: "G-QZ2S2TJB8X"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ==========================================
// REAL REGISTER & LOGIN ACCOUNT LOGIC
// ==========================================
// For a real registration button (if you add an input for it in HTML):
function registerNewUser(email, password, username) {
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Save user profile info to the database so others can see them
            return db.collection("users").doc(userCredential.user.uid).set({
                username: username,
                email: email,
                status: "Hey there! I am using Mwamini Chat."
            });
        })
        .then(() => {
            window.location.href = 'dashboard.html';
        })
        .catch((error) => {
            document.getElementById('authErrorMessage').textContent = error.message;
            document.getElementById('authErrorMessage').style.display = "block";
        });
}

// Real Sign In verification
const realLoginForm = document.getElementById('loginForm');
if (realLoginForm) {
    realLoginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value.trim();

        auth.signInWithEmailAndPassword(email, password)
            .then(() => {
                window.location.href = 'dashboard.html';
            })
            .catch((error) => {
                const errorBox = document.getElementById('authErrorMessage');
                errorBox.textContent = "Authentication failed: " + error.message;
                errorBox.style.display = "block";
            });
    });
}
