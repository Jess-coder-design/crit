// Track selected keywords for drawing
let selectedKeywords = [];
let selectionTimeout = null;

// Apply orange blur by default (unless this is the CR!T landscape page or crit site)
// Check if this is the landscape page by looking at the URL
const isLandscapePage = window.location.pathname.includes('index.html') && window.location.port === '5500';
const isCritSite = window.location.hostname === 'crit-online.netlify.app' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

console.log('[CRIT Extension] Hostname:', window.location.hostname, 'isCritSite:', isCritSite);

if (!isLandscapePage && !isCritSite) {
  applyOrangeBlur();
}

// Create SVG overlay for drawing connections
const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
svg.id = 'crit-keyword-connections';
svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
svg.style.cssText = `
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 2147483646;
`;
document.documentElement.appendChild(svg);

// Create Add button
const addButton = document.createElement('button');
addButton.id = 'crit-add-button';
addButton.textContent = 'Add';
addButton.style.cssText = `
  position: fixed;
  bottom: 20px;
  left: 20px;
  padding: 4px 8px;
  font-family: "PT Sans", sans-serif;
  font-size: 14px;
  font-weight: 400;
  cursor: pointer;
  border: none;
  border-radius: 0;
  color: #333;
  background-color: #d3d3d3;
  box-shadow: inset 0 0 12px 2px rgba(255, 102, 0, 0.6);
  transition: opacity 0.2s ease, transform 0.2s ease;
  z-index: 2147483648;
`;
addButton.addEventListener('mouseenter', () => {
  addButton.style.transform = 'scale(1.05)';
});
addButton.addEventListener('mouseleave', () => {
  addButton.style.transform = 'scale(1)';
});
addButton.addEventListener('click', handleAddButtonClick);

// Only add button on non-landscape pages and non-CRIT pages
if (!isLandscapePage && !isCritSite) {
  document.documentElement.appendChild(addButton);
}

// Handle Add button click
async function handleAddButtonClick() {
  const currentUrl = window.location.href;
  console.log('Add button clicked for URL:', currentUrl);
  
  // Get stored pages from chrome storage
  chrome.storage.local.get('savedPages', async (result) => {
    const savedPages = result.savedPages || [];
    
    // Check if URL is already in list
    const urlExists = savedPages.some(page => page.url === currentUrl);
    if (urlExists) {
      console.log('URL already exists in saved list:', currentUrl);
      return;
    }
    
    console.log('URL is new, checking keywords...');
    
    // Fetch keywords.json to validate groups
    try {
      const response = await fetch(chrome.runtime.getURL('keywords.json'));
      const keywordsData = await response.json();
      
      // Check if there's at least one critical keyword and one design keyword
      let hasCriticalKeyword = false;
      let hasDesignKeyword = false;
      
      // Get all critical keywords
      const criticalKeywords = new Set();
      if (keywordsData['x-axis'] && keywordsData['x-axis'].critical) {
        Object.entries(keywordsData['x-axis'].critical).forEach(([base, variations]) => {
          variations.forEach(v => criticalKeywords.add(v.toLowerCase()));
        });
      }
      
      // Get all design keywords
      const designKeywords = new Set();
      if (keywordsData['y-axis'] && keywordsData['y-axis'].design) {
        Object.entries(keywordsData['y-axis'].design).forEach(([base, variations]) => {
          variations.forEach(v => designKeywords.add(v.toLowerCase()));
        });
      }
      
      // Check page content for keywords
      const pageText = document.body.innerText.toLowerCase();
      
      for (let keyword of criticalKeywords) {
        if (pageText.includes(keyword)) {
          hasCriticalKeyword = true;
          break;
        }
      }
      
      for (let keyword of designKeywords) {
        if (pageText.includes(keyword)) {
          hasDesignKeyword = true;
          break;
        }
      }
      
      if (hasCriticalKeyword && hasDesignKeyword) {
        console.log('✓ Page has both critical and design keywords');
        
        // Extract which specific keywords were found
        const foundCriticalKeywords = [];
        const foundDesignKeywords = [];
        
        for (let keyword of criticalKeywords) {
          if (pageText.includes(keyword)) {
            foundCriticalKeywords.push(keyword);
          }
        }
        
        for (let keyword of designKeywords) {
          if (pageText.includes(keyword)) {
            foundDesignKeywords.push(keyword);
          }
        }
        
        // Create page entry with keywords
        const pageEntry = {
          url: currentUrl,
          timestamp: new Date().toISOString(),
          criticalKeywords: foundCriticalKeywords,
          designKeywords: foundDesignKeywords
        };
        
        // Add to existing pages
        savedPages.push(pageEntry);
        
        // Save the updated list locally
        chrome.storage.local.set({ savedPages: savedPages });
        
        // Send data to Netlify function
        try {
          const response = await fetch('https://crit-online.netlify.app/.netlify/functions/save-page', {
            method: 'POST',
            headers: {
              'Content-Type': 'text/plain',  // Use text/plain to avoid preflight request
            },
            body: JSON.stringify({
              url: currentUrl,
              criticalKeywords: foundCriticalKeywords,
              designKeywords: foundDesignKeywords
            })
          });
          
          const responseData = await response.json();
          
          if (response.ok) {
            console.log('✓ Data sent to server successfully:', responseData);
          } else {
            console.error('Failed to send data to server. Status:', response.status, 'Response:', responseData);
          }
        } catch (error) {
          console.error('Error sending data to server:', error.message);
        }
        
        console.log('Page saved with keywords:', {
          url: currentUrl,
          criticalKeywords: foundCriticalKeywords,
          designKeywords: foundDesignKeywords
        });
      } else {
        console.log('✗ Page missing required keywords. Critical:', hasCriticalKeyword, 'Design:', hasDesignKeyword);
      }
    } catch (error) {
      console.error('Error checking keywords:', error);
    }
  });
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeHighlighting);
} else {
  initializeHighlighting();
}

function initializeHighlighting() {
  // Don't highlight keywords on the landscape page
  if (isLandscapePage) {
    console.log('Landscape page detected, skipping keyword highlighting');
    return;
  }

  // Request keywords and colors from background service worker
  console.log('Content: Requesting keywords and colors...');

  chrome.runtime.sendMessage(
    { action: 'getKeywordsAndColors' },
    (response) => {
      console.log('Content: Got response:', response);
      
      if (response && response.keywords && response.colors) {
        console.log('Content: Received keywords and colors');
        highlightKeywords(response.keywords, response.colors);
      } else if (response && response.error) {
        console.error('Content: Error from service worker:', response.error);
      } else {
        console.error('Content: Invalid response from service worker:', response);
      }
    }
  );
}

// Listen for messages from popup to toggle blur
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    if (request.action === 'toggleBlur') {
      if (request.enabled) {
        applyOrangeBlur();
      } else {
        removeOrangeBlur();
      }
      sendResponse({ status: 'done' });
    }
  } catch (error) {
    console.error('Error handling message:', error);
  }
});

function applyOrangeBlur() {
  // Remove existing blur element if it exists
  const existing = document.getElementById('crit-orange-blur');
  if (existing) {
    existing.remove();
  }

  // Create the blur overlay
  const blurElement = document.createElement('div');
  blurElement.id = 'crit-orange-blur';
  blurElement.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    box-shadow: inset 0 0 40px #FF6600;
    pointer-events: none;
    z-index: 2147483647;
  `;
  document.documentElement.appendChild(blurElement);
}

function removeOrangeBlur() {
  const blurElement = document.getElementById('crit-orange-blur');
  if (blurElement) {
    blurElement.remove();
  }
}

function highlightKeywords(keywordsData, colorsData) {
  console.log('highlightKeywords called');
  
  // Build keyword-to-color map
  const keywordColors = {};
  
  // Add critical group colors
  if (colorsData.criticalgroup) {
    Object.entries(colorsData.criticalgroup).forEach(([keyword, data]) => {
      keywordColors[keyword.toLowerCase()] = data.color;
    });
  }
  
  // Add design group colors
  if (colorsData.designgroup) {
    Object.entries(colorsData.designgroup).forEach(([keyword, data]) => {
      keywordColors[keyword.toLowerCase()] = data.color;
    });
  }
  
  console.log('Built color map with', Object.keys(keywordColors).length, 'keywords');
  
  // Get all keywords to search for (both base and variations)
  const allKeywords = new Set();
  
  // Add all variations from x-axis (critical)
  if (keywordsData['x-axis'] && keywordsData['x-axis'].critical) {
    Object.entries(keywordsData['x-axis'].critical).forEach(([base, variations]) => {
      variations.forEach(v => allKeywords.add(v.toLowerCase()));
    });
  }
  
  // Add all variations from y-axis (design)
  if (keywordsData['y-axis'] && keywordsData['y-axis'].design) {
    Object.entries(keywordsData['y-axis'].design).forEach(([base, variations]) => {
      variations.forEach(v => allKeywords.add(v.toLowerCase()));
    });
  }
  
  console.log('Total keywords to search for:', allKeywords.size);
  
  // Sort keywords by length (longest first) to avoid partial matches
  const sortedKeywords = Array.from(allKeywords).sort((a, b) => b.length - a.length);
  
  console.log('Starting highlighting with', sortedKeywords.length, 'keywords');
  
  // Use TreeWalker to process all text nodes
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  const nodesToReplace = [];
  let node;
  
  // Debug: log first few text nodes
  let nodeCount = 0;
  let debugWalker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  let debugNode;
  while (debugNode = debugWalker.nextNode()) {
    if (nodeCount < 3) {
      console.log('Sample text node:', debugNode.textContent.substring(0, 50));
    }
    nodeCount++;
  }
  console.log('Total text nodes in DOM:', nodeCount);
  
  while (node = walker.nextNode()) {
    // Skip certain parent elements
    if (node.parentElement && ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(node.parentElement.tagName)) {
      continue;
    }
    
    let text = node.textContent;
    let hasMatch = false;
    
    // Check if any keyword matches
    for (let keyword of sortedKeywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regex.test(text)) {
        hasMatch = true;
        console.log('Found keyword:', keyword, 'in text:', text.substring(0, 50));
        break;
      }
    }
    
    if (hasMatch) {
      nodesToReplace.push({ node, sortedKeywords, keywordColors });
    }
  }
  
  console.log('Found', nodesToReplace.length, 'text nodes with keywords');
  
  // Now replace the nodes
  nodesToReplace.forEach(({ node, sortedKeywords, keywordColors }) => {
    const span = document.createElement('span');
    let html = node.textContent;
    
    // Escape HTML first
    html = html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    
    // Replace keywords with highlights
    for (let keyword of sortedKeywords) {
      const color = keywordColors[keyword];
      if (color) {
        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b(${escapedKeyword})\\b`, 'gi');
        html = html.replace(regex, `<mark data-keyword="${keyword}" style="background-color: ${color}; color: #333; padding: 2px 4px; border-radius: 2px; cursor: pointer;">$1</mark>`);
      }
    }
    
    span.innerHTML = html;
    node.parentNode.replaceChild(span, node);
  });
  
  console.log('Highlighting complete');
  
  // Add click handlers to marked keywords
  addKeywordClickHandlers();
}

function addKeywordClickHandlers() {
  document.querySelectorAll('mark[data-keyword]').forEach(mark => {
    // Remove existing listeners to avoid duplicates
    const newMark = mark.cloneNode(true);
    mark.parentNode.replaceChild(newMark, mark);
    
    newMark.addEventListener('click', handleKeywordClick);
  });
}

function handleKeywordClick(e) {
  e.preventDefault();
  e.stopPropagation();
  
  console.log('Keyword clicked:', e.target.dataset.keyword);
  
  // Clear any pending timeout
  if (selectionTimeout) {
    clearTimeout(selectionTimeout);
  }
  
  // Add this keyword to the selection
  selectedKeywords.push(e.target);
  console.log('Total keywords selected:', selectedKeywords.length);
  
  // Redraw all lines and dots
  redrawConnections();
  
  // Set timeout to navigate if no other keyword is clicked
  selectionTimeout = setTimeout(() => {
    console.log('2 seconds elapsed, navigating...');
    window.location.href = 'http://127.0.0.1:5500/index.html';
    selectedKeywords = [];
  }, 2000);
}

function redrawConnections() {
  // Clear all previous lines and circles
  svg.innerHTML = '';
  
  if (selectedKeywords.length < 1) return;
  
  // Draw lines between consecutive keywords
  for (let i = 0; i < selectedKeywords.length; i++) {
    const currentMark = selectedKeywords[i];
    const nextMark = selectedKeywords[(i + 1) % selectedKeywords.length]; // Loop back to first
    
    const rect1 = currentMark.getBoundingClientRect();
    const rect2 = nextMark.getBoundingClientRect();
    
    const x1 = rect1.left + rect1.width / 2;
    const y1 = rect1.top + rect1.height / 2;
    const x2 = rect2.left + rect2.width / 2;
    const y2 = rect2.top + rect2.height / 2;
    
    // Draw line
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke', '#FF6600');
    line.setAttribute('stroke-width', '3');
    svg.appendChild(line);
  }
  
  // Draw dots at all keyword positions
  selectedKeywords.forEach(mark => {
    const rect = mark.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x);
    circle.setAttribute('cy', y);
    circle.setAttribute('r', '5');
    circle.setAttribute('fill', '#FF6600');
    svg.appendChild(circle);
  });
}

