// Cache for keywords and colors
let keywordsCache = null;
let colorsCache = null;

// Initialize storage on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ orangeBlurEnabled: true });
  loadAndCacheData();
});

// Load and cache keywords and colors
function loadAndCacheData() {
  Promise.all([
    fetch(chrome.runtime.getURL('keywords.json')).then(r => r.json()),
    fetch(chrome.runtime.getURL('colors.json')).then(r => r.json())
  ])
  .then(([keywordsData, colorsData]) => {
    keywordsCache = keywordsData;
    colorsCache = colorsData;
    console.log('Background: Keywords and colors cached');
  })
  .catch(error => console.error('Background: Failed to cache data:', error));
}

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background: Received message:', request.action);
  
  if (request.action === 'getKeywordsAndColors') {
    // If cache is empty, load it first
    if (!keywordsCache || !colorsCache) {
      loadAndCacheData();
      // Return cached data if available, otherwise try to load
      Promise.all([
        fetch(chrome.runtime.getURL('keywords.json')).then(r => r.json()),
        fetch(chrome.runtime.getURL('colors.json')).then(r => r.json())
      ])
      .then(([keywordsData, colorsData]) => {
        console.log('Background: Sending keywords and colors');
        sendResponse({
          keywords: keywordsData,
          colors: colorsData
        });
      })
      .catch(error => {
        console.error('Background: Failed to load data:', error);
        sendResponse({ error: error.message });
      });
    } else {
      console.log('Background: Sending cached keywords and colors');
      sendResponse({
        keywords: keywordsCache,
        colors: colorsCache
      });
    }
    return true; // Keep channel open for async response
  }
});
