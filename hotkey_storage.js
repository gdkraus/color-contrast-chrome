/*

Read license.txt for licensing information.

*/

var HotKey = (function() {
  return {
    setup: function(plugin) {
      // Default enable hot key for capture.
      if (!localStorage.getItem('hot_key_enabled'))
        localStorage.setItem('hot_key_enabled', true);

      // Set default hot key of capture, R V H P.
      if (!this.get('area'))
        this.set('area', 'R');
      if (!this.get('viewport'))
        this.set('viewport', 'V');
      if (!this.get('fullpage'))
        this.set('fullpage', 'H');
      if (!this.get('screen'))
        this.set('screen', 'P');

      var screenCaptureHotKey = this.get('screen');
      if (this.isEnabled() &&
          !plugin.setHotKey(screenCaptureHotKey.charCodeAt(0))) {
        this.set('screen', '@'); // Disable hot key for screen capture.
      }
    },

    /**
     * Set hot key by type.
     * @param {String} type Hot key type, must be area/viewport/fullpage/screen.
     * @param {String} value
     */
    set: function(type, value) {
      var key = type + '_capture_hot_key';
      localStorage.setItem(key, value);
    },

    get: function(type) {
      return localStorage.getItem(type + '_capture_hot_key');
    },

    getCharCode: function(type) {
      return this.get(type).charCodeAt(0);
    },

    enable: function() {
      localStorage.setItem('hot_key_enabled', true);
    },

    disable: function(bg) {
      localStorage.setItem('hot_key_enabled', false);
      bg.plugin.disableScreenCaptureHotKey();
    },

    isEnabled: function() {
      return localStorage.getItem('hot_key_enabled') == 'true';
    }
  }
})();
