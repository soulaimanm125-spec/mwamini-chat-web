document.addEventListener('DOMContentLoaded', () => {

    // =========================================================================
    // 1. SECURE DATABASE CREDENTIAL CONFIGURATION
    // =========================================================================
    // REPLACE THESE PLACEHOLDERS with your actual keys from your Firebase Console!
   const firebaseConfig = {
  apiKey: "AIzaSyD0O4t5dUeuzvZ19WCwHvy3aezwsBw4DOw",
  authDomain: "mwamini-chat.firebaseapp.com",
  projectId: "mwamini-chat",
  storageBucket: "mwamini-chat.firebasestorage.app",
  messagingSenderId: "653279393702",
  appId: "1:653279393702:web:e15237b70db62514794167",
  measurementId: "G-ZFWRJ501VJ"
};

    // Check if the script tags in HTML loaded successfully
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
    } else {
        console.error("Firebase SDK script headers missing from your HTML file.");
    }

    const auth = (typeof firebase !== 'undefined') ? firebase.auth() : null;
    const db = (typeof firebase !== 'undefined') ? firebase.firestore() : null;

    // Form DOM Elements
    const loginForm = document.getElementById('loginForm');
    const googleAuthBtn = document.getElementById('googleAuthBtn');
    const authErrorMessage = document.getElementById('authErrorMessage');
    const toggleAuthModeBtn = document.getElementById('toggleAuthModeBtn');
    
    const authTitle = document.getElementById('authTitle');
    const authSubtitle = document.getElementById('authSubtitle');
    const usernameFieldGroup = document.getElementById('usernameFieldGroup');
    const loginBtn = document.getElementById('loginBtn');
    const authModeSwitchFooter = document.getElementById('authModeSwitchFooter');

    let isRegistrationMode = false; // False = Login Mode, True = Register Mode

    // =========================================================================
    // 2. TOGGLE LOGIC: SWITCH BETWEEN LOGIN & REGISTER
    // =========================================================================
    if (loginForm) {
        // Intercept click actions to swap form fields cleanly
        document.body.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'toggleAuthModeBtn') {
                e.preventDefault();
                isRegistrationMode = !isRegistrationMode;
                clearErrorDisplay();

                if (isRegistrationMode) {
                    authTitle.textContent = "Create Account";
                    authSubtitle.textContent = "REGISTER NEW OPERATOR PROFILE";
                    usernameFieldGroup.style.display = "block";
                    document.getElementById('registerUsername').required = true;
                    loginBtn.textContent = "Register Account";
                    authModeSwitchFooter.innerHTML = `Already have an account? <a href="#" id="toggleAuthModeBtn">Sign In here</a>`;
                } else {
                    authTitle.textContent = "Sign In";
                    authSubtitle.textContent = "SECURE WORKSPACE PORTAL";
                    usernameFieldGroup.style.display = "none";
                    document.getElementById('registerUsername').required = false;
                    loginBtn.textContent = "Continue to Workspace";
                    authModeSwitchFooter.innerHTML = `New to the platform? <a href="#" id="toggleAuthModeBtn">Create an account</a>`;
                }
            }
        });
    }

    // =========================================================================
    // 3. SECURE AUTHENTICATION OPERATIONS (REGISTER & LOGIN)
    // =========================================================================
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            clearErrorDisplay();

            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value.trim();

            if (!auth || !db) {
                displayAuthError("Database connection configuration offline. Enter credentials after adding real Firebase keys.");
                return;
            }

            if (password.length < 6) {
                displayAuthError("Security enforcement: Password must be at least 6 characters long.");
                return;
            }

            loginBtn.disabled = true;

            if (isRegistrationMode) {
                // RUN REGISTRATION
                const username = document.getElementById('registerUsername').value.trim();
                loginBtn.textContent = "Creating Safe Account Profile...";

                auth.createUserWithEmailAndPassword(email, password)
                    .then((userCredential) => {
                        // Write user details to database so other members can find them in the sidebar
                        return db.collection("users").doc(userCredential.user.uid).set({
                            uid: userCredential.user.uid,
                            email: email,
                            username: username || email.split('@')[0],
                            statusText: "Active and connected",
                            timestamp: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    })
                    .then(() => {
                        window.location.href = 'dashboard.html';
                    })
                    .catch((err) => {
                        resetSubmitButton(isRegistrationMode ? "Register Account" : "Continue to Workspace");
                        displayAuthError(err.message);
                    });
            } else {
                // RUN SECURE LOGIN VERIFICATION
                loginBtn.textContent = "Verifying Credentials...";

                auth.signInWithEmailAndPassword(email, password)
                    .then(() => {
                        window.location.href = 'dashboard.html';
                    })
                    .catch((err) => {
                        resetSubmitButton(isRegistrationMode ? "Register Account" : "Continue to Workspace");
                        displayAuthError("Access Denied: " + err.message);
                    });
            }
        });
    }

    // Google Sign-In Identity Management
    if (googleAuthBtn && auth && db) {
        googleAuthBtn.addEventListener('click', () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithPopup(provider)
                .then((result) => {
                    const user = result.user;
                    return db.collection("users").doc(user.uid).set({
                        uid: user.uid,
                        email: user.email,
                        username: user.displayName || "Google User",
                        statusText: "Connected through Google Authenticator",
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                })
                .then(() => {
                    window.location.href = 'dashboard.html';
                })
                .catch((err) => displayAuthError(err.message));
        });
    }

    // Log Out Endpoint Action
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn && auth) {
        logoutBtn.addEventListener('click', () => {
            auth.signOut().then(() => { window.location.href = 'index.html'; });
        });
    }

    // =========================================================================
    // 4. REAL-TIME CHAT & FILE SYSTEM (dashboard.html)
    // =========================================================================
    const chatInputForm = document.getElementById('chatInputForm');
    const messageInput = document.getElementById('messageInput');
    const messagesWindow = document.getElementById('messagesWindow');
    const fileAttachment = document.getElementById('fileAttachment');
    const previewDrawer = document.getElementById('previewDrawer');
    const previewFileName = document.getElementById('previewFileName');
    const cancelPreviewBtn = document.getElementById('cancelPreviewBtn');

    let activeStagedFile = null;

    const scrollToBottom = () => { if (messagesWindow) messagesWindow.scrollTop = messagesWindow.scrollHeight; };

    // Capture file meta details to push across message streams
    if (fileAttachment) {
        fileAttachment.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            activeStagedFile = {
                name: file.name,
                size: (file.size / 1024).toFixed(1) + " KB",
                type: file.type
            };

            if (previewFileName && previewDrawer) {
                previewFileName.textContent = `📎 Ready to upload: ${activeStagedFile.name} (${activeStagedFile.size})`;
                previewDrawer.style.display = 'flex';
            }
        });
    }

    if (cancelPreviewBtn) {
        cancelPreviewBtn.addEventListener('click', () => clearStagedFile());
    }

    function clearStagedFile() {
        activeStagedFile = null;
        if (fileAttachment) fileAttachment.value = '';
        if (previewDrawer) previewDrawer.style.display = 'none';
    }

    // Sending Messaging Payloads
    if (chatInputForm) {
        chatInputForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const textContent = messageInput.value.trim();
            if (!textContent && !activeStagedFile) return;

            if (!db || !auth || !auth.currentUser) {
                // If developer config keys are empty, run temporary visual feedback backup
                const localTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                appendMessageBubble(textContent, activeStagedFile, localTime, 'sent', 'Me');
                messageInput.value = '';
                clearStagedFile();
                return;
            }

            // Write and broadcast globally to Firestore Database
            const user = auth.currentUser;
            db.collection("messages").add({
                text: textContent,
                senderUid: user.uid,
                senderName: user.displayName || user.email.split('@')[0],
                filePayload: activeStagedFile ? activeStagedFile : null,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                messageInput.value = '';
                clearStagedFile();
            }).catch(err => console.error("Database Write Error:", err));
        });
    }

    // Dynamic Engine UI Generation for Message Bubbles
    function appendMessageBubble(text, fileData, time, direction, name) {
        if (!messagesWindow) return;
        const bubble = document.createElement('div');
        bubble.className = `message ${direction}`;
        
        let contents = (direction === 'received') ? `<span class="sender">${escapeHTML(name)}</span>` : '';
        
        if (fileData) {
            contents += `
                <div class="file-attachment-bubble">
                    <span class="file-icon">📁</span>
                    <div>
                        <p style="font-weight:600; font-size:13px;">${escapeHTML(fileData.name)}</p>
                        <span style="font-size:10px; opacity:0.7;">${fileData.size}</span>
                    </div>
                </div>`;
        }
        if (text) contents += `<p style="margin-top: ${fileData ? '6px' : '0px'}">${escapeHTML(text)}</p>`;
        contents += `<span class="msg-time">${time}</span>`;
        
        bubble.innerHTML = contents;
        messagesWindow.appendChild(bubble);
        scrollToBottom();
    }

    // Listen live to Incoming Cloud Data Changes
    if (db && auth && messagesWindow) {
        auth.onAuthStateChanged((user) => {
            if (user) {
                db.collection("messages").orderBy("timestamp", "asc").onSnapshot((snapshot) => {
                    messagesWindow.innerHTML = ''; // Fresh clean render update path
                    snapshot.forEach((doc) => {
                        const msg = doc.data();
                        const directionState = (msg.senderUid === user.uid) ? 'sent' : 'received';
                        let timeStr = "Syncing...";
                        if (msg.timestamp) {
                            timeStr = msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        }
                        appendMessageBubble(msg.text, msg.filePayload, timeStr, directionState, msg.senderName);
                    });
                });
            }
        });
    }

    // =========================================================================
    // 5. STATUS PIPELINE & USER ROSTER SYNCHRONIZATION
    // =========================================================================
    const addStatusBtn = document.getElementById('addStatusBtn');
    const statusModal = document.getElementById('statusModal');
    const closeStatusModal = document.getElementById('closeStatusModal');
    const submitStatusBtn = document.getElementById('submitStatusBtn');
    const statusTextInput = document.getElementById('statusTextInput');
    const statusTray = document.querySelector('.status-tray');
    const chatList = document.getElementById('chatList');

    if (submitStatusBtn) {
        submitStatusBtn.addEventListener('click', () => {
            const statusString = statusTextInput.value.trim();
            if (!statusString) return;

            if (db && auth && auth.currentUser) {
                db.collection("users").doc(auth.currentUser.uid).update({
                    statusText: statusString,
                    statusTimestamp: firebase.firestore.FieldValue.serverTimestamp()
                }).then(() => {
                    statusModal.style.display = 'none';
                    statusTextInput.value = '';
                });
            }
        });
    }

    // Live sync side bar user data listings and top active status tray lists
    if (db && auth && statusTray) {
        auth.onAuthStateChanged((user) => {
            if (user) {
                db.collection("users").onSnapshot((snapshot) => {
                    statusTray.innerHTML = `<div class="status-item create-status" id="addStatusBtn"><div class="status-circle plus-icon">+</div><span>My Status</span></div>`;
                    if (chatList) chatList.innerHTML = '';

                    snapshot.forEach((doc) => {
                        const profile = doc.data();
                        const initials = profile.username ? profile.username.substring(0, 2).toUpperCase() : "OP";

                        // Populate top status bubble tracks
                        if (profile.statusText && profile.uid !== user.uid) {
                            const statusItem = document.createElement('div');
                            statusItem.className = 'status-item active-status';
                            statusItem.title = profile.statusText;
                            statusItem.innerHTML = `<div class="status-circle ring-gold">${initials}</div><span>${escapeHTML(profile.statusText)}</span>`;
                            statusTray.appendChild(statusItem);
                        }

                        // Populate dynamic sidebar chat targets roster list
                        if (chatList && profile.uid !== user.uid) {
                            const contactRow = document.createElement('div');
                            contactRow.className = 'chat-item';
                            contactRow.innerHTML = `
                                <div class="avatar">${initials}</div>
                                <div class="chat-info">
                                    <div class="chat-name-row">
                                        <h4>${escapeHTML(profile.username)}</h4>
                                        <span class="time">Active</span>
                                    </div>
                                    <p class="preview-text">${escapeHTML(profile.statusText || "Available")}</p>
                                </div>`;
                            chatList.appendChild(contactRow);
                        }
                    });
                });
            }
        });
    }

    // Global Utilities Helper
    function resetSubmitButton(label) { if (loginBtn) { loginBtn.disabled = false; loginBtn.textContent = label; } }
    function displayAuthError(msg) { if (authErrorMessage) { authErrorMessage.textContent = msg; authErrorMessage.style.display = "block"; } }
    function clearErrorDisplay() { if (authErrorMessage) { authErrorMessage.style.display = "none"; } }
    function escapeHTML(str) { return str.replace(/[&<>'"]/g, t => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t] || t)); }
});
