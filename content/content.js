(() => {
let overlayActive = false;
let startTime = null;
let contentWrapper = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Content script received message:", request.action);

  if (request.action === "disrupt" && !overlayActive) {
    console.log("Content script: Initiating page disruption with urgency:", request.urgency);
    disruptPage(request.urgency, request.siteContext, request.behaviorData, request.pageAnalysis);
    sendResponse({ status: "disruption_started" });
  } else {
    console.log("Content script: Disrupt ignored. Overlay active:", overlayActive, "or action not 'disrupt'.");
    sendResponse({ status: "disruption_ignored", overlayActive: overlayActive });
  }
  return true;
});

function disruptPage(urgency = 'low', siteContext = 'general', behaviorData = {}, pageAnalysis = {}) {
  if (overlayActive) {
    console.log("Content script: Disruption skipped, overlay already active.");
    return;
  }
  
  overlayActive = true;
  startTime = Date.now();

  // Inject custom styles for animations
  injectStyles();
  
  const overlay = createOverlay(urgency, siteContext, behaviorData, pageAnalysis);
  document.body.appendChild(overlay);
  
  if (!document.getElementById('clarity-content-wrapper')) {
    const wrapper = document.createElement('div');
    wrapper.id = 'clarity-content-wrapper';
    Array.from(document.body.children)
      .filter(child => !child.classList.contains('clarity-overlay'))
      .forEach(child => wrapper.appendChild(child));
    document.body.appendChild(wrapper);
  }
  
  contentWrapper = document.getElementById('clarity-content-wrapper');
  if (contentWrapper) {
    contentWrapper.style.filter = "blur(12px)";
    contentWrapper.style.pointerEvents = "none";
    contentWrapper.style.transition = "filter 0.5s ease";
    contentWrapper.style.transform = "scale(0.95)";
  }
}

function injectStyles() {
  if (document.querySelector('#clarityStyles')) return;
  
  const style = document.createElement('style');
  style.id = 'clarityStyles';
  style.textContent = `
    @keyframes clarityFadeIn {
      from { 
        opacity: 0; 
        transform: scale(0.8) translateY(20px);
      }
      to { 
        opacity: 1; 
        transform: scale(1) translateY(0);
      }
    }
    
    @keyframes clarityFadeOut {
      from { 
        opacity: 1; 
        transform: scale(1) translateY(0);
      }
      to { 
        opacity: 0; 
        transform: scale(0.8) translateY(-20px);
      }
    }
    
    @keyframes clarityPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    
    @keyframes clarityGlow {
      0%, 100% { box-shadow: 0 0 20px rgba(102, 126, 234, 0.3); }
      50% { box-shadow: 0 0 40px rgba(102, 126, 234, 0.6); }
    }
    
    @keyframes clarityFloat {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
    }
    
    .clarity-overlay * {
      box-sizing: border-box;
    }
  `;
  document.head.appendChild(style);
}

function createOverlay(urgency, siteContext, behaviorData, pageAnalysis) {
  const overlay = document.createElement("div");
  overlay.className = "clarity-overlay";
  
  // Enhanced background with gradient and backdrop blur
  const backgroundStyle = urgency === 'high' 
    ? 'background: linear-gradient(135deg, rgba(220, 38, 127, 0.95), rgba(239, 68, 68, 0.95));'
    : 'background: linear-gradient(135deg, rgba(102, 126, 234, 0.95), rgba(118, 75, 162, 0.95));';
  
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    ${backgroundStyle}
    backdrop-filter: blur(10px);
    z-index: 999999;
    display: flex;
    justify-content: center;
    align-items: center;
    text-align: center;
    padding: 20px;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    animation: clarityFadeIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  `;

  const content = getPromptContent(urgency, siteContext, behaviorData, pageAnalysis);
  overlay.innerHTML = content;
  
  setupOverlayInteractions(overlay, siteContext);
  
  return overlay;
}

function getPromptContent(urgency, siteContext, behaviorData, pageAnalysis) {
  const isHighUrgency = urgency === 'high';
  const emoji = isHighUrgency ? '⚠️' : '⏰';
  const title = isHighUrgency ? 'Focus Break Required!' : 'Timer Complete!';
  const message = isHighUrgency 
    ? 'You\'ve been browsing for a while. Time for a mindful pause to refocus your energy.'
    : 'Your timer has ended. Take a moment to reflect before continuing your journey.';
  
  const accentColor = isHighUrgency ? '#dc2626' : '#667eea';
  const buttonGradient = isHighUrgency 
    ? 'linear-gradient(135deg, #dc2626, #b91c1c)'
    : 'linear-gradient(135deg, #667eea, #764ba2)';
  
  return `
    <div style="
      max-width: 480px;
      width: 90%;
      background: rgba(255, 255, 255, 0.98);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.3);
      padding: 40px 30px;
      border-radius: 24px;
      box-shadow: 
        0 25px 50px rgba(0, 0, 0, 0.15),
        0 0 0 1px rgba(255, 255, 255, 0.1);
      animation: clarityFloat 3s ease-in-out infinite;
      position: relative;
      overflow: hidden;
    ">
      
      <!-- Decorative elements -->
      <div style="
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: radial-gradient(circle, ${accentColor}15 0%, transparent 50%);
        animation: clarityGlow 4s ease-in-out infinite;
        pointer-events: none;
      "></div>
      
      <!-- Main content -->
      <div style="position: relative; z-index: 1;">
        <div style="
          font-size: 64px;
          margin-bottom: 20px;
          animation: clarityPulse 2s ease-in-out infinite;
        ">${emoji}</div>
        
        <h1 style="
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 16px;
          color: #1a202c;
          background: linear-gradient(135deg, ${accentColor}, #4a5568);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        ">${title}</h1>
        
        <p style="
          font-size: 18px;
          line-height: 1.6;
          margin-bottom: 30px;
          color: #4a5568;
          font-weight: 400;
        ">${message}</p>
        
        <!-- Progress indicator -->
        <div style="
          width: 100%;
          height: 4px;
          background: rgba(102, 126, 234, 0.2);
          border-radius: 2px;
          margin-bottom: 25px;
          overflow: hidden;
        ">
          <div style="
            width: 100%;
            height: 100%;
            background: ${buttonGradient};
            border-radius: 2px;
            animation: clarityPulse 1.5s ease-in-out infinite;
          "></div>
        </div>
        
        <!-- Action buttons -->
        <div style="
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        ">
          <button id="continueBtn" style="
            padding: 16px 32px;
            border: none;
            background: ${buttonGradient};
            color: white;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            border-radius: 12px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
            position: relative;
            overflow: hidden;
            min-width: 140px;
          ">
            <span style="position: relative; z-index: 1;">Continue</span>
          </button>
          
          
        </div>
        
        <!-- Timer info -->
        <div style="
          margin-top: 25px;
          padding: 16px;
          background: rgba(102, 126, 234, 0.1);
          border-radius: 12px;
          border: 1px solid rgba(102, 126, 234, 0.2);
        ">
          <p style="
            font-size: 14px;
            color: #4a5568;
            margin: 0;
            font-weight: 500;
          ">
            💡 <strong>Tip:</strong> Regular breaks help maintain focus and productivity throughout your day.
          </p>
        </div>
      </div>
    </div>
  `;
}

function setupOverlayInteractions(overlay) {
  const continueBtn = overlay.querySelector('#continueBtn');
  const reflectBtn = overlay.querySelector('#reflectBtn');
  
  // Enhanced button interactions
  [continueBtn, reflectBtn].forEach(btn => {
    if (btn) {
      btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'translateY(-2px) scale(1.02)';
        if (btn.id === 'continueBtn') {
          btn.style.boxShadow = '0 12px 28px rgba(102, 126, 234, 0.4)';
        }
      });
      
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'translateY(0) scale(1)';
        if (btn.id === 'continueBtn') {
          btn.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.3)';
        }
      });
      
      btn.addEventListener('mousedown', () => {
        btn.style.transform = 'translateY(0) scale(0.98)';
      });
      
      btn.addEventListener('mouseup', () => {
        btn.style.transform = 'translateY(-2px) scale(1.02)';
      });
    }
  });
  
  if (continueBtn) {
    continueBtn.addEventListener('click', () => {
      continueBtn.style.transform = 'scale(0.95)';
      setTimeout(() => dismissOverlay(overlay), 150);
    });
  }
  
  if (reflectBtn) {
    reflectBtn.addEventListener('click', () => {
      reflectBtn.style.transform = 'scale(0.95)';
      // Add reflection functionality here
      setTimeout(() => dismissOverlay(overlay), 150);
    });
  }
  
  // Close on Escape key
  const handleKeydown = (e) => {
    if (e.key === 'Escape') {
      dismissOverlay(overlay);
      document.removeEventListener('keydown', handleKeydown);
    }
  };
  document.addEventListener('keydown', handleKeydown);
}

function dismissOverlay(overlay) {
  overlayActive = false;
  
  // Enhanced exit animation
  overlay.style.animation = 'clarityFadeOut 0.5s cubic-bezier(0.55, 0.085, 0.68, 0.53)';
  
  setTimeout(() => {
    overlay.remove();
    if (contentWrapper) {
      contentWrapper.style.filter = "";
      contentWrapper.style.pointerEvents = "auto";
      contentWrapper.style.transform = "scale(1)";
    }
  }, 500);
}
})();