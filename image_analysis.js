/*
 
 Read license.txt for licensing information.
 
 */


var w = document.getElementById('canvas').getAttribute('width'); // width of the image
var h = document.getElementById('canvas').getAttribute('height'); // height of the image
var image = new Array(w * h); // a container to receive the resulting image

function draw() {
    // create a canvas element to draw the resulting image on
    var canv = document.createElement('canvas');
    canv.id = 'contrastMask';
    canv.width = w;
    canv.height = h;

    document.getElementById('photo').appendChild(canv); // adds the canvas to the body element

    var myContext = document.getElementById('contrastMask').getContext('2d');
    var id = myContext.createImageData(w, h);
    var d = id.data;

    var pixelData; // the value for the RGB of the pixel
    var pixelLocation; // the location to draw the pixel to

    // get the original image
    var cv = document.getElementById('canvas');
    var cvContext = cv.getContext("2d");
    var cvImage = cvContext.getImageData(0, 0, w, h);
    var cvData = cvImage.data;

    // merge the mask (75%) and the original image (25%)
    for (var m = 0; m < h; m += 1) {
        for (var n = 0; n < w; n += 1) {
            pixelData = image[m * (w) + n];
            pixelLocation = (m * (w) + n) * 4
            id.data[pixelLocation + 0] = pixelData * .75 + cvData[pixelLocation + 0] * .25;
            id.data[pixelLocation + 1] = pixelData * .75 + cvData[pixelLocation + 1] * .25;
            id.data[pixelLocation + 2] = pixelData * .75 + cvData[pixelLocation + 2] * .25;
            id.data[pixelLocation + 3] = 255;
        }
        // draw the pixel
        myContext.putImageData(id, 0, 0);
    }

    var bb = dataURItoBlob(canv.toDataURL("image/png"));

    var a = document.getElementById('downloadButton');
    a.download = 'contrast' + '.png';
    a.href = window.URL.createObjectURL(bb);

}


function dataURItoBlob(dataURI, callback) {
    // adapted from http://stackoverflow.com/questions/4998908/convert-data-uri-to-file-then-append-to-formdata/5100158
    // 
    // convert base64 to raw binary data held in a string
    // doesn't handle URLEncoded DataURIs
    var byteString = atob(dataURI.split(',')[1]);

    // separate out the mime component
    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]

    // write the bytes of the string to an ArrayBuffer
    var ab = new ArrayBuffer(byteString.length);
    var ia = new Uint8Array(ab);
    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }

    // write the ArrayBuffer to a blob, and you're done
    var bb = new Blob([ab]);
    return bb;
}
;

// launch the analysis as a separate thread
var myWorker = new Worker("background-image-analysis.js");

myWorker.onmessage = function(oEvent) {

    if (oEvent.data.status !== undefined) {
        // update the status of the process
        if (oEvent.data.status == 'done') {
            document.getElementById('percentComplete').innerHTML = "Rendering...";
        } else {
            document.getElementById('percentComplete').innerHTML = oEvent.data.status + '%';
        }
    }

    if (oEvent.data.data !== undefined) {
        // receive the resulting image
        image = new Uint8Array(oEvent.data.data);

        draw();

        myWorker.terminate();
        document.getElementById('percentComplete').innerHTML = 'Complete';
        enableMaskButton(true);
        enableDownloadButton(true);
    }

    try {
        obj = JSON.parse(oEvent.data);
        if (obj.status !== undefined) {
            document.getElementById('percentComplete').innerHTML = obj.status + '%';

        }
    } catch (e) {
    }

};

var ctx = document.getElementById('canvas').getContext('2d');
var imgd = ctx.getImageData(0, 0, w, h);
var pix = new ArrayBuffer(w * h);
var pixView = new Uint8Array(imgd.data);

var myVars = new Array();
myVars[0] = "contrastLevel";
myVars[1] = "pixelRadius";

// get the contrast level
chrome.storage.sync.get(myVars, function(obj) {
    var level = 4.5;
    var radius = 2;
    if (obj['contrastLevel'] == 'WCAG-aa-small') {
        level = 4.5;
    } else if (obj['contrastLevel'] == 'WCAG-aa-large') {
        level = 3.0;
    } else if (obj['contrastLevel'] == 'WCAG-aaa-small') {
        level = 7.0;
    } else if (obj['contrastLevel'] == 'WCAG-aaa-large') {
        level = 4.5;
    } else {
        level = 4.5;
    }

    // get the pixel radius
    radius = obj['pixelRadius'];
    if (radius < 1 || radius > 3 || typeof radius == 'undefined') {
        radius = 2;
    } else {
        radius = obj['pixelRadius'];
    }
    startAnalysis(level, radius);
});

function startAnalysis(level, radius) {
    // send the image and parameters to the thread
    myWorker.postMessage({
        "width": w,
        "height": h,
        "iterations": radius,
        "contrastLevel": level,
        "img": pixView.buffer
    }, [pixView.buffer]);
}
