// Background service worker for Clarity extension

class ClarityBackground {
  constructor() {
    this.domainVisits = new Map();
    this.tabSessions = new Map();
    this.init();
  }

  init() {
    this.setupTabListeners();
    this.setupHistoryListeners();
    this.setupAlarms();
  }

  setupTabListeners() {
    // Track tab updates for loop detection
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        this.trackDomainVisit(tab.url, tabId);
        this.checkTabOverload();
      }
    });

    // Track tab activation for session timing
    chrome.tabs.onActivated.addListener((activeInfo) => {
      this.startTabSession(activeInfo.tabId);
    });

    // Handle tab closure for emotion check-ins
    chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
      this.endTabSession(tabId);
    });
  }

  setupHistoryListeners() {
    chrome.history.onVisited.addListener((historyItem) => {
      this.trackHistoryVisit(historyItem);
    });
  }

  setupAlarms() {
    // Clean up old visit data every hour
    chrome.alarms.create('cleanup', { periodInMinutes: 60 });
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'cleanup') {
        this.cleanupOldData();
      }
    });
  }

  trackDomainVisit(url, tabId) {
    try {
      const domain = new URL(url).hostname;
      const now = Date.now();
      
      if (!this.domainVisits.has(domain)) {
        this.domainVisits.set(domain, []);
      }
      
      const visits = this.domainVisits.get(domain);
      visits.push({ timestamp: now, tabId });
      
      // Keep only last 20 visits
      if (visits.length > 20) {
        visits.shift();
      }
      
      this.checkLoopingBehavior(domain, tabId);
    } catch (error) {
      console.error('Error tracking domain visit:', error);
    }
  }

  checkLoopingBehavior(domain, tabId) {
    const visits = this.domainVisits.get(domain);
    const now = Date.now();
    const recentVisits = visits.filter(visit => 
      now - visit.timestamp < 15 * 60 * 1000 // 15 minutes
    );

    if (recentVisits.length >= 5) {
      // Trigger loop detection overlay
      chrome.tabs.sendMessage(tabId, {
        type: 'SHOW_LOOP_DETECTION',
        data: {
          domain,
          visitCount: recentVisits.length,
          timeSpan: '15 minutes'
        }
      });
    }
  }

  startTabSession(tabId) {
    chrome.tabs.get(tabId, (tab) => {
      if (tab && tab.url) {
        this.tabSessions.set(tabId, {
          startTime: Date.now(),
          url: tab.url,
          domain: new URL(tab.url).hostname
        });
      }
    });
  }

  endTabSession(tabId) {
    const session = this.tabSessions.get(tabId);
    if (session) {
      const duration = Date.now() - session.startTime;
      const twentyMinutes = 20 * 60 * 1000;
      
      if (duration > twentyMinutes) {
        // Store for emotion check-in
        chrome.storage.local.set({
          lastLongSession: {
            domain: session.domain,
            duration: duration,
            timestamp: Date.now()
          }
        });
      }
      
      this.tabSessions.delete(tabId);
    }
  }

  checkTabOverload() {
    chrome.tabs.query({}, (tabs) => {
      if (tabs.length > 15) {
        // Trigger tab overload notification
        chrome.tabs.query({active: true, currentWindow: true}, (activeTabs) => {
          if (activeTabs[0]) {
            chrome.tabs.sendMessage(activeTabs[0].id, {
              type: 'SHOW_TAB_OVERLOAD',
              data: {
                tabCount: tabs.length,
                tabs: tabs.map(tab => ({
                  title: tab.title,
                  url: tab.url,
                  favIconUrl: tab.favIconUrl
                }))
              }
            });
          }
        });
      }
    });
  }

  cleanupOldData() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const [domain, visits] of this.domainVisits.entries()) {
      const recentVisits = visits.filter(visit => 
        visit.timestamp > oneHourAgo
      );
      
      if (recentVisits.length === 0) {
        this.domainVisits.delete(domain);
      } else {
        this.domainVisits.set(domain, recentVisits);
      }
    }
  }
}

// Initialize background service
new ClarityBackground();