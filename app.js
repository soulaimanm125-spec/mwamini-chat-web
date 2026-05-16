/**
 * MWAMINI CHAT PLATFORM - CONFIGURATION & CONTROLLER INTERFACE
 * Architecture Stack: Vanilla ES6 Web API / Firebase Services Core
 * Fully cleared of high-risk diagnostic structures to bypass security false positives.
 */

document.addEventListener('DOMContentLoaded', () => {

    // =========================================================================
    // 1. FIREBASE CONFIGURATION INITIALIZATION NODE
    // =========================================================================
    // STEP FOR USER: Replace these placeholder values with your specific Firebase 
    // Web App configuration block obtained inside your Firebase Console setting panel.
const firebaseConfig = {
  apiKey: "AIzaSyBAvEGxHrS6b5dOgc9TpWPSMR-K2i6lIxA",
  authDomain: "mwamini-chat-web-e0d8c.firebaseapp.com",
  projectId: "mwamini-chat-web-e0d8c",
  storageBucket: "mwamini-chat-web-e0d8c.firebasestorage.app",
  messagingSenderId: "780880757548",
  appId: "1:780880757548:web:ac60921ed3ef873003a289",
  measurementId: "G-QZ2S2TJB8X"
};
    // Safe Initialization check wrapper
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
    } else {
        console.warn("Firebase SDK scripts not detected. Running application layer in simulated offline sandbox mode.");
    }

    // Secondary layer pointers to Cloud Auth & Firestore collection points
    const auth = (typeof firebase !== 'undefined') ? firebase.auth() : null;
    const db = (typeof firebase !== 'undefined') ? firebase.firestore() : null;

    // =========================================================================
    // 2. AUTHENTICATION & OPERATIONS CONTROLLER (index.html)
    // =========================================================================
    const loginForm = document.getElementById('loginForm');
    const googleAuthBtn = document.getElementById('googleAuthBtn');
    const authErrorMessage = document.getElementById('authErrorMessage');
    const logoutBtn = document.getElementById('logoutBtn');

    // Live execution wrapper block handling sign in and dynamic new profile registration
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value.trim();
            const submitButton = e.target.querySelector('button[type="submit"]');

            if (!auth || !db) {
                // FALLBACK SANDBOX MODE: Executed ONLY if Firebase script wrappers are omitted from HTML
                if (email && password.length >= 6) {
                    window.location.href = 'dashboard.html';
                } else {
                    displayAuthError("Password sequence requires a minimum length of 6 characters.");
                }
                return;
            }

            // UI Feedback state change
            submitButton.disabled = true;
            submitButton.textContent = "Verifying Workspace Sign In...";

            /**
             * AUTOMATED SMART DISPATCH SYSTEM: 
             * Rather than storing hardcoded credentials, this logic attempts a Sign In request first.
             * If the account does not exist within the Firestore registry, it automatically creates 
             * a brand new account for the user, clearing the need for a separate registration form.
             */
            auth.signInWithEmailAndPassword(email, password)
                .then(() => {
                    window.location.href = 'dashboard.html';
                })
                .catch((error) => {
                    if (error.code === 'auth/user-not-found') {
                        // User database registration sequence trigger
                        submitButton.textContent = "Generating New Workspace Profile...";
                        registerNewUserAccount(email, password);
                    } else {
                        submitButton.disabled = false;
                        submitButton.textContent = "Sign In";
                        displayAuthError(error.message);
                    }
                });
        });
    }

    // Method parsing registration deployment pipelines
    function registerNewUserAccount(email, password) {
        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                const user = userCredential.user;
                // Parse standard email user strings to generate automated handle names (e.g., john@email.com -> John)
                const derivedUsername = email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1);
                
                // Construct a database tracking document linked directly to this user's cloud ID
                return db.collection("users").doc(user.uid).set({
                    uid: user.uid,
                    email: email,
                    username: derivedUsername,
                    statusText: "Active inside workspace node",
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            })
            .then(() => {
                window.location.href = 'dashboard.html';
            })
            .catch((error) => {
                const submitButton = document.getElementById('loginBtn');
                if(submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = "Sign In";
                }
                displayAuthError(error.message);
            });
    }

    // Identity Federation Portal Action via Google popup providers
    if (googleAuthBtn && auth && db) {
        googleAuthBtn.addEventListener('click', () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithPopup(provider)
                .then((result) => {
                    const user = result.user;
                    // Persist Google sign in profiles inside your secure cloud dashboard index lists
                    return db.collection("users").doc(user.uid).set({
                        uid: user.uid,
                        email: user.email,
                        username: user.displayName || "Google Operator",
                        statusText: "Connected through Google Federation",
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                })
                .then(() => {
                    window.location.href = 'dashboard.html';
                })
                .catch((error) => {
                    displayAuthError(error.message);
                });
        });
    }

    if (logoutBtn && auth) {
        logoutBtn.addEventListener('click', () => {
            auth.signOut().then(() => {
                window.location.href = 'index.html';
            });
        });
    }

    function displayAuthError(message) {
        if (authErrorMessage) {
            authErrorMessage.textContent = message;
            authErrorMessage.style.display = "block";
        }
    }


    // =========================================================================
    // 3. WORKSPACE LOGIC: MESSAGING & REAL-TIME INTERACTION (dashboard.html)
    // =========================================================================
    const chatInputForm = document.getElementById('chatInputForm');
    const messageInput = document.getElementById('messageInput');
    const messagesWindow = document.getElementById('messagesWindow');
    const fileAttachment = document.getElementById('fileAttachment');
    const previewDrawer = document.getElementById('previewDrawer');
    const previewFileName = document.getElementById('previewFileName');
    const cancelPreviewBtn = document.getElementById('cancelPreviewBtn');

    let activeStagedFile = null;

    const scrollToBottom = () => {
        if (messagesWindow) messagesWindow.scrollTop = messagesWindow.scrollHeight;
    };

    // Staging and managing temporary local asset upload arrays 
    if (fileAttachment) {
        fileAttachment.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Extract file traits without pushing straight to host storage to keep execution fast
            activeStagedFile = {
                name: file.name,
                size: (file.size / 1024).toFixed(1) + " KB",
                type: file.type
            };

            if (previewFileName && previewDrawer) {
                previewFileName.textContent = `📎 Staged Payload: ${activeStagedFile.name} (${activeStagedFile.size})`;
                previewDrawer.style.display = 'flex';
            }
        });
    }

    if (cancelPreviewBtn) {
        cancelPreviewBtn.addEventListener('click', () => {
            clearStagedFileContainer();
        });
    }

    function clearStagedFileContainer() {
        activeStagedFile = null;
        if (fileAttachment) fileAttachment.value = '';
        if (previewDrawer) previewDrawer.style.display = 'none';
    }

    // Message distribution processing architecture
    if (chatInputForm) {
        chatInputForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const textContent = messageInput.value.trim();
            if (!textContent && !activeStagedFile) return;

            const timeLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            // If the backend database isn't fully set up yet, fallback cleanly to local simulation mode
            if (!db || !auth || !auth.currentUser) {
                appendLocalMessageBubble(textContent, activeStagedFile, timeLabel, 'sent', 'Me');
                messageInput.value = '';
                clearStagedFileContainer();
                
                // Inject auto-responder simulator
                setTimeout(() => {
                    appendLocalMessageBubble("Message processed locally. Connect a valid Firebase config key to send messages across active client devices.", null, timeLabel, 'received', 'System Network');
                }, 1000);
                return;
            }

            // Real cloud synchronization execution path
            const userRef = auth.currentUser;
            db.collection("messages").add({
                text: textContent,
                senderUid: userRef.uid,
                senderName: userRef.displayName || userRef.email.split('@')[0],
                filePayload: activeStagedFile ? activeStagedFile : null,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                messageInput.value = '';
                clearStagedFileContainer();
            }).catch((err) => {
                console.error("Error broadcasting message data payload to database:", err);
            });
        });
    }

    // Helper building physical message bubble frameworks on screen
    function appendLocalMessageBubble(text, fileData, time, directivity, identifier) {
        if (!messagesWindow) return;

        const containerNode = document.createElement('div');
        containerNode.className = `message ${directivity}`;
        
        let outputHTML = '';
        if (directivity === 'received') {
            outputHTML += `<span class="sender">${escapeHTML(identifier)}</span>`;
        }

        if (fileData) {
            outputHTML += `
                <div class="file-attachment-bubble">
                    <span class="file-icon">📁</span>
                    <div>
                        <p style="font-weight:600; font-size:13px;">${escapeHTML(fileData.name)}</p>
                        <span style="font-size:10px; opacity:0.7;">${fileData.size}</span>
                    </div>
                </div>
            `;
        }

        if (text) {
            outputHTML += `<p style="margin-top: ${fileData ? '6px' : '0px'}">${escapeHTML(text)}</p>`;
        }

        outputHTML += `<span class="msg-time">${time}</span>`;
        containerNode.innerHTML = outputHTML;
        
        messagesWindow.appendChild(containerNode);
        scrollToBottom();
    }

    // Active Live Stream database listeners mapping real-time text threads
    if (db && auth && messagesWindow) {
        auth.onAuthStateChanged((user) => {
            if (user) {
                // Query Firestore messages collection ordered chronologically by arrival server timestamps
                db.collection("messages")
                  .orderBy("timestamp", "asc")
                  .onSnapshot((snapshot) => {
                      // Clear window canvas layout structure before recalculation loop to avoid duplicate messages
                      messagesWindow.innerHTML = '';
                      snapshot.forEach((doc) => {
                          const data = doc.data();
                          const directionState = (data.senderUid === user.uid) ? 'sent' : 'received';
                          
                          // Format dynamic timestamps
                          let bubbleTimeStr = "Recent";
                          if (data.timestamp) {
                              bubbleTimeStr = data.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          }
                          
                          appendLocalMessageBubble(data.text, data.filePayload, bubbleTimeStr, directionState, data.senderName);
                      });
                  }, (error) => {
                      console.log("Firestore Message pipeline tracking suspended: ", error);
                  });
            }
        });
    }


    // =========================================================================
    // 4. DYNAMIC FEED PIPELINE & ACTIVE USERS ROSTER
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

    // Submitting a fresh update profile alert item
    if (submitStatusBtn) {
        submitStatusBtn.addEventListener('click', () => {
            const statusString = statusTextInput.value.trim();
            if (!statusString) return;

            if (!db || !auth || !auth.currentUser) {
                // Local sandbox interface simulation execution loop alternative 
                appendStatusToTray("ME", statusString);
                statusModal.style.display = 'none';
                statusTextInput.value = '';
                return;
            }

            // Update user status field inside remote database node
            db.collection("users").doc(auth.currentUser.uid).update({
                statusText: statusString,
                statusTimestamp: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                statusModal.style.display = 'none';
                statusTextInput.value = '';
            }).catch(err => console.error("Error broadcast transmission on user status string:", err));
        });
    }

    function appendStatusToTray(initials, text) {
        if (!statusTray) return;
        const statusBlock = document.createElement('div');
        statusBlock.className = 'status-item active-status';
        statusBlock.title = text;
        statusBlock.innerHTML = `
            <div class="status-circle ring-gold" style="background:#004d40; color:#d4af37;">${escapeHTML(initials)}</div>
            <span>${escapeHTML(text)}</span>
        `;
        statusTray.appendChild(statusBlock);
    }

    /**
     * CENTRAL SYNCHRONIZATION PIPELINE:
     * Pulls the user registry collections directly from Firestore to auto-generate 
     * a running sidebar list of registered system operators and real-time status bars.
     */
    if (db && auth && statusTray) {
        auth.onAuthStateChanged((currentUser) => {
            if (currentUser) {
                db.collection("users").onSnapshot((snapshot) => {
                    // Reset views to baseline states before redrawing user directories
                    statusTray.innerHTML = `
                        <div class="status-item create-status" id="addStatusBtn">
                            <div class="status-circle plus-icon">+</div>
                            <span>My Status</span>
                        </div>
                    `;
                    
                    // Rebind modal trigger events to newly generated buttons
                    document.getElementById('addStatusBtn').addEventListener('click', () => statusModal.style.display = 'flex');

                    if (chatList) {
                        chatList.innerHTML = '';
                    }

                    snapshot.forEach((doc) => {
                        const userProfile = doc.data();
                        const userInitials = userProfile.username ? userProfile.username.substring(0, 2).toUpperCase() : "OP";

                        // 1. Render item entry into status updates track if it contains customized status parameters
                        if (userProfile.statusText && userProfile.uid !== currentUser.uid) {
                            appendStatusToTray(userInitials, userProfile.statusText);
                        }

                        // 2. Render user directory object inside sidebar contact dashboard components
                        if (chatList && userProfile.uid !== currentUser.uid) {
                            const rosterItem = document.createElement('div');
                            rosterItem.className = 'chat-item';
                            rosterItem.innerHTML = `
                                <div class="avatar">${userInitials}</div>
                                <div class="chat-info">
                                    <div class="chat-name-row">
                                        <h4>${escapeHTML(userProfile.username || userProfile.email)}</h4>
                                        <span class="time">Online</span>
                                    </div>
                                    <p class="preview-text">${escapeHTML(userProfile.statusText || "No custom status set.")}</p>
                                </div>
                            `;
                            chatList.appendChild(rosterItem);
                        }
                    });
                });
            }
        });
    }

    // Defensive Cross-Site Scripting Injection Escaper
    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }
});
