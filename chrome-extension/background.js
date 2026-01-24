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
  
  // Handle page submission
  if (request.type === 'SAVE_PAGE') {
    console.log('[Background] Received SAVE_PAGE request for:', request.payload.url);
    
    // Make the fetch call from background (no CORS issues)
    fetch('https://crit-online.netlify.app/.netlify/functions/save-page', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'  // Avoid preflight
      },
      body: JSON.stringify(request.payload)
    })
    .then(response => {
      console.log('[Background] Response status:', response.status);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('[Background] ✓ Submission successful:', data);
      sendResponse({ success: true, data: data });
    })
    .catch(error => {
      console.error('[Background] ✗ Submission failed:', error.message);
      sendResponse({ success: false, error: error.message });
    });
    
    return true; // Keep channel open for async response
  }
  
  // Handle check and save page request from content script
  if (request.type === 'CHECK_AND_SAVE_PAGE') {
    console.log('[Background] Checking and saving page:', request.url);
    
    chrome.storage.local.get('savedPages', async (result) => {
      const savedPages = result.savedPages || [];
      
      // Check if URL already exists
      const urlExists = savedPages.some(page => page.url === request.url);
      if (urlExists) {
        console.log('[Background] URL already exists:', request.url);
        sendResponse({ alreadyExists: true });
        return;
      }
      
      // If not exists, send message to content script to process keywords
      try {
        const response = await chrome.tabs.query({ active: true, currentWindow: true });
        if (response[0]) {
          chrome.tabs.sendMessage(
            response[0].id,
            { type: 'PROCESS_AND_SAVE_PAGE', url: request.url },
            (processResponse) => {
              if (processResponse && processResponse.success) {
                sendResponse({ success: true, data: processResponse.data });
              } else {
                sendResponse({ success: false });
              }
            }
          );
        }
      } catch (error) {
        console.error('[Background] Error processing page:', error);
        sendResponse({ success: false });
      }
    });
    
    return true; // Keep channel open for async response
  }
});
