# CR!T Orange Blur Chrome Extension

A Chrome extension that adds an orange blur effect to webpages and highlights CR!T keywords with their corresponding colors.

## Features

- **Orange Blur Effect**: Applies a customizable orange blur overlay to webpages
- **Keyword Highlighting**: Automatically highlights CR!T keywords with their assigned colors
- **Toggle Functionality**: Easy on/off toggle in the extension popup
- **Interactive Connections**: Draw connections between selected keywords

## Installation

### For Development
1. Clone or download this repository
2. Open `chrome://extensions/` in your Chrome browser
3. Enable "Developer mode" (top-right corner)
4. Click "Load unpacked"
5. Select the `chrome-extension` folder

### For Chrome Web Store
[Coming soon - link will be available after publication]

## Permissions

- **scripting**: Required to inject CSS and JavaScript into webpages
- **activeTab**: Required to access the currently active tab
- **storage**: Required to remember user preferences

## Files

- `manifest.json` - Extension configuration
- `background.js` - Service worker for background operations
- `content.js` - Content script injected into webpages
- `popup.html` - Extension popup UI
- `popup.js` - Popup functionality
- `keywords.json` - List of CR!T keywords
- `colors.json` - Color mappings for keywords

## Support

For issues or feature requests, please contact the developer.
