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
