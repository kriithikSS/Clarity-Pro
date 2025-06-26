// Content script for Clarity extension

class ClarityContent {
  constructor() {
    this.isScrollTracking = false;
    this.scrollStartTime = null;
    this.totalScrollDistance = 0;
    this.lastScrollY = 0;
    this.overlayContainer = null;
    
    this.init();
  }

  init() {
    this.setupMessageListener();
    this.checkIfTimeSinkSite();
    this.setupScrollTracking();
    this.checkForEmotionCheckin();
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case 'SHOW_LOOP_DETECTION':
          this.showLoopDetectionOverlay(message.data);
          break;
        case 'SHOW_TAB_OVERLOAD':
          this.showTabOverloadOverlay(message.data);
          break;
      }
    });
  }

  checkIfTimeSinkSite() {
    const currentDomain = window.location.hostname;
    const timeSinkSites = [
      'youtube.com', 'reddit.com', 'twitter.com', 'x.com',
      'instagram.com', 'facebook.com', 'tiktok.com', 'linkedin.com'
    ];
    
    if (timeSinkSites.some(site => currentDomain.includes(site))) {
      this.showSpeedBump();
    }
  }

  setupScrollTracking() {
    let scrollTimeout;
    
    window.addEventListener('scroll', () => {
      if (!this.isScrollTracking) {
        this.startScrollTracking();
      }
      
      this.updateScrollDistance();
      
      // Reset timeout
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.checkScrollSession();
      }, 2000); // 2 seconds of no scrolling
    });
  }

  startScrollTracking() {
    this.isScrollTracking = true;
    this.scrollStartTime = Date.now();
    this.lastScrollY = window.scrollY;
    this.totalScrollDistance = 0;
  }

  updateScrollDistance() {
    const currentScrollY = window.scrollY;
    this.totalScrollDistance += Math.abs(currentScrollY - this.lastScrollY);
    this.lastScrollY = currentScrollY;
  }

  checkScrollSession() {
    if (!this.isScrollTracking) return;
    
    const scrollDuration = Date.now() - this.scrollStartTime;
    const tenMinutes = 10 * 60 * 1000;
    
    if (scrollDuration > tenMinutes && this.totalScrollDistance > 5000) {
      this.showDoomscrollOverlay();
      this.isScrollTracking = false;
    }
  }

  showSpeedBump() {
    if (sessionStorage.getItem('clarity-speed-bump-shown')) return;
    
    const overlay = this.createOverlay('speed-bump');
    overlay.innerHTML = `
      <div class="clarity-speed-bump">
        <div class="clarity-content">
          <h2>✋ Slow down</h2>
          <p>You're about to enter a time-sink site.</p>
          <p>"The present moment is the only time over which we have dominion." - Thich Nhat Hanh</p>
          <div class="clarity-timer">
            <p>Would you like to set a timer?</p>
            <div class="timer-buttons">
              <button onclick="clarityActions.setTimer(10)">10 min</button>
              <button onclick="clarityActions.setTimer(20)">20 min</button>
              <button onclick="clarityActions.setTimer(30)">30 min</button>
            </div>
          </div>
          <button class="clarity-continue" onclick="this.closeOverlay()">Continue without timer</button>
        </div>
      </div>
    `;
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.remove();
      }
    }, 3000);
    
    sessionStorage.setItem('clarity-speed-bump-shown', 'true');
  }

  showLoopDetectionOverlay(data) {
    const overlay = this.createOverlay('loop-detection');
    overlay.innerHTML = `
      <div class="clarity-loop-detection">
        <div class="clarity-content">
          <h2>🔄 Loop detected</h2>
          <p>You've visited <strong>${data.domain}</strong> ${data.visitCount} times in ${data.timeSpan}.</p>
          <p>Is this still what you intended to do?</p>
          <div class="clarity-actions">
            <button onclick="clarityActions.takeBreak()">Take a 5-minute break</button>
            <button onclick="this.closeTab()">Close this tab</button>
            <button onclick="this.continueAnyway()">Continue anyway</button>
          </div>
        </div>
      </div>
    `;
  }

  showDoomscrollOverlay() {
    const overlay = this.createOverlay('doomscroll');
    overlay.innerHTML = `
      <div class="clarity-doomscroll">
        <div class="clarity-fade-overlay"></div>
        <div class="clarity-content">
          <div class="breathing-animation">
            <div class="breath-circle"></div>
          </div>
          <h2>📱 Time to breathe</h2>
          <p>You've been scrolling for over 10 minutes.</p>
          <p><strong>How do you feel right now?</strong></p>
          <div class="emotion-buttons">
            <button onclick="this.logEmotion('energized')">⚡ Energized</button>
            <button onclick="this.logEmotion('overwhelmed')">😵 Overwhelmed</button>
            <button onclick="this.logEmotion('bored')">😑 Bored</button>
            <button onclick="this.logEmotion('anxious')">😰 Anxious</button>
          </div>
          <button class="clarity-continue" onclick="this.closeOverlay()">Continue browsing</button>
        </div>
      </div>
    `;
  }

  showTabOverloadOverlay(data) {
    const overlay = this.createOverlay('tab-overload');
    const tabsByDomain = this.categorizeTabs(data.tabs);
    
    overlay.innerHTML = `
      <div class="clarity-tab-overload">
        <div class="clarity-content">
          <h2>📑 Tab overload detected</h2>
          <p>You have <strong>${data.tabCount} tabs</strong> open. Here's what you have:</p>
          <div class="tab-categories">
            ${Object.entries(tabsByDomain).map(([category, tabs]) => `
              <div class="tab-category">
                <h3>${category} (${tabs.length})</h3>
                <ul>
                  ${tabs.slice(0, 3).map(tab => `
                    <li>${tab.title.substring(0, 50)}...</li>
                  `).join('')}
                  ${tabs.length > 3 ? `<li>...and ${tabs.length - 3} more</li>` : ''}
                </ul>
              </div>
            `).join('')}
          </div>
          <div class="clarity-actions">
            <button onclick="this.closeUnusedTabs()">Close unused tabs</button>
            <button onclick="this.bookmarkAll()">Bookmark all & start fresh</button>
            <button onclick="this.continueAnyway()">Continue with all tabs</button>
          </div>
        </div>
      </div>
    `;
  }

  checkForEmotionCheckin() {
    chrome.storage.local.get(['lastLongSession'], (result) => {
      if (result.lastLongSession) {
        const session = result.lastLongSession;
        const now = Date.now();
        const fiveMinutesAgo = 5 * 60 * 1000;
        
        if (now - session.timestamp < fiveMinutesAgo) {
          this.showEmotionCheckin(session);
          // Clear the session so it doesn't show again
          chrome.storage.local.remove(['lastLongSession']);
        }
      }
    });
  }

  showEmotionCheckin(session) {
    const overlay = this.createOverlay('emotion-checkin');
    const duration = Math.round(session.duration / (60 * 1000));
    
    overlay.innerHTML = `
      <div class="clarity-emotion-checkin">
        <div class="clarity-content">
          <h2>💭 How are you feeling?</h2>
          <p>You spent ${duration} minutes on ${session.domain}.</p>
          <div class="emotion-scale">
            <p>Rate your current mood:</p>
            <div class="mood-buttons">
              <button onclick="this.recordMood(1, '😫')">😫</button>
              <button onclick="this.recordMood(2, '😔')">😔</button>
              <button onclick="this.recordMood(3, '😐')">😐</button>
              <button onclick="this.recordMood(4, '🙂')">🙂</button>
              <button onclick="this.recordMood(5, '😊')">😊</button>
            </div>
          </div>
          <div class="next-actions">
            <p>What would you like to do next?</p>
            <div class="action-buttons">
              <button onclick="this.suggestBreak()">Take a break</button>
              <button onclick="this.closeCurrentTab()">Close this tab</button>
              <button onclick="this.continueAnyway()">Keep browsing</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  createOverlay(type) {
    // Remove existing overlay if present
    const existing = document.querySelector('.clarity-overlay');
    if (existing) {
      existing.remove();
    }
    
    const overlay = document.createElement('div');
    overlay.className = `clarity-overlay clarity-${type}`;
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    document.body.appendChild(overlay);
    this.addOverlayEventHandlers(overlay);
    
    return overlay;
  }

  addOverlayEventHandlers(overlay) {
    // Close overlay when clicking outside content
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });
    
    // Add escape key handler
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        overlay.remove();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
  }

  categorizeTabs(tabs) {
    const categories = {
      'Social Media': [],
      'Work/Productivity': [],
      'News': [],
      'Entertainment': [],
      'Shopping': [],
      'Other': []
    };
    
    tabs.forEach(tab => {
      const domain = new URL(tab.url).hostname;
      
      if (domain.includes('facebook') || domain.includes('twitter') || 
          domain.includes('instagram') || domain.includes('linkedin')) {
        categories['Social Media'].push(tab);
      } else if (domain.includes('gmail') || domain.includes('drive') || 
                 domain.includes('docs') || domain.includes('slack')) {
        categories['Work/Productivity'].push(tab);
      } else if (domain.includes('news') || domain.includes('bbc') || 
                 domain.includes('cnn') || domain.includes('reddit')) {
        categories['News'].push(tab);
      } else if (domain.includes('youtube') || domain.includes('netflix') || 
                 domain.includes('twitch')) {
        categories['Entertainment'].push(tab);
      } else if (domain.includes('amazon') || domain.includes('ebay') || 
                 domain.includes('shop')) {
        categories['Shopping'].push(tab);
      } else {
        categories['Other'].push(tab);
      }
    });
    
    // Remove empty categories
    Object.keys(categories).forEach(key => {
      if (categories[key].length === 0) {
        delete categories[key];
      }
    });
    
    return categories;
  }
}

// Global functions for overlay interactions
window.clarityActions = {
  closeOverlay() {
    const overlay = document.querySelector('.clarity-overlay');
    if (overlay) overlay.remove();
  },
  
  setTimer(minutes) {
    // Store timer in session storage
    const endTime = Date.now() + (minutes * 60 * 1000);
    sessionStorage.setItem('clarity-timer-end', endTime);
    this.closeOverlay();
    
    // Show timer notification
    this.showTimerNotification(minutes);
  },
  
  showTimerNotification(minutes) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 10px 15px;
      border-radius: 5px;
      z-index: 10001;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    notification.textContent = `Timer set for ${minutes} minutes`;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 3000);
  },
  
  takeBreak() {
    // Redirect to a break page or close tab
    window.location.href = 'about:blank';
  },
  
  closeTab() {
    window.close();
  },
  
  continueAnyway() {
    this.closeOverlay();
  },
  
  logEmotion(emotion) {
    // Store emotion data
    chrome.storage.local.get(['emotionLog'], (result) => {
      const log = result.emotionLog || [];
      log.push({
        emotion,
        timestamp: Date.now(),
        domain: window.location.hostname
      });
      
      // Keep only last 50 entries
      if (log.length > 50) {
        log.shift();
      }
      
      chrome.storage.local.set({ emotionLog: log });
    });
    
    this.closeOverlay();
  },
  
  recordMood(rating, emoji) {
    // Store mood data
    chrome.storage.local.get(['moodLog'], (result) => {
      const log = result.moodLog || [];
      log.push({
        rating,
        emoji,
        timestamp: Date.now(),
        domain: window.location.hostname
      });
      
      chrome.storage.local.set({ moodLog: log });
    });
    
    // Show thank you message
    const overlay = document.querySelector('.clarity-overlay .clarity-content');
    if (overlay) {
      overlay.innerHTML = `
        <h2>Thanks for sharing! ${emoji}</h2>
        <p>Your input helps Clarity learn your patterns.</p>
        <button onclick="clarityActions.closeOverlay()">Continue</button>
      `;
    }
  },
  
  closeUnusedTabs() {
    chrome.runtime.sendMessage({ type: 'CLOSE_UNUSED_TABS' });
    this.closeOverlay();
  },
  
  bookmarkAll() {
    chrome.runtime.sendMessage({ type: 'BOOKMARK_ALL_TABS' });
    this.closeOverlay();
  }
};

// Make actions globally available
Object.assign(window, window.clarityActions);

// Initialize content script
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new ClarityContent();
  });
} else {
  new ClarityContent();
}