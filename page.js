/*

Read license.txt for licensing information.

*/


var page = {
  startX: 150,
  startY: 150,
  endX: 400,
  endY: 300,
  moveX: 0,
  moveY: 0,
  pageWidth: 0,
  pageHeight: 0,
  visibleWidth: 0,
  visibleHeight: 0,
  dragging: false,
  moving: false,
  resizing: false,
  isMouseDown: false,
  scrollXCount: 0,
  scrollYCount: 0,
  scrollX: 0,
  scrollY: 0,
  captureWidth: 0,
  captureHeight: 0,
  isSelectionAreaTurnOn: false,
  fixedElements_ : [],
  marginTop: 0,
  marginLeft: 0,
  modifiedBottomRightFixedElements: [],
  originalViewPortWidth: document.documentElement.clientWidth,
  defaultScrollBarWidth: 17, // Default scroll bar width on windows platform.

  hookBodyScrollValue: function(needHook) {
    document.documentElement.setAttribute(
        "__screen_capture_need_hook_scroll_value__", needHook);
    var event = document.createEvent('Event');
    event.initEvent('__screen_capture_check_hook_status_event__', true, true);
    document.documentElement.dispatchEvent(event);
  },

  /**
   * Determine if the page scrolled to bottom or right.
   */
  isScrollToPageEnd: function(coordinate) {
    var body = document.body;
    var docElement = document.documentElement;
    if (coordinate == 'x')
      return docElement.clientWidth + body.scrollLeft == body.scrollWidth;
    else if (coordinate == 'y')
      return docElement.clientHeight + body.scrollTop == body.scrollHeight;
  },

  /**
   * Detect if the view port is located to the corner of page.
   */
  detectPagePosition: function() {
    var body = document.body;
    var pageScrollTop = body.scrollTop;
    var pageScrollLeft = body.scrollLeft;
    if (pageScrollTop == 0 && pageScrollLeft == 0) {
      return 'top_left';
    } else if (pageScrollTop == 0 && this.isScrollToPageEnd('x')) {
      return 'top_right';
    } else if (this.isScrollToPageEnd('y') && pageScrollLeft == 0) {
      return 'bottom_left';
    } else if (this.isScrollToPageEnd('y') && this.isScrollToPageEnd('x')) {
      return 'bottom_right';
    }
    return null;
  },

  /**
   * Detect fixed-positioned element's position in the view port.
   * @param {Element} elem
   * @return {String|Object} Return position of the element in the view port:
   *   top_left, top_right, bottom_left, bottom_right, or null.
   */
  detectCapturePositionOfFixedElement: function(elem) {
    var docElement = document.documentElement;
    var viewPortWidth = docElement.clientWidth;
    var viewPortHeight = docElement.clientHeight;
    var offsetWidth = elem.offsetWidth;
    var offsetHeight = elem.offsetHeight;
    var offsetTop = elem.offsetTop;
    var offsetLeft = elem.offsetLeft;
    var result = [];

    // Compare distance between element and the edge of view port to determine
    // the capture position of element.
    if (offsetTop <= viewPortHeight - offsetTop - offsetHeight) {
      result.push('top');
    } else if (offsetTop < viewPortHeight) {
      result.push('bottom');
    }
    if (offsetLeft <= viewPortWidth - offsetLeft - offsetWidth) {
      result.push('left');
    } else if (offsetLeft < viewPortWidth) {
      result.push('right');
    }

    // If the element is out of view port, then ignore.
    if (result.length != 2)
      return null;
    return result.join('_');
  },

  restoreFixedElements: function() {
    this.fixedElements_.forEach(function(element) {
      element[1].style.visibility = 'visible';
    });
    this.fixedElements_ = [];
  },

  /**
   * Iterate DOM tree and cache visible fixed-position elements.
   */
  cacheVisibleFixedPositionedElements: function() {
    var nodeIterator = document.createNodeIterator(
        document.documentElement,
        NodeFilter.SHOW_ELEMENT,
        null,
        false
    );
    var currentNode;
    while (currentNode = nodeIterator.nextNode()) {
      var nodeComputedStyle =
          document.defaultView.getComputedStyle(currentNode, "");
      // Skip nodes which don't have computeStyle or are invisible.
      if (!nodeComputedStyle)
        continue;
      if (nodeComputedStyle.position == "fixed" &&
          nodeComputedStyle.display != 'none' &&
          nodeComputedStyle.visibility != 'hidden') {
        var position =
          this.detectCapturePositionOfFixedElement(currentNode);
        if (position)
          this.fixedElements_.push([position, currentNode]);
      }
    }
  },

  // Handle fixed-position elements for capture.
  handleFixedElements: function(capturePosition) {
    var docElement = document.documentElement;
    var body = document.body;

    // If page has no scroll bar, then return directly.
    if (docElement.clientHeight == body.scrollHeight &&
        docElement.clientWidth == body.scrollWidth)
      return;
    
    if (!this.fixedElements_.length) {
      this.cacheVisibleFixedPositionedElements();
    }

    this.fixedElements_.forEach(function(element) {
      if (element[0] == capturePosition)
        element[1].style.visibility = 'visible';
      else
        element[1].style.visibility = 'hidden';
    });
  },

  handleSecondToLastCapture: function() {
    var docElement = document.documentElement;
    var body = document.body;
    var bottomPositionElements = [];
    var rightPositionElements = [];
    var that = this;
    this.fixedElements_.forEach(function(element) {
      var position = element[0];
      if (position == 'bottom_left' || position == 'bottom_right') {
        bottomPositionElements.push(element[1]);
      } else if (position == 'bottom_right' || position == 'top_right') {
        rightPositionElements.push(element[1]);
      }
    });

    // Determine if the current capture is last but one.
    var remainingCaptureHeight = body.scrollHeight - docElement.clientHeight -
      body.scrollTop;
    if (remainingCaptureHeight > 0 &&
        remainingCaptureHeight < docElement.clientHeight) {
      bottomPositionElements.forEach(function(element) {
        if (element.offsetHeight > remainingCaptureHeight) {
          element.style.visibility = 'visible';
          var originalBottom = window.getComputedStyle(element).bottom;
          that.modifiedBottomRightFixedElements.push(
            ['bottom', element, originalBottom]);
          element.style.bottom = -remainingCaptureHeight + 'px';
        }
      });
    }

    var remainingCaptureWidth = body.scrollWidth - docElement.clientWidth -
      body.scrollLeft;
    if (remainingCaptureWidth > 0 &&
        remainingCaptureWidth < docElement.clientWidth) {
      rightPositionElements.forEach(function(element) {
        if (element.offsetWidth > remainingCaptureWidth) {
          element.style.visibility = 'visible';
          var originalRight = window.getComputedStyle(element).right;
          that.modifiedBottomRightFixedElements.push(
            ['right', element, originalRight]);
          element.style.right = -remainingCaptureWidth + 'px';
        }
      });
    }
  },

  restoreBottomRightOfFixedPositionElements: function() {
    this.modifiedBottomRightFixedElements.forEach(function(data) {
      var property = data[0];
      var element = data[1];
      var originalValue = data[2];
      element.style[property] = originalValue;
    });
    this.modifiedBottomRightFixedElements = [];
  },
  
  hideAllFixedPositionedElements: function() {
    this.fixedElements_.forEach(function(element) {
      element[1].style.visibility = 'hidden';
    });
  },

  hasScrollBar: function(axis) {
    var body = document.body;
    var docElement = document.documentElement;
    if (axis == 'x') {
      if (window.getComputedStyle(body).overflowX == 'scroll')
        return true;
      return Math.abs(body.scrollWidth - docElement.clientWidth) >=
          page.defaultScrollBarWidth;
    } else if (axis == 'y') {
      if (window.getComputedStyle(body).overflowY == 'scroll')
        return true;
      return Math.abs(body.scrollHeight - docElement.clientHeight) >=
          page.defaultScrollBarWidth;
    }
  },

  getOriginalViewPortWidth: function() {
    chrome.runtime.sendMessage({ msg: 'original_view_port_width'},
      function(originalViewPortWidth) {
        if (originalViewPortWidth) {
          page.originalViewPortWidth = page.hasScrollBar('y') ?
            originalViewPortWidth - page.defaultScrollBarWidth : originalViewPortWidth;
        } else {
          page.originalViewPortWidth = document.documentElement.clientWidth;
        }
      });
  },
  
  calculateSizeAfterZooming: function(originalSize) {
    var originalViewPortWidth = page.originalViewPortWidth;
    var currentViewPortWidth = document.documentElement.clientWidth;
    if (originalViewPortWidth == currentViewPortWidth)
      return originalSize;
    return Math.round(
        originalViewPortWidth * originalSize / currentViewPortWidth);
  },

  getZoomLevel: function() {
    return page.originalViewPortWidth / document.documentElement.clientWidth;
  },

  handleRightFloatBoxInGmail: function() {
    var mainframe = document.getElementById('canvas_frame');
    var boxContainer = document.querySelector('body > .dw');
    var fBody = mainframe.contentDocument.body;
    if (fBody.clientHeight + fBody.scrollTop == fBody.scrollHeight) {
      boxContainer.style.display = 'block';
    } else {
      boxContainer.style.display = 'none';
    }
  },

  getViewPortSize: function() {
    var result = {
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight
    };

    if (document.compatMode == 'BackCompat') {
      result.width = document.body.clientWidth;
      result.height = document.body.clientHeight;
    }

    return result;
  },

  /**
   * Check if the page is only made of invisible embed elements.
   */
  checkPageIsOnlyEmbedElement: function() {
    var bodyNode = document.body.children;
    var isOnlyEmbed = false;
    for (var i = 0; i < bodyNode.length; i++) {
      var tagName = bodyNode[i].tagName;
      if (tagName == 'OBJECT' || tagName == 'EMBED' || tagName == 'VIDEO' ||
          tagName == 'SCRIPT' || tagName == 'LINK') {
        isOnlyEmbed = true;
      } else if (bodyNode[i].style.display != 'none'){
        isOnlyEmbed = false;
        break;
      }
    }
    return isOnlyEmbed;
  },

  isGMailPage: function(){
    var hostName = window.location.hostname;
    if (hostName == 'mail.google.com' &&
        document.getElementById('canvas_frame')) {
      return true;
    }
    return false;
  },

  /**
  * Receive messages from background page, and then decide what to do next
  */
  addMessageListener: function() {
    chrome.runtime.onMessage.addListener(function(request, sender, response) {
      if (page.isSelectionAreaTurnOn) {
        page.removeSelectionArea();
      }
      switch (request.msg) {
        case 'capture_window': response(page.getWindowSize()); return true;break;
        case 'show_selection_area': page.showSelectionArea(); return true;break;
        case 'scroll_init': // Capture whole page.
          response(page.scrollInit(0, 0, document.body.scrollWidth,
              document.body.scrollHeight, 'captureWhole'));
          return true;
          break;
        case 'scroll_next':
          page.visibleWidth = request.visibleWidth;
          page.visibleHeight = request.visibleHeight;
          response(page.scrollNext());
          return true;
          break;
        case 'capture_selected':
          response(page.scrollInit(
              page.startX, page.startY,
              page.calculateSizeAfterZooming(page.endX - page.startX),
              page.calculateSizeAfterZooming(page.endY - page.startY),
              'captureSelected'));
          //return true;
          break;
      }
      return true;
    });
  },

  /**
  * Send Message to background page
  */
  sendMessage: function(message) {
    chrome.runtime.sendMessage(message);
  },

  /**
  * Initialize scrollbar position, and get the data browser
  */
  scrollInit: function(startX, startY, canvasWidth, canvasHeight, type) {
    this.hookBodyScrollValue(true);
    page.captureHeight = canvasHeight;
    page.captureWidth = canvasWidth;
    var docWidth = document.body.scrollWidth;
    var docHeight = document.body.scrollHeight;
    window.scrollTo(startX, startY);

    this.handleFixedElements('top_left');
    this.handleSecondToLastCapture();

    if (page.isGMailPage() && type == 'captureWhole') {
      var frame = document.getElementById('canvas_frame');
      docHeight = page.captureHeight = canvasHeight =
          frame.contentDocument.height;
      docWidth = page.captureWidth = canvasWidth = frame.contentDocument.width;
      frame.contentDocument.body.scrollTop = 0;
      frame.contentDocument.body.scrollLeft = 0;
      page.handleRightFloatBoxInGmail();
    }
    page.scrollXCount = 0;
    page.scrollYCount = 1;
    page.scrollX = window.scrollX; // document.body.scrollLeft
    page.scrollY = window.scrollY;
    var viewPortSize = page.getViewPortSize();
    return {
      'msg': 'scroll_init_done',
      'startX': page.calculateSizeAfterZooming(startX),
      'startY': page.calculateSizeAfterZooming(startY),
      'scrollX': window.scrollX,
      'scrollY': window.scrollY,
      'docHeight': docHeight,
      'docWidth': docWidth,
      'visibleWidth': viewPortSize.width,
      'visibleHeight': viewPortSize.height,
      'canvasWidth': canvasWidth,
      'canvasHeight': canvasHeight,
      'scrollXCount': 0,
      'scrollYCount': 0,
      'zoom': page.getZoomLevel()
    };
  },

  /**
  * Calculate the next position of the scrollbar
  */
  scrollNext: function() {
    if (page.scrollYCount * page.visibleWidth >= page.captureWidth) {
      page.scrollXCount++;
      page.scrollYCount = 0;
    }
    if (page.scrollXCount * page.visibleHeight < page.captureHeight) {
      this.restoreBottomRightOfFixedPositionElements();
      var viewPortSize = page.getViewPortSize();
      window.scrollTo(
          page.scrollYCount * viewPortSize.width + page.scrollX,
          page.scrollXCount * viewPortSize.height + page.scrollY);

      var pagePosition = this.detectPagePosition();
      if (pagePosition) {
        this.handleFixedElements(pagePosition);
      } else {
        this.hideAllFixedPositionedElements();
      }
      this.handleSecondToLastCapture();

      if (page.isGMailPage()) {
        var frame = document.getElementById('canvas_frame');
        frame.contentDocument.body.scrollLeft =
            page.scrollYCount * viewPortSize.width;
        frame.contentDocument.body.scrollTop =
            page.scrollXCount * viewPortSize.height;
        page.handleRightFloatBoxInGmail();
      }
      var x = page.scrollXCount;
      var y = page.scrollYCount;
      page.scrollYCount++;
      return { msg: 'scroll_next_done',scrollXCount: x, scrollYCount: y };
    }  else {
      window.scrollTo(page.startX, page.startY);
      this.restoreFixedElements();
      this.hookBodyScrollValue(false);
      return {'msg': 'scroll_finished'};
    }
  },

  /**
  * Show the selection Area
  */
  showSelectionArea: function() {
    page.createFloatLayer();
    setTimeout(page.createSelectionArea, 100);
  },

  getWindowSize: function() {
    var docWidth = document.width;
    var docHeight = document.height;
    if (page.isGMailPage()) {
      var frame = document.getElementById('canvas_frame');
      docHeight = frame.contentDocument.height;
      docWidth = frame.contentDocument.width;
    }
    return {'msg':'capture_window',
            'docWidth': docWidth,
            'docHeight': docHeight};
  },

  getSelectionSize: function() {
    page.removeSelectionArea();
    setTimeout(function() {
      page.sendMessage({
        'msg': 'capture_selected',
        'x': page.startX,
        'y': page.startY,
        'width': page.endX - page.startX,
        'height': page.endY - page.startY,
        'visibleWidth': document.documentElement.clientWidth,
        'visibleHeight': document.documentElement.clientHeight,
        'docWidth': document.width,
        'docHeight': document.height
      })}, 100);
  },

  /**
  * Create a float layer on the webpage
  */
  createFloatLayer: function() {
    page.createDiv(document.body, 'sc_drag_area_protector');
  },
  
  matchMarginValue: function(str) {
    return str.match(/\d+/);
  },

  /**
  * Load the screenshot area interface
  */
  createSelectionArea: function() {
    var areaProtector = $('sc_drag_area_protector');
    var zoom = page.getZoomLevel();
    var bodyStyle = window.getComputedStyle(document.body, null);
    if ('relative' == bodyStyle['position']) {
      page.marginTop = page.matchMarginValue(bodyStyle['marginTop']);
      page.marginLeft = page.matchMarginValue(bodyStyle['marginLeft']);
      areaProtector.style.top =  - parseInt(page.marginTop) + 'px';
      areaProtector.style.left =  - parseInt(page.marginLeft) + 'px';
    }
    areaProtector.style.width =
      Math.round((document.width + parseInt(page.marginLeft)) / zoom) + 'px';
    areaProtector.style.height =
      Math.round((document.height + parseInt(page.marginTop)) / zoom) + 'px';
    areaProtector.onclick = function() {
      event.stopPropagation();
      return false;
    };

    // Create elements for area capture.
    page.createDiv(areaProtector, 'sc_drag_shadow_top');
    page.createDiv(areaProtector, 'sc_drag_shadow_bottom');
    page.createDiv(areaProtector, 'sc_drag_shadow_left');
    page.createDiv(areaProtector, 'sc_drag_shadow_right');

    var areaElement = page.createDiv(areaProtector, 'sc_drag_area');
    page.createDiv(areaElement, 'sc_drag_container');
    page.createDiv(areaElement, 'sc_drag_size');

    // Add event listener for 'cancel' and 'capture' button.
    var cancel = page.createDiv(areaElement, 'sc_drag_cancel');
    cancel.addEventListener('mousedown', function () {
      // Remove area capture containers and event listeners.
      page.removeSelectionArea();
    }, true);
    cancel.innerHTML = chrome.i18n.getMessage("cancel");

    var crop = page.createDiv(areaElement, 'sc_drag_crop');
    crop.addEventListener('mousedown', function() {
      page.removeSelectionArea();
      page.sendMessage({msg: 'capture_selected'});
    }, false);
    crop.innerHTML = chrome.i18n.getMessage('ok');

    page.createDiv(areaElement, 'sc_drag_north_west');
    page.createDiv(areaElement, 'sc_drag_north_east');
    page.createDiv(areaElement, 'sc_drag_south_east');
    page.createDiv(areaElement, 'sc_drag_south_west');

    areaProtector.addEventListener('mousedown', page.onMouseDown, false);
    document.addEventListener('mousemove', page.onMouseMove, false);
    document.addEventListener('mouseup', page.onMouseUp, false);
    $('sc_drag_container').addEventListener('dblclick', function() {
      page.removeSelectionArea();
      page.sendMessage({msg: 'capture_selected'});
    }, false);

    page.pageHeight = $('sc_drag_area_protector').clientHeight;
    page.pageWidth = $('sc_drag_area_protector').clientWidth;

    var areaElement = $('sc_drag_area');
    areaElement.style.left = page.getElementLeft(areaElement) + 'px';
    areaElement.style.top = page.getElementTop(areaElement) + 'px';
    
    page.startX = page.getElementLeft(areaElement);
    page.startY = page.getElementTop(areaElement); 
    page.endX = page.getElementLeft(areaElement) + 250;
    page.endY = page.getElementTop(areaElement) + 150;
    
    areaElement.style.width = '250px';
    areaElement.style.height = '150px';
    page.isSelectionAreaTurnOn = true;
    page.updateShadow(areaElement);
    page.updateSize();
  },
  
  getElementLeft: function(obj) {
    return (document.body.scrollLeft +
        (document.documentElement.clientWidth - 
        obj.offsetWidth) / 2);
  },
  
  getElementTop: function(obj) {
    return (document.body.scrollTop + 
        (document.documentElement.clientHeight - 200 - 
        obj.offsetHeight) / 2);
  },

  /**
  * Init selection area due to the position of the mouse when mouse down
  */
  onMouseDown: function() {
    if (event.button != 2) {
      var element = event.target;

      if (element) {
        var elementName = element.tagName;
        if (elementName && document) {
          page.isMouseDown = true;

          var areaElement = $('sc_drag_area');
          var xPosition = event.pageX;
          var yPosition = event.pageY;

          if (areaElement) {
            if (element == $('sc_drag_container')) {
              page.moving = true;
              page.moveX = xPosition - areaElement.offsetLeft;
              page.moveY = yPosition - areaElement.offsetTop;
            } else if (element == $('sc_drag_north_east')) {
              page.resizing = true;
              page.startX = areaElement.offsetLeft;
              page.startY = areaElement.offsetTop + areaElement.clientHeight;
            } else if (element == $('sc_drag_north_west')) {
              page.resizing = true;
              page.startX = areaElement.offsetLeft + areaElement.clientWidth;
              page.startY = areaElement.offsetTop + areaElement.clientHeight;
            } else if (element == $('sc_drag_south_east')) {
              page.resizing = true;
              page.startX = areaElement.offsetLeft;
              page.startY = areaElement.offsetTop;
            } else if (element == $('sc_drag_south_west')) {
              page.resizing = true;
              page.startX = areaElement.offsetLeft + areaElement.clientWidth;
              page.startY = areaElement.offsetTop;
            } else {
              page.dragging = true;
              page.endX = 0;
              page.endY = 0;
              page.endX = page.startX = xPosition;
              page.endY = page.startY = yPosition;
            }
          }
          event.preventDefault();
        }
      }
    }
  },

  /**
  * Change selection area position when mouse moved
  */
  onMouseMove: function() {
    var element = event.target;
    if (element && page.isMouseDown) {
      var areaElement = $('sc_drag_area');
      if (areaElement) {
        var xPosition = event.pageX;
        var yPosition = event.pageY;
        if (page.dragging || page.resizing) {
          var width = 0;
          var height = 0;
          var zoom = page.getZoomLevel();
          var viewWidth = Math.round(document.width / zoom);
          var viewHeight = Math.round(document.height / zoom);
          if (xPosition > viewWidth) {
            xPosition = viewWidth;
          } else if (xPosition < 0) {
            xPosition = 0;
          }
          if (yPosition > viewHeight) {
            yPosition = viewHeight;
          } else if (yPosition < 0) {
            yPosition = 0;
          }
          page.endX = xPosition;
          page.endY = yPosition;
          if (page.startX > page.endX) {
            width = page.startX - page.endX;
            areaElement.style.left = xPosition + 'px';
          } else {
            width = page.endX - page.startX;
            areaElement.style.left = page.startX + 'px';
          }
          if (page.startY > page.endY) {
            height = page.startY - page.endY;
            areaElement.style.top = page.endY + 'px';
          } else {
            height = page.endY - page.startY;
            areaElement.style.top = page.startY + 'px';
          }
          areaElement.style.height = height + 'px';
          areaElement.style.width  = width + 'px';
          if (window.innerWidth < xPosition) {
            document.body.scrollLeft = xPosition - window.innerWidth;
          }
          if (document.body.scrollTop + window.innerHeight < yPosition + 25) {
            document.body.scrollTop = yPosition - window.innerHeight + 25;
          }
          if (yPosition < document.body.scrollTop) {
            document.body.scrollTop -= 25;
          }
        } else if (page.moving) {
          var newXPosition = xPosition - page.moveX;
          var newYPosition = yPosition - page.moveY;
          if (newXPosition < 0) {
            newXPosition = 0;
          } else if (newXPosition + areaElement.clientWidth > page.pageWidth) {
            newXPosition = page.pageWidth - areaElement.clientWidth;
          }
          if (newYPosition < 0) {
            newYPosition = 0;
          } else if (newYPosition + areaElement.clientHeight >
                     page.pageHeight) {
            newYPosition = page.pageHeight - areaElement.clientHeight;
          }

          areaElement.style.left = newXPosition + 'px';
          areaElement.style.top = newYPosition + 'px';
          page.endX = newXPosition + areaElement.clientWidth;
          page.startX = newXPosition;
          page.endY = newYPosition + areaElement.clientHeight;
          page.startY = newYPosition;

        }
        var crop = document.getElementById('sc_drag_crop');
        var cancel = document.getElementById('sc_drag_cancel');
        if (event.pageY + 25 > document.height) {
          crop.style.bottom = 0;
          cancel.style.bottom = 0
        } else {
          crop.style.bottom = '-25px';
          cancel.style.bottom = '-25px';
        }

        var dragSizeContainer = document.getElementById('sc_drag_size');
        if (event.pageY < 18) {
          dragSizeContainer.style.top = 0;
        } else {
          dragSizeContainer.style.top = '-18px';
        }
        page.updateShadow(areaElement);
        page.updateSize();

      }
    }
  },

 /**
  * Fix the selection area position when mouse up
  */
  onMouseUp: function() {
    page.isMouseDown = false;
    if (event.button != 2) {
      page.resizing = false;
      page.dragging = false;
      page.moving = false;
      page.moveX = 0;
      page.moveY = 0;
      var temp;
      if (page.endX < page.startX) {
        temp = page.endX;
        page.endX = page.startX;
        page.startX = temp;
      }
      if (page.endY < page.startY) {
        temp = page.endY;
        page.endY = page.startY;
        page.startY = temp;
      }
    }
  },

  /**
  * Update the location of the shadow layer
  */
  updateShadow: function(areaElement) {
    $('sc_drag_shadow_top').style.height =
        parseInt(areaElement.style.top) + 'px';
    $('sc_drag_shadow_top').style.width = (parseInt(areaElement.style.left) +
        parseInt(areaElement.style.width) + 1) + 'px';
    $('sc_drag_shadow_left').style.height =
        (page.pageHeight - parseInt(areaElement.style.top)) + 'px';
    $('sc_drag_shadow_left').style.width =
        parseInt(areaElement.style.left) + 'px';

    var height = (parseInt(areaElement.style.top) +
        parseInt(areaElement.style.height) + 1);
    height = (height < 0) ? 0 : height;
    var width = (page.pageWidth) - 1 - (parseInt(areaElement.style.left) +
        parseInt(areaElement.style.width));
    width = (width < 0) ? 0 : width;
    $('sc_drag_shadow_right').style.height = height + 'px';
    $('sc_drag_shadow_right').style.width =  width + 'px';

    height = (page.pageHeight - 1 - (parseInt(areaElement.style.top) +
        parseInt(areaElement.style.height)));
    height = (height < 0) ? 0 : height;
    width = (page.pageWidth) - parseInt(areaElement.style.left);
    width = (width < 0) ? 0 : width;
    $('sc_drag_shadow_bottom').style.height = height + 'px';
    $('sc_drag_shadow_bottom').style.width = width + 'px';
  },

  /**
  * Remove selection area
  */
  removeSelectionArea: function() {
    document.removeEventListener('mousedown', page.onMouseDown, false);
    document.removeEventListener('mousemove', page.onMouseMove, false);
    document.removeEventListener('mouseup', page.onMouseUp, false);
    $('sc_drag_container').removeEventListener('dblclick',function() {
      page.removeSelectionArea();
      page.sendMessage({msg: 'capture_selected'});}, false);
    page.removeElement('sc_drag_area_protector');
    page.removeElement('sc_drag_area');
    page.isSelectionAreaTurnOn = false;
  },

  /**
  * Refresh the size info
  */
  updateSize: function() {
    var width = Math.abs(page.endX - page.startX);
    var height = Math.abs(page.endY - page.startY);
    $('sc_drag_size').innerText = page.calculateSizeAfterZooming(width) +
      ' x ' + page.calculateSizeAfterZooming(height);
  },

  /**
  * create div
  */
  createDiv: function(parent, id) {
    var divElement = document.createElement('div');
    divElement.id = id;
    parent.appendChild(divElement);
    return divElement;
  },

  /**
  * Remove an element
  */
  removeElement: function(id) {
    if($(id)) {
      $(id).parentNode.removeChild($(id));
    }
  },

  injectCssResource: function(cssResource) {
    var css = document.createElement('LINK');
    css.type = 'text/css';
    css.rel = 'stylesheet';
    css.href = chrome.extension.getURL(cssResource);
    (document.head || document.body || document.documentElement).
        appendChild(css);
  },

  injectJavaScriptResource: function(scriptResource) {
    var script = document.createElement("script");
    script.type = "text/javascript";
    script.charset = "utf-8";
    script.src = chrome.extension.getURL(scriptResource);
    (document.head || document.body || document.documentElement).
        appendChild(script);
  },

  /**
  * Remove an element
  */
  init: function() { 
    if (document.body.hasAttribute('screen_capture_injected')) {
      return;
    }
    if (isPageCapturable()) {
      chrome.runtime.sendMessage({msg: 'page_capturable'});
    } else {
      chrome.runtime.sendMessage({msg: 'page_uncapturable'});
    }
    this.injectCssResource('style.css');
    this.addMessageListener();
    this.injectJavaScriptResource("page_context.js");

    // Retrieve original width of view port and cache.
    page.getOriginalViewPortWidth();
  }
};

/**
 * Indicate if the current page can be captured.
 */
var isPageCapturable = function() {
  return !page.checkPageIsOnlyEmbedElement();
};

function $(id) {
  return document.getElementById(id);
}

page.init();

window.addEventListener('resize', function() {
  if (page.isSelectionAreaTurnOn) {
    page.removeSelectionArea();
    page.showSelectionArea();
  }

  // Reget original width of view port if browser window resized or page zoomed.
  page.getOriginalViewPortWidth();
}, false);

// Send page url for retriving and parsing access token for facebook and picasa.
page.sendMessage({
  msg: 'url_for_access_token',
  url: window.location.href
});
