# Sentence Animation Feature for Video Demos

## How to Use

The `animateToSentence()` function allows you to automatically pan the camera to specific entries in the landscape for creating demo videos.

### Basic Usage

Open the browser console (F12) and call:

```javascript
animateToSentence("search text here", 5000, 5000);
```

### Parameters

- **sentenceSearchText** (required): A portion of the sentence to search for. It will match partial text, case-insensitive.
  - Example: `"Aliens in Green"` or `"AiG, established in 2016"`
  
- **panDuration** (optional, default: 5000ms): How long the camera takes to pan to the entry (in milliseconds)
  - For a 5-second pan: `5000`
  
- **holdDuration** (optional, default: 5000ms): How long the camera stays focused on the entry after panning (in milliseconds)
  - For a 5-second hold: `5000`

### Examples

#### Pan to "Aliens in Green" - 5 seconds pan + 5 seconds hold
```javascript
animateToSentence("Aliens in Green", 5000, 5000);
```

#### Pan to an entry - 3 seconds pan + 10 seconds hold
```javascript
animateToSentence("Some text from the entry", 3000, 10000);
```

#### Quick pan with longer hold
```javascript
animateToSentence("Entry description", 2000, 8000);
```

## How It Works

1. **Pan Phase**: Camera smoothly moves from current position to the target entry over `panDuration` milliseconds
2. **Hold Phase**: Camera stays focused on the entry for `holdDuration` milliseconds
3. **Auto-resume**: Orbit controls are automatically re-enabled after the animation completes

## Orbit Controls

- During animation: Disabled (camera is controlled by the animation)
- After animation: Automatically re-enabled so you can manually explore

## Notes

- The function searches for partial text matches (case-insensitive)
- Make sure the text you search for is unique enough to find the right entry
- If the text isn't found, a warning will appear in the console
- You can chain multiple animations by waiting for each to complete before calling the next
