document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('toggleBtn');
  const statusDiv = document.getElementById('status');
  const savedPagesList = document.getElementById('savedPagesList');
  const clearBtn = document.getElementById('clearBtn');

  // Check current state
  chrome.storage.local.get(['orangeBlurEnabled'], (result) => {
    const isEnabled = result.orangeBlurEnabled !== false;
    updateUI(isEnabled);
  });
  
  // Load saved pages
  loadSavedPages();

  // Toggle on button click
  toggleBtn.addEventListener('click', () => {
    chrome.storage.local.get(['orangeBlurEnabled'], (result) => {
      const currentState = result.orangeBlurEnabled !== false;
      const newState = !currentState;

      chrome.storage.local.set({ orangeBlurEnabled: newState });

      // Send message to content script
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(
            tabs[0].id, 
            { action: 'toggleBlur', enabled: newState },
            (response) => {
              if (chrome.runtime.lastError) {
                console.log('Message sent, blur state updated');
              }
              updateUI(newState);
            }
          );
        }
      });
    });
  });
  
  // Clear all saved pages
  clearBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all saved pages?')) {
      chrome.storage.local.set({ savedPages: [] });
      loadSavedPages();
    }
  });

  function updateUI(isEnabled) {
    if (isEnabled) {
      toggleBtn.textContent = 'Disable Orange Blur';
      statusDiv.textContent = 'Blur: ON';
    } else {
      toggleBtn.textContent = 'Enable Orange Blur';
      statusDiv.textContent = 'Blur: OFF';
    }
  }
  
  function loadSavedPages() {
    chrome.storage.local.get('savedPages', (result) => {
      const savedPages = result.savedPages || [];
      
      savedPagesList.innerHTML = '';
      
      if (savedPages.length === 0) {
        savedPagesList.innerHTML = '<div style="font-size: 11px; color: #999; padding: 8px 0;">No saved pages yet</div>';
        return;
      }
      
      savedPages.forEach((page, index) => {
        const pageItem = document.createElement('div');
        pageItem.className = 'page-item';
        
        // Create URL link
        const urlLink = document.createElement('a');
        urlLink.className = 'page-url';
        urlLink.href = '#';
        urlLink.textContent = new URL(page.url).hostname;
        urlLink.addEventListener('click', (e) => {
          e.preventDefault();
          chrome.tabs.create({ url: page.url });
        });
        
        // Create keywords display
        const keywordsDiv = document.createElement('div');
        keywordsDiv.className = 'page-keywords';
        
        const criticalLabel = document.createElement('span');
        criticalLabel.className = 'keyword-label';
        criticalLabel.style.color = '#FF6600';
        criticalLabel.textContent = 'C: ';
        
        const criticalKeywords = document.createElement('span');
        criticalKeywords.textContent = (page.criticalKeywords || []).slice(0, 2).join(', ') + (page.criticalKeywords?.length > 2 ? '...' : '');
        
        keywordsDiv.appendChild(criticalLabel);
        keywordsDiv.appendChild(criticalKeywords);
        
        const designLabel = document.createElement('span');
        designLabel.className = 'keyword-label';
        designLabel.style.color = '#333';
        designLabel.style.marginLeft = '6px';
        designLabel.textContent = 'D: ';
        
        const designKeywords = document.createElement('span');
        designKeywords.textContent = (page.designKeywords || []).slice(0, 2).join(', ') + (page.designKeywords?.length > 2 ? '...' : '');
        
        keywordsDiv.appendChild(designLabel);
        keywordsDiv.appendChild(designKeywords);
        
        // Add delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '✕';
        deleteBtn.style.cssText = `
          position: absolute;
          right: 4px;
          top: 4px;
          background: none;
          border: none;
          color: #999;
          cursor: pointer;
          font-size: 12px;
          padding: 0;
          width: 16px;
          height: 16px;
        `;
        deleteBtn.addEventListener('click', () => {
          savedPages.splice(index, 1);
          chrome.storage.local.set({ savedPages: savedPages });
          loadSavedPages();
        });
        
        pageItem.style.position = 'relative';
        pageItem.appendChild(urlLink);
        pageItem.appendChild(keywordsDiv);
        pageItem.appendChild(deleteBtn);
        
        savedPagesList.appendChild(pageItem);
      });
    });
  }
});
