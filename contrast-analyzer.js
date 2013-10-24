/*

Read license.txt for licensing information.

*/


function Canvas() {}

function isHighVersion() {
  var version = navigator.userAgent.match(/Chrome\/(\d+)/)[1];
  return version > 9;
}

function $(id) {
  return document.getElementById(id);
}
function i18nReplace(id, messageKey) {
  return $(id).innerHTML = chrome.i18n.getMessage(messageKey);
}

function getCssProperty(elmId, property){
   var elem = document.getElementById(elmId);
   return window.getComputedStyle(elem,null).getPropertyValue(property);
}

function getStyle(element, property) {
    return window.getComputedStyle(element)[property];
  }

function setStyle(element) {
    var argLength = arguments.length;
    var arg1 = arguments[1];
    if (argLength == 2 && arg1.constructor == Object) {
      for (var prop in arg1) {
        var camelCasedProp = prop.replace(/-([a-z])/gi, function(n, letter) {
          return letter.toUpperCase();
        });
        element.style[camelCasedProp] = arg1[prop];
      }
    } else if (argLength == 3)
      element.style[arg1] = arguments[2];
  }

  i18nReplace('WCAG-aa-small', 'wcag_aa_small_level');
  i18nReplace('WCAG-aa-large', 'wcag_aa_large_level');
  i18nReplace('WCAG-aaa-small', 'wcag_aaa_small_level');
  i18nReplace('WCAG-aaa-large', 'wcag_aaa_large_level');

  
$('maskButton').addEventListener('click', function(e) {
    if(getStyle($("contrastMask"), "display") == 'block'){
    	$('contrastMask').style.cssText = 'display:none;';
    	$('maskButton').innerHTML = 'Show Mask';
    } else {
    	$('contrastMask').style.cssText = 'display:block;';
    	$('maskButton').innerHTML = 'Hide Mask';

    }
  });

$('rescanButton').addEventListener('click', function(e) {
	location.reload();
  });

var bg = chrome.extension.getBackgroundPage();
var canvas = new Canvas();

var photoshop = {
  canvas: document.createElement("canvas"),
  tabTitle: '',
  startX: 0,
  startY: 0,
  endX: 0,
  endY: 0,
  dragFlag: false,
  flag: 'rectangle',
  layerId: 'layer0',
  canvasId: '',
  color: '#ff0000',
  highlightColor: '',
  lastValidAction: 0,
  markedArea: [],
  isDraw: true,
  offsetX: 0,
  offsetY: 36,
  nowHeight: 0,
  nowWidth: 0,
  highlightType: 'border',
  highlightMode: 'rectangle',
  text: '',

  i18nReplace: i18nReplace,

  initCanvas: function() {
    $('canvas').width = $('mask-canvas').width = $('photo').style.width =
        photoshop.canvas.width = bg.screenshot.canvas.width;
    $('canvas').height = $('mask-canvas').height = $('photo').style.height =
        photoshop.canvas.height = bg.screenshot.canvas.height;
    var context = photoshop.canvas.getContext('2d');
    context.drawImage(bg.screenshot.canvas, 0, 0);
    context = $('canvas').getContext('2d');
    context.drawImage(photoshop.canvas, 0, 0);
    $('canvas').style.display = 'block';
  },

  init: function() {
    var isMac = bg.screenshot.isThisPlatform('mac');
    if (isMac) {
      
    }
    photoshop.initTools();
    photoshop.initCanvas();
    photoshop.tabTitle = bg.screenshot.tab.title;
    var showBoxHeight = function() {
      $('showBox').style.height = window.innerHeight - photoshop.offsetY - 1;
    }
    setTimeout(showBoxHeight, 50);
  },

  markCurrentElement: function(element) {
    if (element && element.parentNode) {
      var children = element.parentNode.children;
      for (var i = 0; i < children.length; i++) {
        var node = children[i];
        if (node == element) {
          element.className = 'mark';
        } else {
          node.className = '';
        }
      }
    }
  },


  openOptionPage: function() {
    chrome.tabs.create({url: chrome.extension.getURL("options.html")});
  },

  closeCurrentTab: function() {
    chrome.tabs.getSelected(null, function(tab) {
      chrome.tabs.remove(tab.id);
    });
  },

  finish: function() {
    var context = $('canvas').getContext('2d');
    context.drawImage(photoshop.canvas, 0, 0);
  },



  /**
  * Create a layer and set style
  */
  createDiv: function() {
    photoshop.lastValidAction++;
    photoshop.layerId = 'layer' + photoshop.lastValidAction;
    if ($(photoshop.layerId)) {
      photoshop.removeElement(photoshop.layerId);
    }
    var divElement = document.createElement('div');
    divElement.id = photoshop.layerId;
    divElement.className = 'layer';
    $('photo').appendChild(divElement);
    if (photoshop.flag  == 'blur') {
      photoshop.createCanvas(photoshop.layerId);
    }
    return divElement;
  },

  createCanvas: function(parentId) {
    photoshop.canvasId = 'cav-' + parentId;
    if (!$(photoshop.canvasId)) {
      var cav = document.createElement('canvas');
      cav.id = photoshop.canvasId;
      cav.width = 10;
      cav.height = 10;
      $(photoshop.layerId).appendChild(cav);
      return cav;
    }
    return $(photoshop.canvasId);

  },


  removeLayer: function(id) {
    for (var i = 0; i < photoshop.markedArea.length; i++) {
      if (photoshop.markedArea[i].id == id) {
        photoshop.markedArea.splice(i, 1);
        break;
      }
    }
    photoshop.removeElement(id);
  },


  /**
  * Remove a div
  */
  removeElement: function(id) {
    if($(id)) {
      $(id).parentNode.removeChild($(id));
    }
  },


  save: function() {
    photoshop.draw();
    var formatParam  = localStorage.screenshootQuality || 'png';
    var dataUrl;
    if (formatParam == 'jpeg' && isHighVersion())
      dataUrl = $('canvas').toDataURL('image/jpeg', 0.5);
    else
      dataUrl = $('canvas').toDataURL('image/png');

    // Here we use the plugin object in showimage.html 
    // instead of the plugin object in background page, 
    // so that the SaveScreenshot dialog will be a modal dialog.
    var pluginobj = document.getElementById('pluginobj');
    if (!localStorage.lastSavePath)
      localStorage.lastSavePath = localStorage.savePath;
    pluginobj.SaveScreenshot(
        dataUrl, photoshop.tabTitle, localStorage.lastSavePath,
        function(result, path) {
          var message = chrome.i18n.getMessage('save_fail');
          var messageClass = 'tip_failed';
          if (result == 0 && path) {
            var i18nMessage = chrome.i18n.getMessage('saved_to_path');
            message = i18nMessage + '<a title="' + path +
                '" onclick="bg.plugin.openSavePath(\'' +
                path.replace(/\\/g, '/') + '\');">' + path + '</a>';
            messageClass = 'tip_succeed';
            localStorage.lastSavePath = path;
          }
          if (result != 2)
            photoshop.showTip(messageClass, message, 5000);
        },
        chrome.i18n.getMessage("save_image"));
    photoshop.finish();
  },

  copy: function() {
    photoshop.draw();
    var formatParam  = localStorage.screenshootQuality || 'png';
    var dataUrl;
    if (formatParam == 'jpeg' && isHighVersion())
      dataUrl = $('canvas').toDataURL('image/jpeg', 0.5);
    else
      dataUrl = $('canvas').toDataURL('image/png');
    var copyFlag = bg.plugin.saveToClipboard(dataUrl);
    var messageKey = 'tip_copy_failed';
    var messageClass = 'tip_failed';
    if (copyFlag) {
      messageKey = 'tip_copy_succeed';
      messageClass = 'tip_succeed';
    }
    var message = chrome.i18n.getMessage(messageKey);
    photoshop.showTip(messageClass, message);
    photoshop.finish();
  },
  
  printImage: function() {
    photoshop.draw();
    var formatParam  = localStorage.screenshootQuality || 'png';
    var dataUrl;
    if (formatParam == 'jpeg' && isHighVersion())
      dataUrl = $('canvas').toDataURL('image/jpeg', 0.5);
    else
      dataUrl = $('canvas').toDataURL('image/png');
    var width = $('canvas').width;
    var height = $('canvas').height;
    var pluginobj = document.getElementById('pluginobj');
    pluginobj.PrintImage(dataUrl, photoshop.tabTitle, width, height);
    photoshop.finish();
  },

  drawLineOnMaskCanvas: function(startX, startY, endX, endY, type, layerId) {
    var ctx = $('mask-canvas').getContext('2d');
    ctx.clearRect(0, 0, $('mask-canvas').width, $('mask-canvas').height);
    if (type == 'drawEnd') {
      var offset = 20;
      var width = Math.abs(endX - photoshop.startX) > 0 ?
          Math.abs(endX - photoshop.startX): 0;
      var height = Math.abs(endY - photoshop.startY) > 0 ?
          Math.abs(endY - photoshop.startY): 0;
      var offsetLeft = parseInt($(layerId).style.left);
      var offsetTop = parseInt($(layerId).style.top);
      startX = startX - offsetLeft + offset / 2;
      startY = startY - offsetTop + offset / 2;
      endX = endX - offsetLeft + offset / 2;
      endY = endY - offsetTop + offset / 2;
      $(layerId).style.left = offsetLeft - offset / 2;
      $(layerId).style.top = offsetTop - offset / 2;
      var cavCopy = photoshop.createCanvas(layerId);
      cavCopy.width = width + offset;
      cavCopy.height = height + offset;
      ctx = cavCopy.getContext('2d');
    }
    if (localStorage.lineType == 'line') {
      canvas.drawLine(ctx, localStorage.lineColor, 'round', 2,
        startX, startY, endX, endY);
    } else {
      canvas.drawArrow(ctx, localStorage.lineColor, 2, 4, 10, 'round',
          startX, startY, endX, endY)
    }

  },

  createColorPadStr: function(element, type) {
    var colorList = ['#000000', '#0036ff', '#008000', '#dacb23', '#d56400',
      '#c70000', '#be00b3', '#1e2188', '#0090ff', '#22cc01', '#ffff00',
      '#ff9600', '#ff0000', '#ff008e', '#7072c3', '#49d2ff', '#9dff3d',
      '#ffffff', '#ffbb59', '#ff6b6b', '#ff6bbd'];

    var div = document.createElement("div");
    div.id = "colorpad";
    element.appendChild(div);
  
    for(var i = 0; i < colorList.length; i++) {
      var a = document.createElement("a");
      var color = colorList[i];
      a.id = color;
      a.title = color;
      a.style.backgroundColor = color;
      if (color == '#ffffff') {
        a.style.border = "1px solid #444";
        a.style.width = "12px"
        a.style.height = "12px";
      }
      a.addEventListener('click', function(e) {
        photoshop.colorPadPick(e.target.id, type);
        return false;
      });
      div.appendChild(a);
    }
  },


  setHighlightColorBoxStyle: function(color) {
    var highlightColorBox = $('highlightColorBox');
    highlightColorBox.style.borderColor = color;
    localStorage.highlightType = localStorage.highlightType || 'border';
    if (localStorage.highlightType == 'border') {
      highlightColorBox.style.background = '#ffffff';
      highlightColorBox.style.opacity = 1;
      $('borderMode').className = 'mark';
      $('rectMode').className = '';
    } else if (localStorage.highlightType == 'rect') {
      highlightColorBox.style.background = color;
      highlightColorBox.style.opacity = 0.5;
      $('borderMode').className = '';
      $('rectMode').className = 'mark';
    }
    if (photoshop.flag == 'rectangle') {
      highlightColorBox.style.borderRadius = '0 0';
    } else if (photoshop.flag == 'radiusRectangle') {
      highlightColorBox.style.borderRadius = '3px 3px';
    } else if (photoshop.flag == 'ellipse') {
      highlightColorBox.style.borderRadius = '12px 12px';
    }
    photoshop.markCurrentElement($(photoshop.flag));
  },

  setBlackoutColorBoxStyle: function() {
    localStorage.blackoutType = localStorage.blackoutType || 'redact';
    if (localStorage.blackoutType == 'redact') {
      $('blackoutBox').className = 'rectBox';
      $('redact').className = 'mark';
      $('blur').className = '';
    } else if (localStorage.blackoutType == 'blur') {
      $('blackoutBox').className = 'blurBox';
      $('redact').className = '';
      $('blur').className = 'mark';
    }
  },

  setFontSize: function(size) {
    var id = 'size_' + size;
    localStorage.fontSize = size;
    $('size_10').className = '';
    $('size_16').className = '';
    $('size_18').className = '';
    $('size_32').className = '';
    $(id).className = 'mark';
  },

  setLineColorBoxStyle: function() {
    localStorage.lineType = localStorage.lineType || 'line';
    photoshop.color = localStorage.lineColor =
        localStorage.lineColor || '#FF0000';
    var ctx = $('lineIconCav').getContext('2d');
    ctx.clearRect(0, 0, 14, 14);
    if (localStorage.lineType == 'line') {
      $('straightLine').className = 'mark';
      $('arrow').className = '';
      canvas.drawLine(ctx, photoshop.color, 'round', 2, 1, 13, 13, 1);
    } else if (localStorage.lineType == 'arrow') {
      $('straightLine').className = '';
      $('arrow').className = 'mark';
      canvas.drawArrow(ctx, photoshop.color, 2, 4, 7, 'round',1, 13, 13, 1);
    }

  },

  initTools: function() {
   
    var fontSize = localStorage.fontSize = localStorage.fontSize || 16;
    if (fontSize != 10 && fontSize != 16 && fontSize != 18 && fontSize != 32) {
      localStorage.fontSize = 16;
    }
    localStorage.highlightMode = photoshop.flag =
        localStorage.highlightMode || 'rectangle';
    localStorage.highlightColor = localStorage.highlightColor || '#FF0000';
    localStorage.fontColor = localStorage.fontColor || '#FF0000';
    localStorage.highlightType = photoshop.highlightType =
        localStorage.highlightType || 'border';
    localStorage.blackoutType = localStorage.blackoutType || 'redact';
    localStorage.lineType = localStorage.lineType || 'line';
    localStorage.lineColor = localStorage.lineColor || '#FF0000';
    

   
  },

  drawEllipseOnMaskCanvas: function(endX, endY, type, layerId) {
    var ctx = $('mask-canvas').getContext('2d');
    ctx.clearRect(0, 0, $('mask-canvas').width, $('mask-canvas').height);
    var x = (photoshop.startX + endX) / 2;
    var y = (photoshop.startY + endY) / 2;
    var xAxis = Math.abs(endX - photoshop.startX) / 2;
    var yAxis = Math.abs(endY - photoshop.startY) / 2;
    canvas.drawEllipse(ctx, photoshop.color, x, y, xAxis, yAxis, 3,
        photoshop.highlightType);
    if (type == 'end') {
      var offsetLeft = parseInt($(layerId).style.left);
      var offsetTop = parseInt($(layerId).style.top);
      var startX = photoshop.startX - offsetLeft ;
      var startY = photoshop.startY - offsetTop ;
      var newEndX = photoshop.endX - offsetLeft ;
      var newEndY = photoshop.endY - offsetTop ;
      x = (startX + newEndX) / 2;
      y = (startY + newEndY) / 2;
      xAxis = Math.abs(newEndX - startX) / 2;
      yAxis = Math.abs(newEndY - startY) / 2;
      var cavCopy = photoshop.createCanvas(layerId);
      cavCopy.width = Math.abs(endX - photoshop.startX);
      cavCopy.height = Math.abs(endY - photoshop.startY);
      var ctxCopy = cavCopy.getContext('2d');
      canvas.drawEllipse(ctxCopy, photoshop.color, x, y,
          xAxis, yAxis, 3, photoshop.highlightType);
      ctx.clearRect(0, 0, $('mask-canvas').width, $('mask-canvas').height);
    }
  },

  showTip: function(className, message, delay) {
    delay = delay || 2000;
    var div = document.createElement('div');
    div.className = className;
    div.innerHTML = message;
    document.body.appendChild(div);
    div.style.left = (document.body.clientWidth - div.clientWidth) / 2 + 'px';
    window.setTimeout(function() {
      document.body.removeChild(div);
    }, delay);
  }
};

photoshop.init();
$('photo').addEventListener('mousemove', photoshop.onMouseMove, true);
$('photo').addEventListener('mousedown', photoshop.onMouseDown, true);
$('photo').addEventListener('mouseup', photoshop.onMouseUp, true);
document.addEventListener('mouseup', photoshop.onMouseUp, true);
document.addEventListener('mousemove', photoshop.onMouseMove, true);

$('canvas').addEventListener(
    'selectstart', function f(e) { return false });
$('mask-canvas').addEventListener(
    'selectstart', function f(e) { return false });

enableMaskButton(false);

// Control more tools list showing and hiding.
(function() {
  const HIDE_MORE_TOOLS_DELAY = 200;
  var timer;
  var moreBtn = $('btnMore');
  var moreToolsList = $('more-tools');
  var printBtn = $('btnPrint');
  var isMac = bg.screenshot.isThisPlatform('mac');
  var isLinux = bg.screenshot.isThisPlatform('linux');
})();

var myVars = new Array();
myVars[0] = "contrastLevel";
myVars[1] = "pixelRadius";

chrome.storage.sync.get(myVars, function (obj) {
    if (obj['contrastLevel'] == 'WCAG-aa-small') {
		$('levelEvaluated-options').selectedIndex = 0;
    } else if (obj['contrastLevel'] == 'WCAG-aa-large') {
        $('levelEvaluated-options').selectedIndex = 1;
    } else if (obj['contrastLevel'] == 'WCAG-aaa-small') {
        $('levelEvaluated-options').selectedIndex = 2;
    } else if (obj['contrastLevel'] == 'WCAG-aaa-large') {
        $('levelEvaluated-options').selectedIndex = 3;
    } else {
    	$('levelEvaluated-options').selectedIndex = 0;
    }
    
    radius = obj['pixelRadius'];
    if(radius < 1 || radius > 3 || typeof radius == 'undefined') {
    	$('pixelRadius-options').selectedIndex = 0;
    } else {
    	$('pixelRadius-options').selectedIndex = radius-1;
    }
  });

$('levelEvaluated-options').addEventListener('change', function(e) {
    saveOptions();
  });

$('pixelRadius-options').addEventListener('change', function(e) {
    saveOptions();
  });

function saveOptions() {

	var e1 = document.getElementById("levelEvaluated-options");
	var WCAGLevel = e1.options[e1.selectedIndex].id;
	chrome.storage.sync.set({'contrastLevel': WCAGLevel});


	var e2 = document.getElementById("pixelRadius-options");
	var pixelValue = e2.options[e2.selectedIndex].text;
	chrome.storage.sync.set({'pixelRadius': pixelValue});
	return true;
  //return HotKeySetting.save();
}

function enableMaskButton(v) {
	if(v){
		$('maskButton').removeAttribute('disabled');
	} else {
		$('maskButton').setAttribute('disabled');	
	}
} 
