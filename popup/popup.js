// Popup script for Clarity extension

class ClarityPopup {
  constructor() {
    this.init();
  }

  init() {
    this.loadStats();
    this.loadSettings();
    this.setupEventListeners();
  }

  loadStats() {
    chrome.storage.local.get([
      'loopDetectionLog',
      'scrollSessionLog',
      'moodLog'
    ], (result) => {
      const today = new Date().toDateString();

      // Loop detections today
      const loopCount = (result.loopDetectionLog || [])
        .filter(item => new Date(item.timestamp).toDateString() === today)
        .length;

      // Scroll sessions today
      const scrollCount = (result.scrollSessionLog || [])
        .filter(item => new Date(item.timestamp).toDateString() === today)
        .length;

      // Average mood today
      const todayMoods = (result.moodLog || [])
        .filter(item => new Date(item.timestamp).toDateString() === today)
        .map(item => item.rating);

      const avgMood = todayMoods.length > 0
        ? (todayMoods.reduce((a, b) => a + b, 0) / todayMoods.length).toFixed(1)
        : '-';

      // Update UI
      document.getElementById('loopCount').textContent = loopCount;
      document.getElementById('scrollSessions').textContent = scrollCount;
      document.getElementById('avgMood').textContent = avgMood;
    });
  }

  loadSettings() {
    chrome.storage.sync.get([
      'loopDetection',
      'doomscrollPrevention',
      'speedBumps',
      'emotionCheckins'
    ], (result) => {
      document.getElementById('loopDetection').checked = result.loopDetection !== false;
      document.getElementById('doomscrollPrevention').checked = result.doomscrollPrevention !== false;
      document.getElementById('speedBumps').checked = result.speedBumps !== false;
      document.getElementById('emotionCheckins').checked = result.emotionCheckins !== false;
    });
  }

  setupEventListeners() {
    // Settings checkboxes
    document.getElementById('loopDetection').addEventListener('change', (e) => {
      chrome.storage.sync.set({ loopDetection: e.target.checked });
    });

    document.getElementById('doomscrollPrevention').addEventListener('change', (e) => {
      chrome.storage.sync.set({ doomscrollPrevention: e.target.checked });
    });

    document.getElementById('speedBumps').addEventListener('change', (e) => {
      chrome.storage.sync.set({ speedBumps: e.target.checked });
    });

    document.getElementById('emotionCheckins').addEventListener('change', (e) => {
      chrome.storage.sync.set({ emotionCheckins: e.target.checked });
    });

    // Action buttons
    document.getElementById('viewInsights').addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('insights.html') });
      window.close();
    });

    document.getElementById('takeBreak').addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.update(tabs[0].id, { url: 'about:blank' });
        window.close();
      });
    });
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ClarityPopup();
});
