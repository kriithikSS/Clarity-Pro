export async function getSettings() {
  return new Promise(resolve => {
    chrome.storage.sync.get({
      scrollThreshold: 3000,
      sites: [],
      applyToAll: true
    }, resolve);
  });
}

export async function saveSettings(settings) {
  return new Promise(resolve => {
    chrome.storage.sync.set(settings, resolve);
  });
}
