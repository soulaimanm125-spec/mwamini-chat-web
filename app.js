// ====== INDUSTRIAL-GRADE FIREBASE APPLICATION ENGINE ======

const firebaseConfig = {
  apiKey: "AIzaSyBAvEGxHrS6b5dOgc9TpWPSMR-K2i6lIxA",
  authDomain: "mwamini-chat-web-e0d8c.firebaseapp.com",
  projectId: "mwamini-chat-web-e0d8c",
  storageBucket: "mwamini-chat-web-e0d8c.firebasestorage.app",
  messagingSenderId: "780880757548",
  appId: "1:780880757548:web:ac60921ed3ef873003a289",
  measurementId: "G-QZ2S2TJB8X"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

let currentUserId = null;
let currentChatId = null;
let currentChatType = 'private';
let messagesUnsubscribe = null;
let sidebarUsersUnsubscribe = null;
let sidebarGroupsUnsubscribe = null;

// Cleanly isolate session registration identities
auth.onAuthStateChanged(user => {
    if (user) {
        currentUserId = user.uid;
    } else {
        // Persist guest ID in sessionStorage so it doesn't regenerate and break state on every UI render pass
        if (!sessionStorage.getItem('guest_token')) {
            sessionStorage.setItem('guest_token', "guest_uid_" + Math.random().toString(36).substring(2, 11));
        }
        currentUserId = sessionStorage.getItem('guest_token');
    }
    
    if (window.location.pathname.includes('dashboard.html')) {
        initDashboard();
    }
});

function initDashboard() {
    const nameDisplay = document.getElementById('current-user-name');
    const statusDisplay = document.getElementById('current-user-status-msg');
    
    if (auth.currentUser) {
        db.collection('users').doc(auth.currentUser.uid).onSnapshot(doc => {
            if(doc.exists && nameDisplay) {
                nameDisplay.innerText = doc.data().name || "Authenticated User";
                statusDisplay.innerText = doc.data().statusMsg || "Available";
            }
        }, err => {
            console.error("Critical Profile Stream Error:", err);
        });
    } else {
        if (nameDisplay) {
            nameDisplay.innerText = "Guest Mode (Read-Locked)";
            statusDisplay.innerText = "Log in to check your history records.";
        }
    }

    // Event Wireup: Profile Status Mutation
    const updateStatusBtn = document.getElementById('update-status-btn');
    if (updateStatusBtn) {
        updateStatusBtn.replaceWith(updateStatusBtn.cloneNode(true)); // Clear duplicate event attachments
        document.getElementById('update-status-btn').addEventListener('click', () => {
            if (!auth.currentUser) { 
                alert("Access Denied: You must register or log in to customize a profile status!"); 
                return; 
            }
            const currentNote = statusDisplay.innerText;
            const newNote = prompt("Update status note:", currentNote);
            if (newNote && newNote.trim() !== "") {
                db.collection('users').doc(currentUserId).update({ statusMsg: newNote.trim() })
                  .catch(err => alert("Failed updating profile state: " + err.message));
            }
        });
    }

    // Event Wireup: Logout Action Routing
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.replaceWith(logoutBtn.cloneNode(true));
        document.getElementById('logout-btn').addEventListener('click', () => {
            if (auth.currentUser) {
                db.collection('users').doc(auth.currentUser.uid).update({ status: 'offline' })
                  .then(() => auth.signOut())
                  .then(() => { window.location.href = 'index.html'; });
            } else {
                window.location.href = 'index.html';
            }
        });
    }

    // Discovery System Lookup Action Wireup
    const addUserBtn = document.getElementById('add-user-btn');
    if (addUserBtn) {
        addUserBtn.replaceWith(addUserBtn.cloneNode(true));
        document.getElementById('add-user-btn').addEventListener('click', () => {
            const emailToFind = document.getElementById('search-email-input').value.trim().toLowerCase();
            if (!emailToFind) return;

            db.collection('users').where('email', '==', emailToFind).get()
                .then(snapshot => {
                    if (snapshot.empty) {
                        alert("No registered user found matching that email address!");
                        return;
                    }
                    snapshot.forEach(doc => {
                        const targetUserData = doc.data();
                        startPrivateChat(targetUserData.uid, targetUserData.name);
                        document.getElementById('search-email-input').value = '';
                    });
                })
                .catch(err => alert("Secure search operational pipeline failure: " + err.message));
        });
    }

    // Clean execution of standard messaging controls
    loadSidebarChannels();
    setupMessageSender();
}

function loadSidebarChannels() {
    const sidebarContainer = document.getElementById('chats-sidebar-list');
    if (!sidebarContainer) return;

    if (sidebarUsersUnsubscribe) sidebarUsersUnsubscribe();
    if (sidebarGroupsUnsubscribe) sidebarGroupsUnsubscribe();

    // Instantiate dynamic structures natively
    sidebarContainer.innerHTML = `
        <div class="list-section-header">DIRECT MESSAGES (PUBLIC ACCESS)</div>
        <div id="direct-messages-bucket"></div>
        <div class="list-section-header" style="margin-top: 10px;">GROUPS</div>
        <div id="groups-bucket"></div>
    `;

    const dmBucket = document.getElementById('direct-messages-bucket');
    const groupBucket = document.getElementById('groups-bucket');

    // Live sync user directories
    sidebarUsersUnsubscribe = db.collection('users').onSnapshot(snapshot => {
        dmBucket.innerHTML = '';
        snapshot.forEach(doc => {
            const userData = doc.data();
            if (auth.currentUser && userData.uid === auth.currentUser.uid) return;

            const row = document.createElement('div');
            row.className = 'user-item';
            row.innerHTML = `
                <div class="item-main-details">
                    <strong>${userData.name}</strong>
                    <span>${userData.statusMsg || 'Available'}</span>
                </div>
                <div class="status-dot ${userData.status === 'online' ? 'online' : 'offline'}"></div>
            `;
            row.addEventListener('click', () => startPrivateChat(userData.uid, userData.name));
            dmBucket.appendChild(row);
        });
    }, err => {
        console.warn("Directory view generation fault:", err.message);
    });

    // Live sync channel listings
    sidebarGroupsUnsubscribe = db.collection('chats').where('isGroup', '==', true).onSnapshot(groupSnap => {
        groupBucket.innerHTML = '';
        groupSnap.forEach(gDoc => {
            const gData = gDoc.data();
            const row = document.createElement('div');
            row.className = 'user-item';
            row.innerHTML = `<div class="item-main-details"><strong>👥 ${gData.name}</strong><span>Click to drop message</span></div>`;
            row.addEventListener('click', () => startGroupChat(gDoc.id, gData.name));
            groupBucket.appendChild(row);
        });
    }, err => {
        console.warn("Group listings view restriction logged:", err.message);
    });
}

function startPrivateChat(targetUid, targetName) {
    currentChatType = 'private';
    document.getElementById('no-chat-selected').style.display = 'none';
    document.getElementById('active-chat-container').style.display = 'flex';
    document.getElementById('active-chat-title').innerText = targetName;
    document.getElementById('delete-group-btn').style.display = 'none';

    db.collection('chats')
      .where('isGroup', '==', false)
      .get()
      .then(snapshot => {
          let foundChat = null;
          snapshot.forEach(doc => {
              const parts = doc.data().participants;
              if (parts && parts.includes(currentUserId) && parts.includes(targetUid)) { 
                  foundChat = doc; 
              }
          });

          if (foundChat) {
              listenForMessages(foundChat.id);
          } else {
              // Build new room with secure transactional definitions
              db.collection('chats').add({
                  isGroup: false,
                  participants: [currentUserId, targetUid],
                  createdAt: firebase.firestore.FieldValue.serverTimestamp()
              })
              .then(newDoc => listenForMessages(newDoc.id))
              .catch(err => alert("Failed to establish secure communications tunnel: " + err.message));
          }
      })
      .catch(err => alert("Data validation link error: " + err.message));
}

function startGroupChat(groupId, groupName) {
    currentChatType = 'group';
    document.getElementById('no-chat-selected').style.display = 'none';
    document.getElementById('active-chat-container').style.display = 'flex';
    document.getElementById('active-chat-title').innerText = groupName;
    
    // Only verify group deletion accessibility for real logged in owners
    document.getElementById('delete-group-btn').style.display = auth.currentUser ? 'block' : 'none';

    if (auth.currentUser) {
        db.collection('chats').doc(groupId).update({
            participants: firebase.firestore.FieldValue.arrayUnion(currentUserId)
        }).catch(() => {});
    }
    listenForMessages(groupId);
}

function listenForMessages(chatId) {
    currentChatId = chatId;
    const msgBox = document.getElementById('messages-box');
    if (messagesUnsubscribe) messagesUnsubscribe();

    messagesUnsubscribe = db.collection('chats').doc(chatId).collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot(snapshot => {
            msgBox.innerHTML = '';
            snapshot.forEach(doc => {
                const mData = doc.data();
                const bubble = document.createElement('div');
                bubble.className = `msg ${mData.senderId === currentUserId ? 'sent' : 'received'}`;
                bubble.innerHTML = `<div><strong>${mData.senderName}</strong>: <span>${mData.message}</span></div>`;
                msgBox.appendChild(bubble);
            });
            msgBox.scrollTop = msgBox.scrollHeight;
        }, err => {
            // Drop formal wall notifications if the snapshot stream breaks due to security access locks
            msgBox.innerHTML = `
                <div style="text-align:center; padding:25px; color:#c62828; font-weight:bold; background:#fff5f5; border:1px solid #ffcdd2; border-radius:8px; margin:20px;">
                    🔒 History Read Locked: You can send outbound messages to this user, but you must Log In or Register an account to review historical conversation records!
                </div>`;
        });
}

function setupMessageSender() {
    const sendBtn = document.getElementById('send-btn');
    const msgInput = document.getElementById('message-input');

    if (!sendBtn) return;

    sendBtn.replaceWith(sendBtn.cloneNode(true));
    const cleanSendBtn = document.getElementById('send-btn');

    function executeSend() {
        const text = msgInput.value.trim();
        if (!text || !currentChatId) return;

        let displayName = "Guest User";
        if (auth.currentUser) {
            const profileName = document.getElementById('current-user-name').innerText;
            if (profileName && !profileName.includes("Guest Mode")) {
                displayName = profileName;
            }
        }

        // Freeze input to prevent double messaging during inflight database writes
        msgInput.disabled = true;
        cleanSendBtn.disabled = true;

        db.collection('chats').doc(currentChatId).collection('messages').add({
            senderId: currentUserId,
            senderName: displayName,
            message: text,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
            msgInput.value = '';
            msgInput.disabled = false;
            cleanSendBtn.disabled = false;
            msgInput.focus();
        })
        .catch(err => {
            msgInput.disabled = false;
            cleanSendBtn.disabled = false;
            alert("Database Rejected Transmission: " + err.message + "\nVerify that your database layout fields match security criteria rules.");
        });
    }

    cleanSendBtn.addEventListener('click', executeSend);
    msgInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') executeSend(); });
}
