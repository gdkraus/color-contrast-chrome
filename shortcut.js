/*

Read license.txt for licensing information.

*/

var shortcutKey = {

  init: function() {
    if (document.body.hasAttribute('screen_capture_injected')) {
      return;
    }
    document.body.setAttribute('screen_capture_injected', true);
    document.body.addEventListener('keydown', shortcutKey.handleShortcut,
      false);
  },

  isThisPlatform: function(operationSystem) {
    return navigator.userAgent.toLowerCase().indexOf(operationSystem) > -1;
  },

  handleShortcut: function (event) {
    var isMac = shortcutKey.isThisPlatform('mac');
    var keyCode = event.keyCode;
    // Send compose key like Ctrl + Alt + alphabetical-key to background.
    if ((event.ctrlKey && event.altKey && !isMac ||
          event.metaKey && event.altKey && isMac) &&
        keyCode > 64 && keyCode < 91) {
      shortcutKey.sendMessage({
        msg: 'capture_hot_key',
        keyCode: keyCode
      });
    }
  },

  sendMessage: function(message) {
    chrome.runtime.sendMessage(message);
  }
};

shortcutKey.init();
