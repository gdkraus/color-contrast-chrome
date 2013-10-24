/*

Read license.txt for licensing information.

*/



var bg = chrome.extension.getBackgroundPage();

function $(id) {
  return document.getElementById(id);
}

function isHighVersion() {
  var version = navigator.userAgent.match(/Chrome\/(\d+)/)[1];
  return version > 9;
}

function init() {
  i18nReplace('optionTitle', 'options');
  i18nReplace('saveAndClose', 'save_and_close');
  i18nReplace('WCAGLevel', 'wcag_level');
  
  i18nReplace('WCAG-aa-small-level', 'wcag_aa_small_level');
  i18nReplace('WCAG-aa-large-level', 'wcag_aa_large_level');
  i18nReplace('WCAG-aaa-small-level', 'wcag_aaa_small_level');
  i18nReplace('WCAG-aaa-large-level', 'wcag_aaa_large_level');

  i18nReplace('pixelRadiusHeader', 'pixel_radius_header');
  i18nReplace('pixel-radius-label', 'pixel_radius_label');
  
  $('saveAndClose').addEventListener('click', saveAndClose);
  initScreenCaptureQuality();
  //HotKeySetting.setup();
}

function save() {
	if ($('WCAG-aa-small').checked){
		chrome.storage.sync.set({'contrastLevel': 'WCAG-aa-small'})
	} else if ($('WCAG-aa-large').checked){
		chrome.storage.sync.set({'contrastLevel': 'WCAG-aa-large'})
	} else if ($('WCAG-aaa-small').checked){
		chrome.storage.sync.set({'contrastLevel': 'WCAG-aaa-small'})
	} else if ($('WCAG-aaa-large').checked){
		chrome.storage.sync.set({'contrastLevel': 'WCAG-aaa-large'})
	} else {
		chrome.storage.sync.set({'contrastLevel': 'WCAG-aa-small'})
	}
	var e = document.getElementById("pixel-radius-input");
	var pixelValue = e.options[e.selectedIndex].text;
	chrome.storage.sync.set({'pixelRadius': pixelValue});
	return true;
  //return HotKeySetting.save();
}

function saveAndClose() {
  if (save()) {
    chrome.tabs.getSelected(null, function(tab) {
      chrome.tabs.remove(tab.id);
    });
    }
}

function initScreenCaptureQuality() {
	chrome.storage.sync.get('contrastLevel', function(obj) {
  	if (obj['contrastLevel'] == 'WCAG-aa-small'){
		$('WCAG-aa-small').checked = true;
	} else if (obj['contrastLevel'] == 'WCAG-aa-large'){
		$('WCAG-aa-large').checked = true;
	} else if (obj['contrastLevel'] == 'WCAG-aaa-small'){
		$('WCAG-aaa-small').checked = true;
	} else if (obj['contrastLevel'] == 'WCAG-aaa-large'){
		$('WCAG-aaa-large').checked = true;
	} else {
		$('WCAG-aa-small').checked = true;
	}

	
	});

	chrome.storage.sync.get('pixelRadius', function(obj) {

		var pixelRadius = obj['pixelRadius'];
		if (pixelRadius < 1 || pixelRadius > 3 || typeof pixelRadius == 'undefined'){
			$('pixel-radius-input').value = 1;
		} else {
			$('pixel-radius-input').value = obj['pixelRadius']
		}

	});	
}

function i18nReplace(id, name) {
  return $(id).innerText = chrome.i18n.getMessage(name);
}

const CURRENT_LOCALE = chrome.i18n.getMessage('@@ui_locale');
if (CURRENT_LOCALE != 'zh_CN') {
  UI.addStyleSheet('./i18n_styles/en_options.css');
}

function isWindowsOrLinuxPlatform() {
  return navigator.userAgent.toLowerCase().indexOf('windows') > -1 ||
      navigator.userAgent.toLowerCase().indexOf('linux') > -1;
}

var HotKeySetting = (function() {
  const CHAR_CODE_OF_AT = 64;
  const CHAR_CODE_OF_A = 65;
  const CHAR_CODE_OF_Z = 90;
  var hotKeySelection = null;
  var isWindowsOrLinux = isWindowsOrLinuxPlatform();

  var hotkey = {
    setup: function() {
      hotKeySelection = document.querySelectorAll('#hot-key-setting select');
      // i18n.
      $('area-capture-text').innerText =
        chrome.i18n.getMessage('capture_area');
      $('viewport-capture-text').innerText =
        chrome.i18n.getMessage('capture_window');
      $('full-page-capture-text').innerText =
        chrome.i18n.getMessage('capture_webpage');
      $('screen-capture-text').innerText =
        chrome.i18n.getMessage('capture_screen');

      for (var i = 0; i < hotKeySelection.length; i++) {
        hotKeySelection[i].add(new Option('--', '@'));
        for (var j = CHAR_CODE_OF_A; j <= CHAR_CODE_OF_Z; j++) {
          var value = String.fromCharCode(j);
          var option = new Option(value, value);
          hotKeySelection[i].add(option);
        }
      }

      $('area-capture-hot-key').selectedIndex =
        HotKey.getCharCode('area') - CHAR_CODE_OF_AT;
      $('viewport-capture-hot-key').selectedIndex =
        HotKey.getCharCode('viewport') - CHAR_CODE_OF_AT;
      $('full-page-capture-hot-key').selectedIndex =
        HotKey.getCharCode('fullpage') - CHAR_CODE_OF_AT;
      $('screen-capture-hot-key').selectedIndex =
        HotKey.getCharCode('screen') - CHAR_CODE_OF_AT;

      $('settingShortcut').addEventListener('click', function() {
        hotkey.setState(this.checked);
      }, false);

      hotkey.setState(HotKey.isEnabled());
      if (isWindowsOrLinux) {
        // Capture screen region is not support on Linux and Mac platform.
        $('screen-capture-hot-key-set-wrapper').style.display =
            'inline-block';
      }
    },

    validate: function() {
      var hotKeyLength =
        Array.prototype.filter.call(hotKeySelection,
            function (element) {
              return element.value != '@'
            }
        ).length;
      if (hotKeyLength != 0) {
        var validateMap = {};
        validateMap[hotKeySelection[0].value] = true;
        validateMap[hotKeySelection[1].value] = true;
        validateMap[hotKeySelection[2].value] = true;
        if (isWindowsOrLinux) {
          validateMap[hotKeySelection[3].value] = true;
        } else {
          if (hotKeySelection[3].value != '@')
            hotKeyLength -= 1;
        }

        if (Object.keys(validateMap).length < hotKeyLength) {
          ErrorInfo.show('hot_key_conflict');
          return false;
        }
      }
      ErrorInfo.hide();
      return true;
    },

    save: function() {
      var result = true;
      if ($('settingShortcut').checked) {
        if (this.validate()) {
          HotKey.enable();
          HotKey.set('area', $('area-capture-hot-key').value);
          HotKey.set('viewport', $('viewport-capture-hot-key').value);
          HotKey.set('fullpage', $('full-page-capture-hot-key').value);

          if (isWindowsOrLinux) {
            var screenCaptureHotKey = $('screen-capture-hot-key').value;
            if (bg.plugin.setHotKey(screenCaptureHotKey.charCodeAt(0))) {
              HotKey.set('screen', screenCaptureHotKey);
            } else {
              var i18nKey = 'failed_to_register_hot_key_for_screen_capture';
              ErrorInfo.show(i18nKey);
              this.focusScreenCapture();
              result = false;
            }
          }
        } else {
          result = false;
        }
      } else {
        HotKey.disable(bg);
      }
      return result;
    },

    setState: function(enabled) {
      $('settingShortcut').checked = enabled;
      UI.setStyle($('hot-key-setting'), 'color', enabled ? '' : '#6d6d6d');
      for (var i = 0; i < hotKeySelection.length; i++) {
        hotKeySelection[i].disabled = !enabled;
      }
      ErrorInfo.hide();
    },

    focusScreenCapture: function() {
      $('screen-capture-hot-key').focus();
    }
  };
  return hotkey;
})();

var ErrorInfo = (function() {
  return {
    show: function(msgKey) {
      var infoWrapper = $('error-info');
      var msg = chrome.i18n.getMessage(msgKey);
      infoWrapper.innerText = msg;
      UI.show(infoWrapper);
    },

    hide: function() {
      var infoWrapper = $('error-info');
      if (infoWrapper) {
        UI.hide(infoWrapper);
      }
    }
  };
})();

document.addEventListener('DOMContentLoaded', init);
