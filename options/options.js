document.addEventListener("DOMContentLoaded", () => {
  const siteInput = document.getElementById("siteInput");
  const siteList = document.getElementById("siteList");
  const applyToAllCheckbox = document.getElementById("applyToAll");

  let sites = [];

  function renderSiteList() {
    siteList.innerHTML = "";
    sites.forEach((site, index) => {
      const item = document.createElement("span");
      item.textContent = site;

      const removeBtn = document.createElement("button");
      removeBtn.textContent = "×";
      removeBtn.onclick = () => {
        sites.splice(index, 1);
        renderSiteList();
      };

      item.appendChild(removeBtn);
      siteList.appendChild(item);
    });
  }

  function toggleSiteInputDisabled() {
    const disabled = applyToAllCheckbox.checked;
    siteInput.disabled = disabled;
    siteList.style.opacity = disabled ? 0.5 : 1;
  }

  siteInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = siteInput.value.trim();
      if (val && !sites.includes(val)) {
        sites.push(val);
        renderSiteList();
        siteInput.value = "";
      }
    }
  });

  applyToAllCheckbox.addEventListener("change", toggleSiteInputDisabled);

  // Load existing settings
  chrome.storage.local.get({
    scrollDurationLimit: 15,
    scrollInactivityTimeout: 2,
    sites: [],
    applyToAll: true
  }, (settings) => {
    document.getElementById("scrollDuration").value = settings.scrollDurationLimit;
    document.getElementById("inactivityReset").value = settings.scrollInactivityTimeout;
    applyToAllCheckbox.checked = settings.applyToAll;
    sites = settings.sites || [];
    renderSiteList();
    toggleSiteInputDisabled();
  });

  document.getElementById("save").addEventListener("click", () => {
    const scrollDurationLimit = parseInt(document.getElementById("scrollDuration").value, 10);
    const scrollInactivityTimeout = parseInt(document.getElementById("inactivityReset").value, 10);
    const applyToAll = applyToAllCheckbox.checked;

    chrome.storage.local.set({
      scrollDurationLimit,
      scrollInactivityTimeout,
      sites,
      applyToAll
    }, () => {
      alert("Settings saved!");
    });
  });
});
