/**
 * Utility for cross-context messaging (Content Script <-> Popup)
 * Supports both real Chrome Extension environment and AI Studio simulation
 */

export const sendMessage = (message: any) => {
  // Try chrome.runtime first (Real Extension)
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    try {
      chrome.runtime.sendMessage(message).catch(() => {
        // Ignore errors when popup is closed
      });
    } catch (e) {
      // Fallback
    }
  }
  
  // Also use window.postMessage for simulation/same-page communication
  window.postMessage(message, '*');
  
  // If we are in an iframe, send to parent
  if (window.parent !== window) {
    window.parent.postMessage(message, '*');
  }

  // If we are in the main page, try to send to the DubSync side panel iframe
  const container = document.getElementById('dubsync-container');
  if (container && container.shadowRoot) {
    const iframe = container.shadowRoot.getElementById('panel-iframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(message, '*');
    }
  }
};

export const addMessageListener = (callback: (message: any) => void) => {
  // Listen for window.postMessage
  const windowListener = (event: MessageEvent) => {
    callback(event.data);
  };
  window.addEventListener('message', windowListener);

  // Listen for chrome.runtime.onMessage (Real Extension)
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message) => {
      callback(message);
      return true; // Keep channel open for async responses
    });
  }

  return () => {
    window.removeEventListener('message', windowListener);
  };
};
