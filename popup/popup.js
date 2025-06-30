function formatTime(totalSeconds) {
  const hrs = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const mins = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const secs = String(totalSeconds % 60).padStart(2, '0');
  return `${hrs}:${mins}:${secs}`;
}

function updateTimerUI(activeTimer, remainingSeconds) {
  const timerSection = document.getElementById("timerSection");
  const timerLabel = document.getElementById("timerLabel");
  const timerDisplay = document.getElementById("timerDisplay");
  const stopBtn = document.getElementById("stopTimerBtn");

  if (activeTimer && remainingSeconds > 0) {
    timerSection.style.display = "block";
    stopBtn.style.display = "inline-block";
    timerLabel.textContent = `Active Timer: ${activeTimer}`;
    timerDisplay.textContent = formatTime(remainingSeconds);
  } else {
    timerSection.style.display = "none";
  }
}

// --- Focus Mode Variables ---
let focusTimerInterval = null;
const defaultSocialSites = ["facebook.com", "instagram.com", "youtube.com", "twitter.com", "tiktok.com", "reddit.com"];
let socialSites = [];
let isInitialized = false;

// Prevent multiple initialization
function initializePopup() {
  if (isInitialized) return;
  isInitialized = true;

  console.log("Popup: Initializing...");

  // Setup all event listeners
  setupEventListeners();
  
  // Load initial data
  loadReflectionsCount();
  
  // Request initial timer state
  requestTimerState();
  
  // Setup focus mode
  setupFocusMode();
}

function setupEventListeners() {
  const hours = document.getElementById("hours");
  const minutes = document.getElementById("minutes");
  const seconds = document.getElementById("seconds");

  // Timer controls
  const startTimerBtn = document.getElementById("startTimerBtn");
  if (startTimerBtn) {
    startTimerBtn.addEventListener("click", () => {
      const h = parseInt(hours.value || 0);
      const m = parseInt(minutes.value || 0);
      const s = parseInt(seconds.value || 0);
      const total = h * 3600 + m * 60 + s;

      if (total > 0) {
        chrome.runtime.sendMessage({
          action: "startTimer",
          duration: total,
          timerName: "Custom"
        });
      }
    });
  }

  const stopTimerBtn = document.getElementById("stopTimerBtn");
  if (stopTimerBtn) {
    stopTimerBtn.addEventListener("click", () => {
      chrome.runtime.sendMessage({ action: "stopTimer" });
    });
  }

  const focusModeBtn = document.getElementById("focusModeBtn");
  if (focusModeBtn) {
    focusModeBtn.addEventListener("click", () => {
      chrome.runtime.sendMessage({
        action: "startTimer",
        duration: 25 * 60,
        timerName: "Focus"
      });
    });
  }

  const quickBreakBtn = document.getElementById("quickBreakBtn");
  if (quickBreakBtn) {
    quickBreakBtn.addEventListener("click", () => {
      chrome.runtime.sendMessage({
        action: "startTimer",
        duration: 5 * 60,
        timerName: "Break"
      });
    });
  }

  const viewStatsBtn = document.getElementById("viewStats");
  if (viewStatsBtn) {
    viewStatsBtn.addEventListener("click", () => {
      chrome.tabs.create({
        url: chrome.runtime.getURL("pages/dashboard.html")
      });
    });
  }

  const openSettingsBtn = document.getElementById("openSettings");
  if (openSettingsBtn) {
    openSettingsBtn.addEventListener("click", () => {
      chrome.runtime.openOptionsPage();
    });
  }

  // Focus toggle
  const focusToggle = document.getElementById('focusToggle');
  if (focusToggle) {
    focusToggle.addEventListener('change', handleFocusToggle);
  }

  // Social sites management
  const addSiteBtn = document.getElementById('addSiteBtn');
  const addSiteInput = document.getElementById('addSiteInput');
  
  if (addSiteBtn) {
    addSiteBtn.addEventListener('click', handleAddSite);
  }

  if (addSiteInput) {
    addSiteInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleAddSite();
      }
    });
  }
}

function requestTimerState() {
  chrome.runtime.sendMessage({ action: "requestTimerState" }, (res) => {
    if (chrome.runtime.lastError) {
      console.warn("Popup: Could not request timer state:", chrome.runtime.lastError.message);
      return;
    }
    if (res?.activeTimer && res?.remainingSeconds >= 0) {
      updateTimerUI(res.activeTimer, res.remainingSeconds);
    }
  });
}

function setupFocusMode() {
  console.log("Popup: Setting up focus mode...");
  requestAndDisplayFocusState();
}

// --- Focus Toggle Handler ---
let isProcessingToggle = false;

async function handleFocusToggle(event) {
  if (isProcessingToggle) {
    console.log("Popup: Toggle operation in progress, reverting UI");
    event.target.checked = !event.target.checked;
    return;
  }

  const newState = event.target.checked;
  console.log(`Popup: Focus toggle clicked, new state: ${newState}`);

  isProcessingToggle = true;

  try {
    const response = await sendMessageWithTimeout({
      action: "updateState",
      focusModeActive: newState
    }, 3000);

    console.log("Popup: Toggle response:", response);

    if (response?.status === "state_updated") {
      console.log("Popup: Toggle successful");
      // UI is already correct, no need to change anything
    } else {
      console.warn("Popup: Toggle failed:", response);
      event.target.checked = !newState;
      showError("Failed to update focus mode. Please try again.");
    }
  } catch (error) {
    console.error("Popup: Toggle error:", error);
    event.target.checked = !newState;
    showError("Connection error. Please try again.");
  } finally {
    setTimeout(() => {
      isProcessingToggle = false;
    }, 200);
  }
}

function sendMessageWithTimeout(message, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Request timeout'));
    }, timeoutMs);

    try {
      chrome.runtime.sendMessage(message, (response) => {
        clearTimeout(timeout);
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    } catch (error) {
      clearTimeout(timeout);
      reject(error);
    }
  });
}

// --- Focus State Management ---
function requestAndDisplayFocusState() {
  console.log("Popup: Requesting focus state...");

  chrome.runtime.sendMessage({ action: 'requestFocusState' }, (response) => {
    if (chrome.runtime.lastError) {
      console.warn("Popup: Could not request focus state:", chrome.runtime.lastError.message);
      setDefaults();
      return;
    }

    if (response) {
      console.log("Popup: Received focus state:", response);

      // Update toggle state
      setFocusToggleState(response.focusModeActive);

      // Update social sites
      socialSites = response.socialSites && response.socialSites.length > 0 
        ? [...response.socialSites] 
        : [...defaultSocialSites];
      renderSiteList();

      // Handle focus timer
      if (response.focusModeActive && response.focusStartTime) {
        startFocusTimer(response.focusStartTime);
      } else {
        stopFocusTimer();
      }
    } else {
      console.error("Popup: No response from background");
      setDefaults();
    }
  });
}

function setDefaults() {
  setFocusToggleState(false);
  socialSites = [...defaultSocialSites];
  renderSiteList();
  stopFocusTimer();
}

function setFocusToggleState(isActive) {
  const focusToggle = document.getElementById('focusToggle');
  if (focusToggle) {
    if (focusToggle.checked !== isActive) {
      focusToggle.checked = isActive;
      console.log(`Popup: Set focus toggle to ${isActive}`);
    }
  } else {
    console.error("Popup: focusToggle element not found");
  }
}

// --- Focus Timer Display ---
function startFocusTimer(startTime) {
  stopFocusTimer();
  updateFocusTimerDisplay(startTime);
  focusTimerInterval = setInterval(() => {
    updateFocusTimerDisplay(startTime);
  }, 1000);
}

function stopFocusTimer() {
  if (focusTimerInterval) {
    clearInterval(focusTimerInterval);
    focusTimerInterval = null;
  }
  const focusTimerDisplay = document.getElementById('focusTimerDisplay');
  if (focusTimerDisplay) {
    focusTimerDisplay.textContent = "Focus Time: 0m 0s";
  }
}

function updateFocusTimerDisplay(startTime) {
  const focusTimerDisplay = document.getElementById('focusTimerDisplay');
  if (focusTimerDisplay) {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    focusTimerDisplay.textContent = `Focus Time: ${minutes}m ${seconds}s`;
  }
}

// --- Social Sites Management ---
function handleAddSite() {
  const addSiteInput = document.getElementById('addSiteInput');
  const newSite = cleanSiteInput(addSiteInput.value.trim());
  
  if (!newSite) {
    showError('Please enter a valid site.');
    return;
  }
  
  if (!isValidDomain(newSite)) {
    showError('Invalid format. Use "example.com".');
    return;
  }

  if (socialSites.some(site => site.toLowerCase() === newSite.toLowerCase())) {
    showError('This site is already added.');
    return;
  }

  socialSites.push(newSite);
  chrome.runtime.sendMessage({ action: "updateSocialSites", socialSites });
  renderSiteList();
  addSiteInput.value = '';
  hideError();
}

function renderSiteList() {
  const siteList = document.getElementById('siteList');
  if (!siteList) return;

  siteList.innerHTML = '';

  if (socialSites.length === 0) {
    siteList.innerHTML = '<p style="font-size: 12px; color: gray;">No sites added yet.</p>';
    return;
  }

  socialSites.forEach(site => {
    const li = document.createElement('li');
    li.style.display = "flex";
    li.style.justifyContent = "space-between";
    li.style.alignItems = "center";
    li.style.marginBottom = "4px";
    li.style.fontSize = "13px";
    li.style.padding = "2px 0";

    const siteName = document.createElement('span');
    siteName.textContent = site;
    li.appendChild(siteName);

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '✖';
    removeBtn.className = 'remove-btn';
    removeBtn.title = `Remove ${site}`;

    removeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      socialSites = socialSites.filter(s => s !== site);
      chrome.runtime.sendMessage({ action: "updateSocialSites", socialSites });
      renderSiteList();
    });

    li.appendChild(removeBtn);
    siteList.appendChild(li);
  });
}

// --- Utility Functions ---
function showError(message) {
  const errorMessage = document.getElementById('errorMessage');
  if (errorMessage) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    setTimeout(hideError, 3000);
  }
}

function hideError() {
  const errorMessage = document.getElementById('errorMessage');
  if (errorMessage) {
    errorMessage.style.display = 'none';
  }
}

function isValidDomain(site) {
  const pattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return pattern.test(site) && site.includes('.');
}

function cleanSiteInput(input) {
  return input.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase();
}

async function loadReflectionsCount() {
  try {
    const data = await chrome.storage.local.get(['reflections']);
    const reflectionsCountElement = document.getElementById('reflectionsCount');
    if (reflectionsCountElement) {
      reflectionsCountElement.textContent = (data.reflections || []).length;
    }
  } catch (error) {
    console.warn("Could not load reflections count:", error);
  }
}

// --- Message Listener ---
chrome.runtime.onMessage.addListener((msg) => {
  try {
    if (msg.action === "updateTimerDisplay") {
      updateTimerUI(msg.activeTimer, msg.remainingSeconds);
    } else if (msg.action === "timerCompletedUI") {
      const timerDisplay = document.getElementById("timerDisplay");
      const stopBtn = document.getElementById("stopTimerBtn");
      if (timerDisplay && stopBtn) {
        timerDisplay.textContent = "⏱ Done!";
        stopBtn.style.display = "none";
      }
    } else if (msg.action === "updateFocusTimerDisplay") {
      setFocusToggleState(msg.focusModeActive);
      if (msg.focusModeActive) {
        startFocusTimer(Date.now() - (msg.minutesFocused * 60 * 1000));
      } else {
        stopFocusTimer();
      }
    }
  } catch (error) {
    console.error("Popup: Error handling message:", error);
  }
});

// Initialize when DOM is fully loaded
document.addEventListener("DOMContentLoaded", initializePopup);
