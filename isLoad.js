/*

Read license.txt for licensing information.

*/

function checkScriptLoad() {
  chrome.runtime.onMessage.addListener(function(request, sender, response) {
    if (request.msg == 'is_page_capturable') {
      try {
        if (isPageCapturable()) {
          response({msg: 'capturable'});
        } else {
          response({msg: 'uncapturable'});
        }
        return true;
      } catch(e) {
        response({msg: 'loading'});
        return true;
      }
    }
    return true;
  });
}
checkScriptLoad();
