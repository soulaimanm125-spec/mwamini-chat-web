// ====== FIREBASE CONFIGURATION ======
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
let storage;
try { storage = firebase.storage(); } catch(e) { console.warn("Storage isolated"); }

let currentUserId = null;
let currentChatId = null;
let currentChatType = 'private'; 
let isRegisterMode = false;

// Real-time window state listener synchronization tracking
auth.onAuthStateChanged(user => {
    if (user) {
        currentUserId = user.uid;
    } else {
        // Fallback placeholder token mapping if not logged into database collection
        currentUserId = "anonymous_guest_" + Math.random().toString(36).substring(7);
    }
    if (window.location.pathname.includes('dashboard.html')) {
        initDashboard();
    }
});

// Auth form validation handling
const authForm = document.getElementById('auth-form');
if (authForm) {
    const toggleLink = document.getElementById('toggle-link');
    const usernameGroup = document.getElementById('username-group');
    const authBtn = document.getElementById('auth-btn');
    const authTitle = document.getElementById('auth-title');

    toggleLink.addEventListener('click', () => {
        isRegisterMode = !isRegisterMode;
        usernameGroup.style.display = isRegisterMode ? 'block' : 'none';
        authBtn.innerText = isRegisterMode ? 'Register' : 'Log In';
        toggleLink.innerText = isRegisterMode ? 'Already have an account? Login here' : "Don't have an account? Register here";
    });

    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('auth-email').value.trim();
        const password = document.getElementById('auth-password').value;

        if (isRegisterMode) {
            const name = document.getElementById('auth-username').value.trim();
            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    return db.collection('users').doc(userCredential.user.uid).set({
                        uid: userCredential.user.uid,
                        name: name,
                        email: email.toLowerCase(),
                        status: 'online',
                        statusMsg: "Hey there! I am using Mwamini Chat."
                    });
                })
                .then(() => { window.location.href = 'dashboard.html'; })
                .catch(err => alert(err.message));
        } else {
            auth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    return db.collection('users').doc(userCredential.user.uid).update({ status: 'online' });
                })
                .then(() => { window.location.href = 'dashboard.html'; })
                .catch(err => alert(err.message));
        }
    });
}

function initDashboard() {
    const nameDisplay = document.getElementById('current-user-name');
    const statusDisplay = document.getElementById('current-user-status-msg');
    
    if (auth.currentUser) {
        db.collection('users').doc(auth.currentUser.uid).onSnapshot(doc => {
            if(doc.exists && nameDisplay) {
                nameDisplay.innerText = doc.data().name;
                statusDisplay.innerText = doc.data().statusMsg || "Hey there!";
            }
        });
    } else {
        if (nameDisplay) {
            nameDisplay.innerText = "Guest Mode (Read-Locked)";
            statusDisplay.innerText = "Log in to check your history records.";
        }
    }

    // UPDATE BIO
    document.getElementById('update-status-btn').addEventListener('click', () => {
        if (!auth.currentUser) { alert("Access Denied: You must register or log in to customize a profile status!"); return; }
        const currentNote = statusDisplay.innerText;
        const newNote = prompt("Update status note:", currentNote);
        if (newNote && newNote.trim() !== "") {
            db.collection('users').doc(currentUserId).update({ statusMsg: newNote.trim() });
        }
    });

    // LOGOUT
    document.getElementById('logout-btn').addEventListener('click', () => {
        if (auth.currentUser) {
            db.collection('users').doc(auth.currentUser.uid).update({ status: 'offline' }).then(() => auth.signOut().then(()=> window.location.href='index.html'));
        } else {
            window.location.href = 'index.html';
        }
    });

    // DISCOVERY MODE: Anyone can search emails now
    const addUserBtn = document.getElementById('add-user-btn');
    if (addUserBtn) {
        addUserBtn.addEventListener('click', () => {
            const emailToFind = document.getElementById('search-email-input').value.trim().toLowerCase();
            if (!emailToFind) return;

            db.collection('users').where('email', '==', emailToFind).get().then(snapshot => {
                if (snapshot.empty) {
                    alert("No registered user found with that email address!");
                    return;
                }
                snapshot.forEach(doc => {
                    const targetUserData = doc.data();
                    startPrivateChat(targetUserData.uid, targetUserData.name);
                    document.getElementById('search-email-input').value = '';
                });
            }).catch(err => alert("Lookup error: " + err.message));
        });
    }

    // CREATE GROUP
    document.getElementById('create-group-btn').addEventListener('click', () => {
        if (!auth.currentUser) { alert("You must be logged in to construct channels!"); return; }
        const groupName = prompt("Enter new Group Name:");
        if (!groupName) return;
        db.collection('chats').add({
            name: groupName,
            isGroup: true,
            participants: [currentUserId],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    });

    // GROUP DELETION TOOL
    document.getElementById('delete-group-btn').addEventListener('click', () => {
        if (!currentChatId || currentChatType !== 'group') return;
        if (confirm("Permanently delete this group room and contents?")) {
            db.collection('chats').doc(currentChatId).collection('messages').get().then(snap => {
                let batch = db.batch();
                snap.forEach(doc => batch.delete(doc.ref));
                return batch.commit();
            }).then(() => {
                return db.collection('chats').doc(currentChatId).delete();
            }).then(() => {
                document.getElementById('active-chat-container').style.display = 'none';
                document.getElementById('no-chat-selected').style.display = 'flex';
                currentChatId = null;
            }).catch(err => alert("Deletion restricted: " + err.message));
        }
    });

    loadSidebarChannels();
    setupMessageSender();
}

function loadSidebarChannels() {
    const sidebarContainer = document.getElementById('chats-sidebar-list');
    if (!sidebarContainer) return;

    db.collection('users').onSnapshot(snapshot => {
        sidebarContainer.innerHTML = '';
        
        let userHeader = document.createElement('div');
        userHeader.className = 'list-section-header'; userHeader.innerText = "DIRECT MESSAGES (PUBLIC ACCESS)";
        sidebarContainer.appendChild(userHeader);

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
            sidebarContainer.appendChild(row);
        });

        let groupHeader = document.createElement('div');
        groupHeader.className = 'list-section-header'; groupHeader.style.marginTop = "10px"; groupHeader.innerText = "GROUPS";
        sidebarContainer.appendChild(groupHeader);

        db.collection('chats').where('isGroup', '==', true).onSnapshot(groupSnap => {
            const existingGroups = sidebarContainer.querySelectorAll('.group-item-row');
            existingGroups.forEach(el => el.remove());

            groupSnap.forEach(gDoc => {
                const gData = gDoc.data();
                const row = document.createElement('div');
                row.className = 'user-item group-item-row';
                row.innerHTML = `<div class="item-main-details"><strong>👥 ${gData.name}</strong><span>Click to enter chat pipeline</span></div>`;
                row.addEventListener('click', () => startGroupChat(gDoc.id, gData.name));
                sidebarContainer.appendChild(row);
            });
        });
    }, err => { console.log("Live stream locked out safely."); });
}

function startPrivateChat(targetUid, targetName) {
    currentChatType = 'private';
    document.getElementById('no-chat-selected').style.display = 'none';
    document.getElementById('active-chat-container').style.display = 'flex';
    document.getElementById('active-chat-title').innerText = targetName;
    document.getElementById('delete-group-btn').style.display = 'none';

    db.collection('chats').where('isGroup', '==', false).get().then(snapshot => {
        let foundChat = null;
        snapshot.forEach(doc => {
            const parts = doc.data().participants;
            if (parts.includes(currentUserId) && parts.includes(targetUid)) { foundChat = doc; }
        });

        if (foundChat) {
            listenForMessages(foundChat.id);
          } else {
              db.collection('chats').add({
                  isGroup: false,
                  participants: [currentUserId, targetUid],
                  createdAt: firebase.firestore.FieldValue.serverTimestamp()
              }).then(newDoc => listenForMessages(newDoc.id));
          }
      });
}

function startGroupChat(groupId, groupName) {
    currentChatType = 'group';
    document.getElementById('no-chat-selected').style.display = 'none';
    document.getElementById('active-chat-container').style.display = 'flex';
    document.getElementById('active-chat-title').innerText = groupName;
    document.getElementById('delete-group-btn').style.display = 'block';

    if(auth.currentUser) {
        db.collection('chats').doc(groupId).update({
            participants: firebase.firestore.FieldValue.arrayUnion(currentUserId)
        });
    }
    listenForMessages(groupId);
}

let messagesUnsubscribe = null;
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
            // Dynamic warning if guest tries to view message logs without authentication tokens
            msgBox.innerHTML = `<div style="text-align:center; padding:30px 10px; color:#c62828; font-weight:bold; background:rgba(255,255,255,0.9); border-radius:8px; margin:20px;">⚠️ Access Denied: You must Log In or Register an account to read the messages in this chat room!</div>`;
        });
}

function setupMessageSender() {
    const sendBtn = document.getElementById('send-btn');
    const msgInput = document.getElementById('message-input');
    const mediaInput = document.getElementById('media-input');

    if (!sendBtn) return;

    sendBtn.addEventListener('click', () => {
        const text = msgInput.value.trim();
        const file = mediaInput.files[0];
        if (!text && !file) return;

        const displayName = auth.currentUser ? document.getElementById('current-user-name').innerText : "Guest Visitor";

        if (file && storage) {
            const fileRef = storage.ref().child(`chats/${currentChatId}/${Date.now()}_${file.name}`);
            fileRef.put(file).then(snapshot => snapshot.ref.getDownloadURL()).then(downloadUrl => {
                db.collection('chats').doc(currentChatId).collection('messages').add({
                    senderId: currentUserId,
                    senderName: displayName,
                    message: text || "[Media File]",
                    mediaUrl: downloadUrl,
                    mediaType: file.type,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
                mediaInput.value = '';
            });
        } else {
            db.collection('chats').doc(currentChatId).collection('messages').add({
                senderId: currentUserId,
                senderName: displayName,
                message: text,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        msgInput.value = '';
    });
}

window.editMessage = function(chatId, msgId) {
    const oldText = document.getElementById(`text-${msgId}`).innerText;
    const newText = prompt("Edit message:", oldText);
    if (newText && newText.trim() !== oldText) {
        db.collection('chats').doc(chatId).collection('messages').doc(msgId).update({ message: newText + " (edited)" });
    }
}

window.deleteMessage = function(chatId, msgId) {
    if (confirm("Delete this message?")) {
        db.collection('chats').doc(chatId).collection('messages').doc(msgId).delete();
    }
}
