document.addEventListener('DOMContentLoaded', function() {
  const takeBreakButton = document.getElementById('takeBreak');
  
  takeBreakButton.addEventListener('click', function() {
    // Option 1: Open breathing exercise in new window
    if (typeof chrome !== 'undefined' && chrome.windows) {
      // Chrome extension context
      chrome.windows.create({
        url: chrome.runtime.getURL("pages/breathe.html"), // You'll need to create this
        type: "popup",
        width: 400,
        height: 500
      });
    } else {
      // Regular web page context - open in new tab/window
      window.open('breathe.html', '_blank', 'width=400,height=500');
    }
    
    // Option 2: Replace current content with breathing exercise
    // Uncomment this if you prefer to show breathing exercise in same window
    // showBreathingExercise();
  });
});