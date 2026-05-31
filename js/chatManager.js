/**
 * ChatManager - Handles in-game chat functionality with Firebase Realtime Database
 * Features: Real-time sync across devices, 24h auto-delete, spam rate limiting, 
 * protected usernames, admin accounts with mute/unmute commands
 */
export class ChatManager {
  constructor() {
    this._username = localStorage.getItem('hcs_username') || '';
    this._isAdmin = localStorage.getItem('hcs_is_admin') === 'true';
    this._messages = [];
    this._isOpen = false;
    this._unreadCount = 0;
    this._lastReadTimestamp = Date.now();
    this._maxMessages = 50;
    
    // Firebase references
    this._db = window.firebaseDB;
    this._messagesRef = this._db ? this._db.ref('chat/messages') : null;
    this._usersRef = this._db ? this._db.ref('chat/users') : null;
    this._mutedRef = this._db ? this._db.ref('chat/muted') : null;
    
    // Message expiration (24 hours in milliseconds)
    this._messageExpiration = 24 * 60 * 60 * 1000;
    
    // Rate limiting settings
    this._rateLimitWindow = 10000; // 10 seconds
    this._maxMessagesPerWindow = 5; // Max 5 messages per 10 seconds
    this._userMessageTimestamps = []; // Track recent message timestamps
    this._rateLimitCooldown = 0; // Cooldown timestamp when rate limited
    this._rateLimitDuration = 30000; // 30 second cooldown when rate limited
    
    // Protected admin accounts (name -> password)
    this._adminAccounts = {
      'Sevxn': 'sevxnBB@nt0$7',
      'Ashu': 'ashuADM!N#2024'
    };
    
    // Create chat UI elements
    this._createChatUI();
    
    // Set up Firebase listeners
    this._setupFirebaseListeners();
    
    // Register this user as active
    if (this._username) {
      this._registerUser(this._username);
    }
    
    // Clean expired messages periodically (every 60 seconds)
    setInterval(() => {
      this._cleanExpiredMessages();
    }, 60000);
    
    // Keep user registration alive
    setInterval(() => {
      if (this._username) {
        this._registerUser(this._username);
      }
    }, 30000); // Refresh every 30 seconds
    
    // Update rate limit timer display
    setInterval(() => this._updateRateLimitDisplay(), 1000);
  }
  
  get isOpen() { return this._isOpen; }
  get unreadCount() { return this._unreadCount; }
  get hasUsername() { return this._username.length > 0; }
  
  /**
   * Set up Firebase real-time listeners
   */
  _setupFirebaseListeners() {
    if (!this._db) {
      console.error('Firebase database not initialized! Check if Firebase scripts loaded correctly.');
      return;
    }
    
    if (!this._messagesRef) {
      console.error('Messages reference not created!');
      return;
    }
    
    console.log('Setting up Firebase listeners...');
    
    // Listen for new messages (last 50)
    this._messagesRef
      .orderByChild('timestamp')
      .limitToLast(this._maxMessages)
      .on('value', (snapshot) => {
        console.log('Received messages from Firebase:', snapshot.val());
        this._messages = [];
        snapshot.forEach((child) => {
          const msg = child.val();
          msg.id = child.key;
          // Only include non-expired messages
          if (Date.now() - msg.timestamp < this._messageExpiration) {
            this._messages.push(msg);
          }
        });
        console.log('Processed messages:', this._messages.length);
        this._renderMessages();
        if (!this._isOpen) {
          this._updateUnreadCount();
        }
      }, (error) => {
        console.error('Firebase read error:', error);
      });
  }
  
  _createChatUI() {
    // Chat panel container
    this._panel = document.createElement('div');
    this._panel.id = 'chat-panel';
    this._panel.className = 'chat-panel hidden';
    this._panel.innerHTML = `
      <div class="chat-header">
        <span>Chat</span>
        <div class="chat-header-buttons">
          <button class="chat-clear-btn" id="chat-clear-btn" title="Clear Chat (Admin)">🗑️</button>
          <button class="chat-logout-btn" id="chat-logout-btn" title="Logout">🚪</button>
          <button class="chat-close-btn">&times;</button>
        </div>
      </div>
      <div class="chat-username-section" id="chat-username-section">
        <input type="text" id="chat-username-input" placeholder="Enter username..." maxlength="15">
        <button id="chat-username-btn">Join</button>
      </div>
      <div class="chat-messages" id="chat-messages"></div>
      <div class="chat-input-section hidden" id="chat-input-section">
        <input type="text" id="chat-message-input" placeholder="Type a message..." maxlength="200">
        <button id="chat-send-btn">Send</button>
      </div>
      <div class="chat-rate-limit hidden" id="chat-rate-limit">
        <span>⚠️ Slow down! Wait <span id="rate-limit-timer">30</span>s</span>
      </div>
    `;
    document.body.appendChild(this._panel);
    
    // Get references to elements
    this._messagesContainer = document.getElementById('chat-messages');
    this._usernameSection = document.getElementById('chat-username-section');
    this._inputSection = document.getElementById('chat-input-section');
    this._usernameInput = document.getElementById('chat-username-input');
    this._messageInput = document.getElementById('chat-message-input');
    this._closeBtn = this._panel.querySelector('.chat-close-btn');
    this._logoutBtn = document.getElementById('chat-logout-btn');
    this._clearBtn = document.getElementById('chat-clear-btn');
    this._usernameBtn = document.getElementById('chat-username-btn');
    this._sendBtn = document.getElementById('chat-send-btn');
    this._rateLimitDiv = document.getElementById('chat-rate-limit');
    this._rateLimitTimer = document.getElementById('rate-limit-timer');
    
    // Set up event listeners
    this._closeBtn.addEventListener('click', () => this.close());
    this._logoutBtn.addEventListener('click', () => this._logout());
    this._clearBtn.addEventListener('click', () => this._clearChat());
    this._usernameBtn.addEventListener('click', () => this._setUsername());
    this._sendBtn.addEventListener('click', () => this._sendMessage());
    
    this._usernameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this._setUsername();
    });
    
    this._messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this._sendMessage();
    });
    
    // Prevent game input when typing
    this._messageInput.addEventListener('keydown', (e) => e.stopPropagation());
    this._usernameInput.addEventListener('keydown', (e) => e.stopPropagation());
    
    // If username already exists, show chat input
    if (this._username) {
      this._usernameSection.classList.add('hidden');
      this._inputSection.classList.remove('hidden');
    }
  }
  
  async _setUsername() {
    const inputValue = this._usernameInput.value.trim();
    if (inputValue.length < 2) {
      alert('Username must be at least 2 characters');
      return;
    }
    
    // Check if this is an admin password
    for (const [adminName, adminPassword] of Object.entries(this._adminAccounts)) {
      if (inputValue === adminPassword) {
        // Set as admin with protected name
        this._username = adminName;
        this._isAdmin = true;
        localStorage.setItem('hcs_username', adminName);
        localStorage.setItem('hcs_is_admin', 'true');
        
        await this._registerUser(adminName);
        
        this._usernameSection.classList.add('hidden');
        this._inputSection.classList.remove('hidden');
        this._messageInput.focus();
        
        // Send special join message
        await this._addMessage({
          type: 'system',
          text: `👑 ${adminName} has entered the chat`,
          timestamp: Date.now()
        });
        return;
      }
    }
    
    // Check if trying to use a protected admin name (case-insensitive)
    if (this._isProtectedName(inputValue)) {
      alert('This username is reserved. Please choose a different name.');
      return;
    }
    
    // Check if username is already taken by another active user
    const isTaken = await this._isUsernameTaken(inputValue);
    if (isTaken) {
      alert('This username is already taken. Please choose a different name.');
      return;
    }
    
    this._username = inputValue;
    this._isAdmin = false;
    localStorage.setItem('hcs_username', inputValue);
    localStorage.setItem('hcs_is_admin', 'false');
    
    await this._registerUser(inputValue);
    
    this._usernameSection.classList.add('hidden');
    this._inputSection.classList.remove('hidden');
    this._messageInput.focus();
    
    // Send join message
    await this._addMessage({
      type: 'system',
      text: `${inputValue} joined the chat`,
      timestamp: Date.now()
    });
  }
  
  /**
   * Logout the current user
   */
  async _logout() {
    if (!this._username) return;
    
    const oldUsername = this._username;
    
    // Clear user data
    this._username = '';
    this._isAdmin = false;
    localStorage.removeItem('hcs_username');
    localStorage.removeItem('hcs_is_admin');
    
    // Remove from active users in Firebase
    if (this._usersRef) {
      try {
        await this._usersRef.child(oldUsername.toLowerCase()).remove();
      } catch (e) {
        console.error('Failed to remove user:', e);
      }
    }
    
    // Show username section, hide input section
    this._usernameSection.classList.remove('hidden');
    this._inputSection.classList.add('hidden');
    this._usernameInput.value = '';
    this._usernameInput.focus();
    
    // Send leave message
    await this._addMessage({
      type: 'system',
      text: `${oldUsername} left the chat`,
      timestamp: Date.now()
    });
  }
  
  /**
   * Clear all chat messages (admin only)
   */
  async _clearChat() {
    if (!this._isAdmin) {
      alert('Only admins can clear the chat.');
      return;
    }
    
    if (!confirm('Are you sure you want to clear all chat messages?')) {
      return;
    }
    
    // Clear messages in Firebase
    if (this._messagesRef) {
      try {
        await this._messagesRef.remove();
      } catch (e) {
        console.error('Failed to clear chat:', e);
      }
    }
    
    // Add system message
    await this._addMessage({
      type: 'system',
      text: `Chat cleared by ${this._username}`,
      timestamp: Date.now()
    });
  }
  
  /**
   * Register a user as active (for duplicate prevention)
   */
  async _registerUser(username) {
    if (!this._usersRef) return;
    
    try {
      await this._usersRef.child(username.toLowerCase()).set({
        name: username,
        lastSeen: Date.now()
      });
    } catch (e) {
      console.error('Failed to register user:', e);
    }
  }
  
  /**
   * Check if a username is already taken by another active user
   */
  async _isUsernameTaken(name) {
    if (!this._usersRef) return false;
    
    try {
      const snapshot = await this._usersRef.child(name.toLowerCase()).once('value');
      if (snapshot.exists()) {
        const user = snapshot.val();
        const isActive = Date.now() - user.lastSeen < 5 * 60 * 1000; // 5 minutes
        return isActive;
      }
      return false;
    } catch (e) {
      console.error('Failed to check username:', e);
      return false;
    }
  }
  
  /**
   * Check if a username is protected (admin names or variations)
   */
  _isProtectedName(name) {
    const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Check against all admin names
    for (const adminName of Object.keys(this._adminAccounts)) {
      const adminNormalized = adminName.toLowerCase();
      
      // Check exact match (case-insensitive)
      if (normalized === adminNormalized) return true;
      
      // Check if contains admin name as substring
      if (normalized.includes(adminNormalized)) return true;
    }
    
    // Check common variations for Sevxn
    const sevxnVariations = [
      'sevxn', 'sevxnn', 'sevxxn', 'seevxn', 'sevvxn',
      's3vxn', 'sev xn', 'sevx n', 's e v x n',
      'sevxn_', '_sevxn', 'sevxn1', '1sevxn',
      'thesevxn', 'realsevxn', 'officialsevxn',
      '53vxn', 's3vxn', '5evxn', 's€vxn'
    ];
    if (sevxnVariations.includes(normalized)) return true;
    
    // Check common variations for Ashu
    const ashuVariations = [
      'ashu', 'ashuu', 'aashu', 'ashhu',
      '4shu', 'a5hu', 'ashu_', '_ashu',
      'theashu', 'realashu', 'officialashu'
    ];
    if (ashuVariations.includes(normalized)) return true;
    
    return false;
  }
  
  /**
   * Check if user is currently rate limited
   */
  _isRateLimited() {
    const now = Date.now();
    
    // Check if in cooldown period
    if (this._rateLimitCooldown > now) {
      return true;
    }
    
    // Clean old timestamps outside the window
    this._userMessageTimestamps = this._userMessageTimestamps.filter(
      ts => now - ts < this._rateLimitWindow
    );
    
    // Check if too many messages in window
    if (this._userMessageTimestamps.length >= this._maxMessagesPerWindow) {
      // Trigger cooldown
      this._rateLimitCooldown = now + this._rateLimitDuration;
      return true;
    }
    
    return false;
  }
  
  /**
   * Update the rate limit display
   */
  _updateRateLimitDisplay() {
    const now = Date.now();
    const remaining = Math.ceil((this._rateLimitCooldown - now) / 1000);
    
    if (remaining > 0) {
      this._rateLimitDiv.classList.remove('hidden');
      this._inputSection.classList.add('hidden');
      this._rateLimitTimer.textContent = remaining;
    } else {
      this._rateLimitDiv.classList.add('hidden');
      if (this._username) {
        this._inputSection.classList.remove('hidden');
      }
    }
  }
  
  async _sendMessage() {
    const text = this._messageInput.value.trim();
    if (!text || !this._username) return;
    
    // Check for admin commands
    if (text.startsWith('/')) {
      await this._handleCommand(text);
      this._messageInput.value = '';
      return;
    }
    
    // Check if user is muted
    const isMuted = await this._isUserMuted(this._username);
    if (isMuted) {
      alert('You are muted and cannot send messages.');
      return;
    }
    
    // Check rate limit
    if (this._isRateLimited()) {
      return;
    }
    
    // Track this message timestamp for rate limiting
    this._userMessageTimestamps.push(Date.now());
    
    await this._addMessage({
      type: 'user',
      username: this._username,
      text: text,
      timestamp: Date.now()
    });
    
    this._messageInput.value = '';
  }
  
  /**
   * Handle admin commands like /mute and /unmute
   */
  async _handleCommand(text) {
    const parts = text.split(' ');
    const command = parts[0].toLowerCase();
    const targetUser = parts.slice(1).join(' ').trim();
    
    switch (command) {
      case '/mute':
        await this._muteUser(targetUser);
        break;
      case '/unmute':
        await this._unmuteUser(targetUser);
        break;
      case '/mutelist':
        await this._showMutedUsers();
        break;
      default:
        // Unknown command - show help
        await this._addMessage({
          type: 'system',
          text: 'Unknown command. Available commands: /mute <username>, /unmute <username>, /mutelist',
          timestamp: Date.now()
        });
    }
  }
  
  /**
   * Mute a user (admin only)
   */
  async _muteUser(username) {
    if (!this._isAdmin) {
      await this._addMessage({
        type: 'system',
        text: '⚠️ Only admins can mute users.',
        timestamp: Date.now()
      });
      return;
    }
    
    if (!username) {
      await this._addMessage({
        type: 'system',
        text: '⚠️ Usage: /mute <username>',
        timestamp: Date.now()
      });
      return;
    }
    
    // Can't mute admins
    if (this._isAdminUsername(username)) {
      await this._addMessage({
        type: 'system',
        text: '⚠️ Cannot mute admin users.',
        timestamp: Date.now()
      });
      return;
    }
    
    // Add to muted list in Firebase
    if (this._mutedRef) {
      try {
        await this._mutedRef.child(username.toLowerCase()).set({
          name: username,
          mutedBy: this._username,
          mutedAt: Date.now()
        });
        
        await this._addMessage({
          type: 'system',
          text: `🔇 ${username} has been muted by ${this._username}`,
          timestamp: Date.now()
        });
      } catch (e) {
        console.error('Failed to mute user:', e);
      }
    }
  }
  
  /**
   * Unmute a user (admin only)
   */
  async _unmuteUser(username) {
    if (!this._isAdmin) {
      await this._addMessage({
        type: 'system',
        text: '⚠️ Only admins can unmute users.',
        timestamp: Date.now()
      });
      return;
    }
    
    if (!username) {
      await this._addMessage({
        type: 'system',
        text: '⚠️ Usage: /unmute <username>',
        timestamp: Date.now()
      });
      return;
    }
    
    // Remove from muted list in Firebase
    if (this._mutedRef) {
      try {
        const snapshot = await this._mutedRef.child(username.toLowerCase()).once('value');
        if (!snapshot.exists()) {
          await this._addMessage({
            type: 'system',
            text: `⚠️ ${username} is not muted.`,
            timestamp: Date.now()
          });
          return;
        }
        
        await this._mutedRef.child(username.toLowerCase()).remove();
        
        await this._addMessage({
          type: 'system',
          text: `🔊 ${username} has been unmuted by ${this._username}`,
          timestamp: Date.now()
        });
      } catch (e) {
        console.error('Failed to unmute user:', e);
      }
    }
  }
  
  /**
   * Show list of muted users (admin only)
   */
  async _showMutedUsers() {
    if (!this._isAdmin) {
      await this._addMessage({
        type: 'system',
        text: '⚠️ Only admins can view muted users.',
        timestamp: Date.now()
      });
      return;
    }
    
    if (this._mutedRef) {
      try {
        const snapshot = await this._mutedRef.once('value');
        const mutedUsers = snapshot.val();
        
        if (!mutedUsers || Object.keys(mutedUsers).length === 0) {
          await this._addMessage({
            type: 'system',
            text: '📋 No users are currently muted.',
            timestamp: Date.now()
          });
          return;
        }
        
        const names = Object.values(mutedUsers).map(u => u.name).join(', ');
        await this._addMessage({
          type: 'system',
          text: `📋 Muted users: ${names}`,
          timestamp: Date.now()
        });
      } catch (e) {
        console.error('Failed to get muted users:', e);
      }
    }
  }
  
  /**
   * Check if a user is muted
   */
  async _isUserMuted(username) {
    if (!this._mutedRef) return false;
    
    try {
      const snapshot = await this._mutedRef.child(username.toLowerCase()).once('value');
      return snapshot.exists();
    } catch (e) {
      console.error('Failed to check mute status:', e);
      return false;
    }
  }
  
  /**
   * Add a message to Firebase
   */
  async _addMessage(message) {
    if (!this._messagesRef) {
      console.error('Cannot send message - Firebase not initialized');
      // Fallback to local rendering if Firebase not available
      this._messages.push(message);
      this._renderMessages();
      return;
    }
    
    try {
      console.log('Sending message to Firebase:', message);
      const result = await this._messagesRef.push(message);
      console.log('Message sent successfully, key:', result.key);
    } catch (e) {
      console.error('Failed to send message:', e);
      alert('Failed to send message. Check console for details.');
    }
  }
  
  /**
   * Remove messages older than 24 hours from Firebase
   */
  async _cleanExpiredMessages() {
    if (!this._messagesRef) return;
    
    const cutoff = Date.now() - this._messageExpiration;
    
    try {
      const snapshot = await this._messagesRef
        .orderByChild('timestamp')
        .endAt(cutoff)
        .once('value');
      
      const updates = {};
      snapshot.forEach((child) => {
        updates[child.key] = null; // Mark for deletion
      });
      
      if (Object.keys(updates).length > 0) {
        await this._messagesRef.update(updates);
      }
    } catch (e) {
      console.error('Failed to clean expired messages:', e);
    }
  }
  
  _renderMessages() {
    if (!this._messagesContainer) return;
    
    if (this._messages.length === 0) {
      this._messagesContainer.innerHTML = `
        <div class="chat-empty">
          <span>No messages yet. Say hi! 👋</span>
          <span class="chat-empty-note">Messages auto-delete after 24h</span>
        </div>
      `;
      return;
    }
    
    this._messagesContainer.innerHTML = this._messages.map(msg => {
      if (msg.type === 'system') {
        return `<div class="chat-message system">${this._escapeHtml(msg.text)}</div>`;
      }
      const isOwn = msg.username === this._username;
      // Check if this message is from any admin (case-insensitive check)
      const isAdmin = this._isAdminUsername(msg.username);
      const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      // Calculate time remaining before expiration
      const age = Date.now() - msg.timestamp;
      const hoursRemaining = Math.max(0, Math.floor((this._messageExpiration - age) / (60 * 60 * 1000)));
      const expiresText = hoursRemaining <= 1 ? 'expires soon' : `${hoursRemaining}h left`;
      
      // Special styling for admin
      const messageClass = isAdmin ? 'admin' : (isOwn ? 'own' : '');
      const usernameStyle = isAdmin ? 'style="color: #ff4444; font-weight: bold;"' : '';
      const adminBadge = isAdmin ? '👑 ' : '';
      // Display proper admin name if it's an admin
      const displayName = isAdmin ? this._getProperAdminName(msg.username) : msg.username;
      
      return `
        <div class="chat-message ${messageClass}">
          <span class="chat-username" ${usernameStyle}>${adminBadge}${this._escapeHtml(displayName)}</span>
          <span class="chat-text">${this._escapeHtml(msg.text)}</span>
          <span class="chat-time">${time} · ${expiresText}</span>
        </div>
      `;
    }).join('');
    
    // Scroll to bottom
    this._messagesContainer.scrollTop = this._messagesContainer.scrollHeight;
  }
  
  /**
   * Check if a username belongs to an admin
   */
  _isAdminUsername(username) {
    const normalizedUsername = username.toLowerCase();
    for (const adminName of Object.keys(this._adminAccounts)) {
      if (normalizedUsername === adminName.toLowerCase()) {
        return true;
      }
    }
    return false;
  }
  
  /**
   * Get the properly capitalized admin name
   */
  _getProperAdminName(username) {
    const normalizedUsername = username.toLowerCase();
    for (const adminName of Object.keys(this._adminAccounts)) {
      if (normalizedUsername === adminName.toLowerCase()) {
        return adminName;
      }
    }
    return username;
  }
  
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  _updateUnreadCount() {
    const newMessages = this._messages.filter(m => m.timestamp > this._lastReadTimestamp);
    this._unreadCount = newMessages.length;
  }
  
  open() {
    this._isOpen = true;
    this._panel.classList.remove('hidden');
    this._unreadCount = 0;
    this._lastReadTimestamp = Date.now();
    
    if (this._username) {
      this._messageInput.focus();
    } else {
      this._usernameInput.focus();
    }
  }
  
  close() {
    this._isOpen = false;
    this._panel.classList.add('hidden');
  }
  
  toggle() {
    if (this._isOpen) {
      this.close();
    } else {
      this.open();
    }
  }
}
