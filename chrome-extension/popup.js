document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('toggleBtn');
  const statusDiv = document.getElementById('status');

  // Check current state
  chrome.storage.local.get(['orangeBlurEnabled'], (result) => {
    const isEnabled = result.orangeBlurEnabled !== false;
    updateUI(isEnabled);
  });

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

  function updateUI(isEnabled) {
    if (isEnabled) {
      toggleBtn.textContent = 'Disable Orange Blur';
      statusDiv.textContent = 'Blur: ON';
    } else {
      toggleBtn.textContent = 'Enable Orange Blur';
      statusDiv.textContent = 'Blur: OFF';
    }
  }
});
