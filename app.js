// ====== FIREBASE CONFIGURATION ======
// Paste your actual Web App Config keys from the Firebase Console here:
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
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();
let storage;
try { storage = firebase.storage(); } catch(e) {}

// ====== STATE VARIABLES ======
let currentUserId = null;
let currentChatId = null;
let currentChatType = 'private'; // 'private' or 'group'
let isRegisterMode = false;

// ====== REQUEST NOTIFICATION PERMISSION ======
if (Notification.permission !== "granted" && Notification.permission !== "denied") {
    Notification.requestPermission();
}

// ====== AUTHENTICATION LOGIC (INDEX.HTML) ======
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
        authTitle.innerText = isRegisterMode ? 'Create your secure account' : 'Sign In to continue to WhatsApp-style chatting';
        toggleLink.innerText = isRegisterMode ? 'Already have an account? Login here' : "Don't have an account? Register here";
    });

    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;

        if (isRegisterMode) {
            const name = document.getElementById('auth-username').value;
            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    return db.collection('users').doc(userCredential.user.uid).set({
                        uid: userCredential.user.uid,
                        name: name,
                        email: email,
                        status: 'online'
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

// ====== DASHBOARD PROCESSES (DASHBOARD.HTML) ======
auth.onAuthStateChanged(user => {
    if (user) {
        currentUserId = user.uid;
        if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
            window.location.href = 'dashboard.html';
        } else if (window.location.pathname.includes('dashboard.html')) {
            initDashboard();
        }
    } else {
        if (window.location.pathname.includes('dashboard.html')) {
            window.location.href = 'index.html';
        }
    }
});

function initDashboard() {
    db.collection('users').doc(currentUserId).get().then(doc => {
        if(doc.exists) document.getElementById('current-user-name').innerText = doc.data().name;
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
        db.collection('users').doc(currentUserId).update({ status: 'offline' }).then(() => {
            auth.signOut();
        });
    });

    document.getElementById('create-group-btn').addEventListener('click', () => {
        const groupName = prompt("Enter new Group Name:");
        if (!groupName) return;
        db.collection('chats').add({
            name: groupName,
            isGroup: true,
            participants: [currentUserId],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => alert("Group Created!"));
    });

    loadSidebarChannels();
    setupMessageSender();
}

function loadSidebarChannels() {
    const sidebarContainer = document.getElementById('chats-sidebar-list');

    db.collection('users').onSnapshot(snapshot => {
        sidebarContainer.innerHTML = '';
        
        let userHeader = document.createElement('div');
        userHeader.style.padding = "5px 15px"; userHeader.style.fontWeight = "bold"; userHeader.innerText = "DIRECT MESSAGES";
        sidebarContainer.appendChild(userHeader);

        snapshot.forEach(doc => {
            const userData = doc.data();
            if (userData.uid === currentUserId) return;

            const row = document.createElement('div');
            row.className = 'user-item';
            row.innerHTML = `
                <div><strong>${userData.name}</strong></div>
                <div class="status-dot ${userData.status === 'online' ? 'online' : 'offline'}"></div>
            `;
            row.addEventListener('click', () => startPrivateChat(userData.uid, userData.name));
            sidebarContainer.appendChild(row);
        });

        let groupHeader = document.createElement('div');
        groupHeader.style.padding = "15px 15px 5px 15px"; groupHeader.style.fontWeight = "bold"; groupHeader.innerText = "GROUPS";
        sidebarContainer.appendChild(groupHeader);

        db.collection('chats').where('isGroup', '==', true).onSnapshot(groupSnap => {
            groupSnap.forEach(gDoc => {
                const gData = gDoc.data();
                const row = document.createElement('div');
                row.className = 'user-item';
                row.innerHTML = `<div><strong>👥 ${gData.name}</strong></div>`;
                row.addEventListener('click', () => startGroupChat(gDoc.id, gData.name));
                sidebarContainer.appendChild(row);
            });
        });
    });
}

function startPrivateChat(targetUid, targetName) {
    currentChatType = 'private';
    document.getElementById('no-chat-selected').style.display = 'none';
    document.getElementById('active-chat-container').style.display = 'flex';
    document.getElementById('active-chat-title').innerText = targetName;

    db.collection('chats')
      .where('isGroup', '==', false)
      .where('participants', 'array-contains', currentUserId)
      .get().then(snapshot => {
          let foundChat = null;
          snapshot.forEach(doc => {
              if (doc.data().participants.includes(targetUid)) { foundChat = doc; }
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

    db.collection('chats').doc(groupId).update({
        participants: firebase.firestore.FieldValue.arrayUnion(currentUserId)
    });

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
                const isMe = mData.senderId === currentUserId;
                
                const bubble = document.createElement('div');
                bubble.className = `msg ${isMe ? 'sent' : 'received'}`;
                
                let contentHTML = `<div><strong>${mData.senderName}</strong>: <span id="text-${doc.id}">${mData.message}</span></div>`;
                
                if (mData.mediaUrl) {
                    if (mData.mediaType.startsWith('image/')) {
                        contentHTML += `<img src="${mData.mediaUrl}" class="msg-media" />`;
                    } else if (mData.mediaType.startsWith('video/')) {
                        contentHTML += `<video src="${mData.mediaUrl}" controls class="msg-media"></video>`;
                    }
                }

                if (isMe) {
                    contentHTML += `
                        <div class="msg-actions">
                            <span onclick="editMessage('${chatId}','${doc.id}')">Edit</span>
                            <span onclick="deleteMessage('${chatId}','${doc.id}')">Delete</span>
                        </div>`;
                }

                bubble.innerHTML = contentHTML;
                msgBox.appendChild(bubble);
            });
            msgBox.scrollTop = msgBox.scrollHeight;
            
            if(!snapshot.metadata.hasPendingWrites && snapshot.docs.length > 0) {
               let lastMsg = snapshot.docs[snapshot.docs.length - 1].data();
               if(lastMsg.senderId !== currentUserId && Notification.permission === "granted") {
                   new Notification(`Mwamini Chat: ${lastMsg.senderName}`, { body: lastMsg.message });
               }
            }
        });
}

function setupMessageSender() {
    const sendBtn = document.getElementById('send-btn');
    const msgInput = document.getElementById('message-input');
    const mediaInput = document.getElementById('media-input');

    function sendTrigger() {
        const text = msgInput.value.trim();
        const file = mediaInput.files[0];

        if (!text && !file) return;

        db.collection('users').doc(currentUserId).get().then(userDoc => {
            const senderName = userDoc.data().name;

            if (file) {
                const fileRef = storage.ref().child(`chats/${currentChatId}/${Date.now()}_${file.name}`);
                fileRef.put(file).then(snapshot => snapshot.ref.getDownloadURL()).then(downloadUrl => {
                    db.collection('chats').doc(currentChatId).collection('messages').add({
                        senderId: currentUserId,
                        senderName: senderName,
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
                    senderName: senderName,
                    message: text,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            msgInput.value = '';
        });
    }

    sendBtn.addEventListener('click', sendTrigger);
    msgInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') sendTrigger(); });
}

window.editMessage = function(chatId, msgId) {
    const oldText = document.getElementById(`text-${msgId}`).innerText;
    const newText = prompt("Edit your message:", oldText);
    if (newText && newText.trim() !== oldText) {
        db.collection('chats').doc(chatId).collection('messages').doc(msgId).update({
            message: newText + " (edited)"
        });
    }
}

window.deleteMessage = function(chatId, msgId) {
    if (confirm("Are you sure you want to delete this message?")) {
        db.collection('chats').doc(chatId).collection('messages').doc(msgId).delete();
    }
}
