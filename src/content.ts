/**
 * Content script for YouTube integration
 */

let videoElement: HTMLVideoElement | null = null;

function findVideo() {
  videoElement = document.querySelector('video');
  if (videoElement) {
    setupListeners();
  }
}

function setupListeners() {
  if (!videoElement) return;

  // Sync playback rate changes
  videoElement.addEventListener('ratechange', () => {
    if (videoElement) {
      window.postMessage({
        type: 'YOUTUBE_RATE_CHANGE',
        playbackRate: videoElement.playbackRate
      }, '*');
    }
  });

  // Sync time updates
  videoElement.addEventListener('timeupdate', () => {
    if (videoElement) {
      window.postMessage({
        type: 'YOUTUBE_TIME_UPDATE',
        currentTime: videoElement.currentTime
      }, '*');
    }
  });

  // Sync play/pause
  videoElement.addEventListener('play', () => {
    window.postMessage({ type: 'YOUTUBE_PLAY' }, '*');
  });

  videoElement.addEventListener('pause', () => {
    window.postMessage({ type: 'YOUTUBE_PAUSE' }, '*');
  });
}

function detectTheme() {
  const isDark = document.documentElement.hasAttribute('dark') || 
                 document.body.classList.contains('dark') ||
                 window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  window.postMessage({
    type: 'YOUTUBE_THEME_CHANGE',
    isDark
  }, '*');
}

// Initial search
findVideo();
detectTheme();

// Watch for navigation and theme changes
const observer = new MutationObserver(() => {
  if (!videoElement || !document.contains(videoElement)) {
    findVideo();
  }
  detectTheme();
});

observer.observe(document.body, { childList: true, subtree: true });

// Listen for messages from the popup/UI
window.addEventListener('message', (event) => {
  if (event.data.type === 'SET_YOUTUBE_RATE' && videoElement) {
    videoElement.playbackRate = event.data.rate;
  }
});
