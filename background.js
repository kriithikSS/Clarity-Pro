// === Clarity Extension: Merged Background Script ===
// Combines logic from original background.js and backgroundA.js

// === ScrollWatcher Script Injection ===
chrome.runtime.onInstalled.addListener(() => {
  injectAllTabs();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    injectScript(tabId);
  }
});

async function injectAllTabs() {
  try {
    const tabs = await chrome.tabs.query({ url: "<all_urls>" });
    for (const tab of tabs) {
      injectScript(tab.id);
    }
  } catch (error) {
    console.warn("Failed to query tabs:", error);
  }
}

function injectScript(tabId) {
  // Check if extension context is valid before injecting
  if (!chrome.runtime?.id) {
    console.warn("Extension context invalidated, skipping injection");
    return;
  }

  chrome.scripting.executeScript({
    target: { tabId },
    files: ["content/scrollWatcher.js"]
  }).catch(err => {
    console.warn("Failed to inject scrollWatcher into tab:", tabId, err.message);
  });
}

// === Tab Overload Detection ===
const MAX_TAB_COUNT = 10;
const MAX_SWITCHES_PER_MINUTE = 15;
let switchCount = 0;
let lastSwitchTimestamp = Date.now();
let popupOpen = false;

chrome.tabs.onCreated.addListener(() => {
  chrome.tabs.query({}, tabs => {
    if (tabs.length > MAX_TAB_COUNT && !popupOpen) {
      popupOpen = true;
      showTabOverloadPopup(tabs);
    }
  });
});

chrome.tabs.onActivated.addListener(() => {
  const now = Date.now();
  if (now - lastSwitchTimestamp < 60000) {
    switchCount++;
  } else {
    switchCount = 1;
  }
  lastSwitchTimestamp = now;

  if (switchCount > MAX_SWITCHES_PER_MINUTE && !popupOpen) {
    chrome.tabs.query({}, showTabOverloadPopup);
  }
});

function showTabOverloadPopup(tabs) {
  chrome.storage.local.set({ overloadTabs: tabs });
  chrome.windows.create({
    url: chrome.runtime.getURL("pages/tab_overload.html"),
    type: "popup",
    width: 400,
    height: 600
  }, () => {
    popupOpen = true;
    setTimeout(() => { popupOpen = false; }, 60000);
  });
}

// === Timer + Focus Mode State ===
let activeTimer = null;
let timerEndTime = null;
let timerIntervalId = null;

let focusModeActive = false;
let lastSocialTabId = null;
let focusStartTime = null;
let socialSites = [];
let socialSwitchCount = 0;
const defaultSocialSites = ["facebook.com", "instagram.com", "youtube.com", "twitter.com", "tiktok.com", "reddit.com"];

// State update control
let stateUpdateInProgress = false;

// Throttle control
let focusUpdateTimeout = null;

// Initialize on startup
chrome.runtime.onStartup.addListener(async () => {
  await initializeExtension();
});

chrome.runtime.onInstalled.addListener(async () => {
  await initializeExtension();
});

async function initializeExtension() {
  try {
    // Initialize timer state
    const timerData = await chromeStorageGet(["activeTimer", "timerEndTime"]);
    if (timerData.activeTimer && timerData.timerEndTime > Date.now()) {
      startBackgroundTimer(Math.floor((timerData.timerEndTime - Date.now()) / 1000), timerData.activeTimer);
    } else {
      stopBackgroundTimer();
    }

    // Initialize focus mode state
    const focusData = await chromeStorageGet(["focusModeActive", "socialSites", "focusStartTime"]);
    
    focusModeActive = Boolean(focusData.focusModeActive);
    socialSites = (focusData.socialSites && focusData.socialSites.length) ? focusData.socialSites : [...defaultSocialSites];
    focusStartTime = focusData.focusStartTime || null;

    // Set defaults if not already set
    if (focusData.focusModeActive === undefined) {
      await chromeStorageSet({ focusModeActive: false });
    }
    if (!focusData.socialSites || focusData.socialSites.length === 0) {
      await chromeStorageSet({ socialSites: defaultSocialSites });
    }

    console.log("Extension initialized - Focus Mode:", focusModeActive, "Social Sites:", socialSites.length);

  } catch (error) {
    console.error("Failed to initialize extension:", error);
  }
}

function startBackgroundTimer(duration, name) {
  clearInterval(timerIntervalId);
  activeTimer = name;
  timerEndTime = Date.now() + duration * 1000;

  chrome.storage.local.set({ activeTimer, timerEndTime }, sendTimerUpdateToPopup);

  timerIntervalId = setInterval(() => {
    const remaining = Math.max(0, Math.floor((timerEndTime - Date.now()) / 1000));
    if (remaining <= 0) {
      clearInterval(timerIntervalId);
      handleTimerCompletion();
    } else {
      sendTimerUpdateToPopup();
    }
  }, 1000);
}

function stopBackgroundTimer() {
  clearInterval(timerIntervalId);
  activeTimer = null;
  timerEndTime = null;
  chrome.storage.local.remove(["activeTimer", "timerEndTime"], sendTimerUpdateToPopup);
}

function handleTimerCompletion() {
  const name = activeTimer;
  stopBackgroundTimer();
  saveReflection();

  // Send completion message to popup
  sendMessageToPopup({ action: "timerCompletedUI", timerName: name });
  
  // Trigger disruption on the active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].url && !tabs[0].url.startsWith('chrome://')) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        files: ["content/content.js"] // Ensure content.js is injected
      }, () => {
        if (chrome.runtime.lastError) {
          console.error("Background: Error injecting content script for disruption:", chrome.runtime.lastError.message);
          return;
        }
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "disrupt",
          urgency: "low", // You can customize urgency, siteContext, behaviorData, pageAnalysis
          siteContext: "timer_ended",
          behaviorData: {},
          pageAnalysis: {}
        }).catch(error => {
          if (error.message.includes("Receiving end does not exist")) {
            console.log("Background: Content script not ready or tab closed, cannot send disrupt message.");
          } else {
            console.error("Background: Error sending disrupt message to content script:", error);
          }
        });
      });
    } else {
      console.log("Background: Cannot disrupt Chrome internal page or no active tab.");
      // Fallback to notification if disruption is not possible
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon48.png",
        title: "Timer Complete!",
        message: `Your ${name} timer has finished. Time for a mindful pause.`
      }, (notificationId) => {
        setTimeout(() => chrome.notifications.clear(notificationId), 5000);
      });
    }
  });
}

function saveReflection() {
  chrome.storage.local.get(["reflections"], res => {
    const reflections = res.reflections || [];
    reflections.push({ timestamp: Date.now() });
    chrome.storage.local.set({ reflections });
  });
}

function sendTimerUpdateToPopup() {
  const remainingSeconds = timerEndTime ? Math.max(0, Math.floor((timerEndTime - Date.now()) / 1000)) : 0;
  sendMessageToPopup({ action: "updateTimerDisplay", activeTimer, remainingSeconds });
}

function sendFocusTimerUpdateToPopup() {
  const minutes = focusModeActive && focusStartTime ? Math.floor((Date.now() - focusStartTime) / 60000) : 0;
  sendMessageToPopup({ action: "updateFocusTimerDisplay", focusModeActive, minutesFocused: minutes });
}

// Safe message sending to popup
function sendMessageToPopup(message) {
  try {
    if (chrome.runtime?.id) {
      chrome.runtime.sendMessage(message).catch(err => {
        console.debug("Could not send message to popup:", err.message);
      });
    }
  } catch (error) {
    console.debug("Extension context invalidated, cannot send message");
  }
}

// === Focus Mode: Social Site Detection ===
function isSocialSite(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return socialSites.some(site => hostname === site || hostname.endsWith("." + site));
  } catch {
    return false;
  }
}

function notifyFocusReminder(url) {
  if (!focusModeActive) return;
  
  const minutes = Math.floor((Date.now() - (focusStartTime || 0)) / 60000);
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon48.png",
    title: "Focus Reminder",
    message: `You're on ${new URL(url).hostname}. Stay focused! (${minutes} min)`
  }, id => setTimeout(() => chrome.notifications.clear(id), 3000));
}

// Focus mode social site monitoring - only active when focus mode is ON
chrome.tabs.onActivated.addListener(({ tabId }) => {
  if (!focusModeActive) return;
  
  chrome.tabs.get(tabId, tab => {
    if (tab && tab.url && isSocialSite(tab.url) && tabId !== lastSocialTabId) {
      lastSocialTabId = tabId;
      socialSwitchCount++;
      notifyFocusReminder(tab.url);
    }
  });
});

chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (!focusModeActive || info.status !== "complete") return;
  
  if (tab && tab.url && isSocialSite(tab.url) && tabId !== lastSocialTabId) {
    lastSocialTabId = tabId;
    socialSwitchCount++;
    notifyFocusReminder(tab.url);
  }
});

// === Helper Functions for Storage Operations ===
function chromeStorageGet(keys) {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(result);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

function chromeStorageSet(data) {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.set(data, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

function chromeStorageRemove(keys) {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.remove(keys, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

// Throttle focus timer updates to prevent UI lag
function throttledSendFocusUpdate() {
  if (focusUpdateTimeout) {
    clearTimeout(focusUpdateTimeout);
  }

  focusUpdateTimeout = setTimeout(() => {
    sendFocusTimerUpdateToPopup();
  }, 100);
}

// === State Update Handler ===
async function handleStateUpdate(request, sendResponse) {
  // Prevent concurrent state updates
  if (stateUpdateInProgress) {
    console.log("Background: State update already in progress, queuing...");
    // Wait for current operation to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    if (stateUpdateInProgress) {
      sendResponse({ status: "error", message: "State update in progress" });
      return;
    }
  }

  stateUpdateInProgress = true;

  try {
    const newFocusMode = Boolean(request.focusModeActive);
    console.log(`Background: Processing state update to ${newFocusMode}`);

    const previousState = focusModeActive;
    focusModeActive = newFocusMode;

    if (newFocusMode && !previousState) {
      focusStartTime = Date.now();
      socialSwitchCount = 0;
      lastSocialTabId = null;

      await chromeStorageSet({
        focusStartTime,
        focusModeActive: true
      });

      console.log("Background: Focus Mode activated");
      
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon48.png",
        title: "Focus Mode Activated",
        message: "Social media reminders are now active. Stay focused!"
      }, id => setTimeout(() => chrome.notifications.clear(id), 2000));
    } else if (!newFocusMode && previousState) {
      const totalMinutes = focusStartTime ? Math.floor((Date.now() - focusStartTime) / 60000) : 0;

      chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon48.png",
        title: "Focus Mode Ended",
        message: `Great job! You focused for ${totalMinutes} minute${totalMinutes !== 1 ? 's' : ''}.\nSocial site switches: ${socialSwitchCount}.`
      }, id => setTimeout(() => chrome.notifications.clear(id), 3000));

      focusStartTime = null;
      lastSocialTabId = null;
      socialSwitchCount = 0;

      await chromeStorageSet({ focusModeActive: false });
      await chromeStorageRemove("focusStartTime");

      console.log("Background: Focus Mode deactivated");
    }

    throttledSendFocusUpdate();

    sendResponse({ status: "state_updated", focusModeActive: newFocusMode });
  } catch (error) {
    console.error("Background: Error updating state:", error);
    sendResponse({ status: "error", message: error.message });
  } finally {
    stateUpdateInProgress = false;
  }
}

// === Main Message Listener ===
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  try {
    if (req.action === "startTimer") {
      startBackgroundTimer(req.duration, req.timerName);
      sendResponse({ status: "started" });
      
    } else if (req.action === "stopTimer") {
      stopBackgroundTimer();
      sendResponse({ status: "stopped" });
      
    } else if (req.action === "requestTimerState") {
      const remainingSeconds = timerEndTime ? Math.max(0, Math.floor((timerEndTime - Date.now()) / 1000)) : 0;
      sendResponse({ activeTimer, remainingSeconds });
      
    } else if (req.action === "manualDisrupt") {
      // This part is for manual disruption, not timer completion
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].url && !tabs[0].url.startsWith('chrome://')) {
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ["content.js"]
          }, () => {
            if (chrome.runtime.lastError) {
              console.error("Background: Error injecting content script for manual disrupt:", chrome.runtime.lastError.message);
              sendResponse({ status: "error", message: "Failed to inject content script." });
              return;
            }
            chrome.tabs.sendMessage(tabs[0].id, {
              action: "disrupt",
              urgency: "low",
              siteContext: "manual_trigger",
              behaviorData: {},
              pageAnalysis: {}
            }, (response) => {
              if (chrome.runtime.lastError) {
                console.error("Background: Error sending disrupt message to content script:", chrome.runtime.lastError.message);
                sendResponse({ status: "error", message: "Failed to trigger disruption on current tab." });
              } else if (response && response.status === "disruption_started") {
                console.log("Background: Disruption message sent to content script.");
                sendResponse({ status: "disruption_triggered" });
              } else {
                console.warn("Background: Disruption not started by content script:", response);
                sendResponse({ status: "error", message: response ? response.message : "Disruption not triggered." });
              }
            });
          });
        } else {
          sendResponse({ status: "error", message: "Cannot disrupt Chrome internal pages or no active tab." });
        }
      });
      return true; // Indicate that sendResponse will be called asynchronously
      
    } else if (req.action === "updateState") {
      handleStateUpdate(req, sendResponse);
      return true;
      
    } else if (req.action === "updateSocialSites") {
      if (Array.isArray(req.socialSites)) {
        socialSites = [...req.socialSites];
        chrome.storage.local.set({ socialSites });
        console.log("Background: Updated social sites:", socialSites);
      }
      sendResponse({ status: "sites_updated" });
      
    } else if (req.action === "requestFocusState") {
      sendResponse({ 
        focusModeActive, 
        focusStartTime, 
        socialSites: [...socialSites]
      });
      
      
    } else {
      sendResponse({ status: "unknown_action" });
    }
  } catch (error) {
    console.error("Background: Error handling message:", error);
    sendResponse({ status: "error", message: error.message });
  }
  
  return false;
});