console.log("Clarity watcher injected on:", window.location.href);

(function () {
  let scrollStartTime = null;
  let lastScrollTime = null;
  let scrollTimer = null;

  function showPrompt() {
  console.log("🟣 showPrompt() called");

  // If overlay already exists, do nothing
  if (document.getElementById("clarity-overlay")) {
    console.log("Overlay already shown");
    return;
  }

  const overlay = document.createElement("div");
  overlay.id = "clarity-overlay";

  overlay.style.cssText = `
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.92);
    color: #fff;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    font-family: sans-serif;
    z-index: 2147483647;
  `;

  overlay.innerHTML = `
    <h1 style="font-size: 2rem;">You've been scrolling too long</h1>
    <p>Time to take a quick break and refocus.</p>
    <button id="dismissOverlay" style="margin-top:20px;padding:10px 20px;border:none;border-radius:5px;background:#bb86fc;color:#000;font-weight:bold;cursor:pointer;">Got it!</button>
  `;

  // Ensure DOM is ready
  const appendOverlay = () => {
    document.body.appendChild(overlay);

    const dismissBtn = document.getElementById("dismissOverlay");
    if (dismissBtn) {
      dismissBtn.addEventListener("click", () => {
        console.log("🟢 Overlay dismissed");
        overlay.remove();
      });
    }
  };

  if (document.body) {
    appendOverlay();
  } else {
    window.addEventListener("load", appendOverlay);
  }
}


  function shouldMonitor(url, settings) {
    return settings.applyToAll || settings.sites.some(site => url.includes(site));
  }

  function saveScrollDuration(durationMs) {
    const domain = new URL(window.location.href).hostname;
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    chrome.storage.local.get(["scrollHistory"], (result) => {
      const history = result.scrollHistory || {};
      if (!history[today]) history[today] = {};
      history[today][domain] = (history[today][domain] || 0) + durationMs;
      chrome.storage.local.set({ scrollHistory: history });
    });
  }

  

  function attachScrollListeners(callback) {
    const seen = new WeakSet();
    const addScrollListener = (el) => {
      if (!seen.has(el)) {
        try {
          el.addEventListener("scroll", callback, { passive: true });
          seen.add(el);
        } catch (_) {}
      }
    };

    addScrollListener(window);
    addScrollListener(document);
    addScrollListener(document.body);
    document.querySelectorAll("*").forEach(addScrollListener);

    setInterval(() => {
      document.querySelectorAll("*").forEach(addScrollListener);
    }, 5000);
  }

  chrome.storage.local.get({
    scrollDurationLimit: 15,
    scrollInactivityTimeout: 2,
    sites: [],
    applyToAll: true
  }, (settings) => {
    if (!shouldMonitor(window.location.href, settings)) return;

    const maxDuration = settings.scrollDurationLimit * 1000;
    const resetDelay = settings.scrollInactivityTimeout * 1000;

    const onScrollDetected = () => {
      const now = Date.now();

      if (!scrollStartTime) scrollStartTime = now;
      lastScrollTime = now;

      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        if (scrollStartTime && now - scrollStartTime < maxDuration) {
          saveScrollDuration(now - scrollStartTime);
        }
        scrollStartTime = null;
      }, resetDelay);

      if (now - scrollStartTime >= maxDuration) {
  console.log("🔴 Max scroll duration exceeded");
  showPrompt();
  saveScrollDuration(now - scrollStartTime);
  scrollStartTime = null;
}

    };

    attachScrollListeners(onScrollDetected);
  });
})();
