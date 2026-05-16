/**
 * MWAMINI CHAT SYSTEM - ARCHITECTURE CONTROLLER
 * Full Real-Time Sync Engines for Accounts, Statuses, Messages & Files.
 */

document.addEventListener('DOMContentLoaded', () => {

    // =========================================================================
    // 1. SECURE DATABASE CREDENTIAL CONFIGURATION
    // =========================================================================
    // IMPORTANT: Swap out these values with your actual project keys from your Firebase Console!
const firebaseConfig = {
  apiKey: "AIzaSyD0O4t5dUeuzvZ19WCwHvy3aezwsBw4DOw",
  authDomain: "mwamini-chat.firebaseapp.com",
  projectId: "mwamini-chat",
  storageBucket: "mwamini-chat.firebasestorage.app",
  messagingSenderId: "653279393702",
  appId: "1:653279393702:web:e15237b70db62514794167",
  measurementId: "G-ZFWRJ501VJ"
};

    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
    } else {
        console.error("Firebase Core Engine Scripts failing to execute properly.");
    }

    const auth = (typeof firebase !== 'undefined') ? firebase.auth() : null;
    const db = (typeof firebase !== 'undefined') ? firebase.firestore() : null;

    // Interface DOM Selection Links
    const loginForm = document.getElementById('loginForm');
    const googleAuthBtn = document.getElementById('googleAuthBtn');
    const authErrorMessage = document.getElementById('authErrorMessage');
    
    const authTitle = document.getElementById('authTitle');
    const authSubtitle = document.getElementById('authSubtitle');
    const usernameFieldGroup = document.getElementById('usernameFieldGroup');
    const loginBtn = document.getElementById('loginBtn');
    const authModeSwitchFooter = document.getElementById('authModeSwitchFooter');

    let isRegistrationMode = false; // False = Sign In Mode, True = Account Registration Mode

    // =========================================================================
    // 2. LOG-IN / REGISTRATION PANEL TOGGLE ROUTINE
    // =========================================================================
    document.body.addEventListener('click', (e) => {
        if (e.target && e.target.id === 'toggleAuthModeBtn') {
            e.preventDefault();
            isRegistrationMode = !isRegistrationMode;
            if (authErrorMessage) authErrorMessage.style.display = "none";

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

    // =========================================================================
    // 3. SECURE AUTHENTICATION PIPELINE ENGINE
    // =========================================================================
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (authErrorMessage) authErrorMessage.style.display = "none";

            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value.trim();

            if (!auth || !db) {
                displayAuthError("Database link offline. Insert production configuration keys into your script file.");
                return;
            }

            if (password.length < 6) {
                displayAuthError("Password security restriction: Minimum string length must be 6 characters.");
                return;
            }

            loginBtn.disabled = true;

            if (isRegistrationMode) {
                const usernameValue = document.getElementById('registerUsername').value.trim();
                loginBtn.textContent = "Creating Safe Account...";

                auth.createUserWithEmailAndPassword(email, password)
                    .then((userCredential) => {
                        return db.collection("users").doc(userCredential.user.uid).set({
                            uid: userCredential.user.uid,
                            email: email,
                            username: usernameValue || email.split('@')[0],
                            statusText: "Active and online",
                            timestamp: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    })
                    .then(() => { window.location.href = 'dashboard.html'; })
                    .catch((err) => {
                        resetSubmitBtnState(isRegistrationMode ? "Register Account" : "Continue to Workspace");
                        displayAuthError(err.message);
                    });
            } else {
                loginBtn.textContent = "Checking Credentials...";
                auth.signInWithEmailAndPassword(email, password)
                    .then(() => { window.location.href = 'dashboard.html'; })
                    .catch((err) => {
                        resetSubmitBtnState(isRegistrationMode ? "Register Account" : "Continue to Workspace");
                        displayAuthError("Access Denied: " + err.message);
                    });
            }
        });
    }

    if (googleAuthBtn && auth && db) {
        googleAuthBtn.addEventListener('click', () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithPopup(provider)
                .then((result) => {
                    const user = result.user;
                    return db.collection("users").doc(user.uid).set({
                        uid: user.uid,
                        email: user.email,
                        username: user.displayName || "Google Operator",
                        statusText: "Connected via Google Auth",
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                })
                .then(() => { window.location.href = 'dashboard.html'; })
                .catch((err) => displayAuthError(err.message));
        });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn && auth) {
        logoutBtn.addEventListener('click', () => {
            auth.signOut().then(() => { window.location.href = 'index.html'; });
        });
    }

    // =========================================================================
    // 4. CHAT MESSAGING & FILE BROADCAST SYSTEM
    // =========================================================================
    const chatInputForm = document.getElementById('chatInputForm');
    const messageInput = document.getElementById('messageInput');
    const messagesWindow = document.getElementById('messagesWindow');
    const fileAttachment = document.getElementById('fileAttachment');
    const previewDrawer = document.getElementById('previewDrawer');
    const previewFileName = document.getElementById('previewFileName');
    const cancelPreviewBtn = document.getElementById('cancelPreviewBtn');

    let activeFilePayload = null;

    const scrollChatToBottom = () => { if (messagesWindow) messagesWindow.scrollTop = messagesWindow.scrollHeight; };

    if (fileAttachment) {
        fileAttachment.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            activeFilePayload = {
                name: file.name,
                size: (file.size / 1024).toFixed(1) + " KB",
                type: file.type
            };

            if (previewFileName && previewDrawer) {
                previewFileName.textContent = `📎 Staged File: ${activeFilePayload.name} (${activeFilePayload.size})`;
                previewDrawer.style.display = 'flex';
            }
        });
    }

    if (cancelPreviewBtn) {
        cancelPreviewBtn.addEventListener('click', () => clearStagedFileBox());
    }

    function clearStagedFileBox() {
        activeFilePayload = null;
        if (fileAttachment) fileAttachment.value = '';
        if (previewDrawer) previewDrawer.style.display = 'none';
    }

    if (chatInputForm) {
        chatInputForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = messageInput.value.trim();
            if (!text && !activeFilePayload) return;

            if (!db || !auth || !auth.currentUser) {
                const currentLocalTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                injectMessageBubbleHTML(text, activeFilePayload, currentLocalTime, 'sent', 'Me');
                messageInput.value = '';
                clearStagedFileBox();
                return;
            }

            const senderUserInstance = auth.currentUser;
            db.collection("messages").add({
                text: text,
                senderUid: senderUserInstance.uid,
                senderName: senderUserInstance.displayName || senderUserInstance.email.split('@')[0],
                filePayload: activeFilePayload ? activeFilePayload : null,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                messageInput.value = '';
                clearStagedFileBox();
            }).catch(err => console.error("Cloud Thread Storage Error: ", err));
        });
    }

    function injectMessageBubbleHTML(text, fileData, time, orientation, authorName) {
        if (!messagesWindow) return;
        const bubbleWrap = document.createElement('div');
        bubbleWrap.className = `message ${orientation}`;
        
        let visualHTML = (orientation === 'received') ? `<span class="sender">${escapeHTML(authorName)}</span>` : '';
        
        if (fileData) {
            visualHTML += `
                <div class="file-attachment-bubble">
                    <span class="file-icon">📁</span>
                    <div>
                        <p style="font-weight:600; font-size:13px;">${escapeHTML(fileData.name)}</p>
                        <span style="font-size:10px; opacity:0.7;">${fileData.size}</span>
                    </div>
                </div>`;
        }
        if (text) visualHTML += `<p style="margin-top: ${fileData ? '6px' : '0px'}">${escapeHTML(text)}</p>`;
        visualHTML += `<span class="msg-time">${time}</span>`;
        
        bubbleWrap.innerHTML = visualHTML;
        messagesWindow.appendChild(bubbleWrap);
        scrollChatToBottom();
    }

    if (db && auth && messagesWindow) {
        auth.onAuthStateChanged((userInstance) => {
            if (userInstance) {
                // Read out User Profile Info to populate the header
                db.collection("users").doc(userInstance.uid).get().then((docSnapshot) => {
                    if (docSnapshot.exists) {
                        const currentProfile = docSnapshot.data();
                        const displayUsername = document.getElementById('displayUsername');
                        const userAvatar = document.getElementById('userAvatar');
                        
                        if (displayUsername) displayUsername.textContent = currentProfile.username;
                        if (userAvatar) userAvatar.textContent = currentProfile.username.substring(0,2);
                    }
                });

                // Read live streaming chat threads
                db.collection("messages").orderBy("timestamp", "asc").onSnapshot((querySnapshot) => {
                    messagesWindow.innerHTML = '';
                    querySnapshot.forEach((doc) => {
                        const currentMsg = doc.data();
                        const trackingDirection = (currentMsg.senderUid === userInstance.uid) ? 'sent' : 'received';
                        let bubbleTime = "Syncing...";
                        if (currentMsg.timestamp) {
                            bubbleTime = currentMsg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        }
                        injectMessageBubbleHTML(currentMsg.text, currentMsg.filePayload, bubbleTime, trackingDirection, currentMsg.senderName);
                    });
                });
            }
        });
    }

    // =========================================================================
    // 5. STATUS PIPELINE & MEMBER ROSTER SYNCHRONIZATION
    // =========================================================================
    const addStatusBtn = document.getElementById('addStatusBtn');
    const statusModal = document.getElementById('statusModal');
    const closeStatusModal = document.getElementById('closeStatusModal');
    const submitStatusBtn = document.getElementById('submitStatusBtn');
    const statusTextInput = document.getElementById('statusTextInput');
    const statusTray = document.querySelector('.status-tray');
    const chatList = document.getElementById('chatList');

    if (addStatusBtn) addStatusBtn.addEventListener('click', () => statusModal.style.display = 'flex');
    if (closeStatusModal) closeStatusModal.addEventListener('click', () => {
        statusModal.style.display = 'none';
        statusTextInput.value = '';
    });

    if (submitStatusBtn) {
        submitStatusBtn.addEventListener('click', () => {
            const textValue = statusTextInput.value.trim();
            if (!textValue) return;

            if (db && auth && auth.currentUser) {
                db.collection("users").doc(auth.currentUser.uid).update({
                    statusText: textValue,
                    statusTimestamp: firebase.firestore.FieldValue.serverTimestamp()
                }).then(() => {
                    statusModal.style.display = 'none';
                    statusTextInput.value = '';
                });
            }
        });
    }

    if (db && auth && statusTray) {
        auth.onAuthStateChanged((userInstance) => {
            if (userInstance) {
                db.collection("users").onSnapshot((querySnapshot) => {
                    statusTray.innerHTML = `<div class="status-item create-status" id="addStatusBtn"><div class="status-circle plus-icon">+</div><span>My Status</span></div>`;
                    document.getElementById('addStatusBtn').addEventListener('click', () => statusModal.style.display = 'flex');
                    
                    if (chatList) chatList.innerHTML = '';

                    querySnapshot.forEach((doc) => {
                        const targetProfile = doc.data();
                        const matchingInitials = targetProfile.username ? targetProfile.username.substring(0, 2).toUpperCase() : "OP";

                        if (targetProfile.statusText && targetProfile.uid !== userInstance.uid) {
                            const statusNode = document.createElement('div');
                            statusNode.className = 'status-item active-status';
                            statusNode.title = targetProfile.statusText;
                            statusNode.innerHTML = `<div class="status-circle ring-gold">${matchingInitials}</div><span>${escapeHTML(targetProfile.statusText)}</span>`;
                            statusTray.appendChild(statusNode);
                        }

                        if (chatList && targetProfile.uid !== userInstance.uid) {
                            const contactRowNode = document.createElement('div');
                            contactRowNode.className = 'chat-item';
                            contactRowNode.innerHTML = `
                                <div class="avatar">${matchingInitials}</div>
                                <div class="chat-info">
                                    <div class="chat-name-row">
                                        <h4>${escapeHTML(targetProfile.username)}</h4>
                                        <span class="time">Active</span>
                                    </div>
                                    <p class="preview-text">${escapeHTML(targetProfile.statusText || "Available in workspace")}</p>
                                </div>`;
                            chatList.appendChild(contactRowNode);
                        }
                    });
                });
            }
        });
    }

    // Helper Closures
    function resetSubmitBtnState(label) { if (loginBtn) { loginBtn.disabled = false; loginBtn.textContent = label; } }
    function displayAuthError(msg) { if (authErrorMessage) { authErrorMessage.textContent = msg; authErrorMessage.style.display = "block"; } }
    function escapeHTML(str) { return str.replace(/[&<>'"]/g, t => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t] || t)); }
});
