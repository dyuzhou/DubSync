/**
 * Content script for YouTube integration
 */

let videoElement: HTMLVideoElement | null = null;
let subtitleOverlay: HTMLDivElement | null = null;

function createOverlay() {
  if (subtitleOverlay) return;
  subtitleOverlay = document.createElement('div');
  subtitleOverlay.id = 'dubsync-subtitle-overlay';
  Object.assign(subtitleOverlay.style, {
    position: 'absolute',
    bottom: '10%',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '24px',
    fontWeight: 'bold',
    textAlign: 'center',
    zIndex: '9999',
    pointerEvents: 'none',
    display: 'none',
    maxWidth: '80%',
    textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
    transition: 'all 0.2s ease'
  });
  
  const container = document.querySelector('#movie_player') || document.body;
  container.appendChild(subtitleOverlay);
}

function updateOverlay(text: string, settings: any) {
  if (!subtitleOverlay) createOverlay();
  if (subtitleOverlay) {
    subtitleOverlay.innerText = text;
    subtitleOverlay.style.display = (settings.showOverlay && text) ? 'block' : 'none';
    subtitleOverlay.style.fontSize = `${settings.overlaySize || 24}px`;
    subtitleOverlay.style.opacity = `${settings.overlayOpacity || 1}`;
  }
}

function findVideo() {
  videoElement = document.querySelector('video');
  if (videoElement) {
    setupListeners();
    createOverlay();
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
  if (event.data.type === 'DUB_SUBTITLE_UPDATE') {
    updateOverlay(event.data.text, event.data.settings);
  }
});
