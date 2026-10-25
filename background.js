// DocFit - Background Service Worker

chrome.runtime.onInstalled.addListener(() => {
  console.log('DocFit Extension Installed successfully.');
  // Set default side panel options if sidePanel API is available
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch((err) => {
      console.warn('sidePanel.setPanelBehavior not supported or failed:', err);
    });
  }
});

// Listen for messages from popup to open side panel or full tab
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'OPEN_SIDE_PANEL') {
    if (chrome.sidePanel && chrome.sidePanel.open) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0]) {
          chrome.sidePanel.open({ tabId: tabs[0].id }).then(() => {
            sendResponse({ success: true });
          }).catch((err) => {
            sendResponse({ success: false, error: err.message });
          });
        }
      });
      return true; // Keep message channel open for async response
    }
  } else if (request.action === 'OPEN_NEW_TAB') {
    chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
    sendResponse({ success: true });
  }
});
