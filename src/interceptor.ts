(function() {
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    const url = args[0] instanceof Request ? args[0].url : args[0];
    if (url && typeof url === 'string' && url.includes('youtube.com/api/timedtext')) {
      const clone = response.clone();
      const text = await clone.text();
      window.postMessage({ type: 'TIMEDTEXT_INTERCEPTED', url, text }, '*');
    }
    return response;
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method: string, url: string | URL) {
    const urlStr = typeof url === 'string' ? url : url.toString();
    this.addEventListener('load', function() {
      if (urlStr.includes('youtube.com/api/timedtext')) {
        window.postMessage({ type: 'TIMEDTEXT_INTERCEPTED', url: urlStr, text: this.responseText }, '*');
      }
    });
    return originalOpen.apply(this, arguments as any);
  };

  // Also try to find ytInitialPlayerResponse in the window object
  const checkPlayerResponse = () => {
    if ((window as any).ytInitialPlayerResponse) {
      window.postMessage({ 
        type: 'PLAYER_RESPONSE_FOUND', 
        data: (window as any).ytInitialPlayerResponse 
      }, '*');
    }
  };
  
  // Check multiple times as it might be loaded late
  checkPlayerResponse();
  setTimeout(checkPlayerResponse, 2000);
  setTimeout(checkPlayerResponse, 5000);
})();
