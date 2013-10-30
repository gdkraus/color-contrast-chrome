/*

Read license.txt for licensing information.

*/

// This file is designed to be launched as a web worker thread

var w; // width of the image
var h; // height of the image
var image; // the resulting image, as a set of white or gray pixels on a black background
var imageCheck; // a copy of the results after an interation, used to check if all calcualtions are needed in the next iteration
var imageBuffer;

var iterations; // the number of pixels in the radius to search
var pix; // the image passed from the calling function

var totalCalculations = 0; // the total number of calculations needed to complete the analysis
var calculationsCompleted = 0; // the total number of calculations completed so far

var contrastLevel; // the contrast ratio level to check for (passed from the 

var postMessageStep = 250000 // how often to send updates to the calling page, denoted in number of calculations
var nextPostMessage = 0; // the number of calculations to complete before sending the next message to the calling page


function evaluateColorContrast(r1, g1, b1, r2, g2, b2) {
    // This function is an optimized version of the algorithm found at
    // https://github.com/gdkraus/wcag2-color-contrast
    // It is optimized to reduce function calls. This is for speed performance
    // because this function is called for every single pixel comparison. The code could
    // be written more cleanly, but the overhead of the function calls adds significantly
    // to the processing time.
    
    var ratio;
    var l1; //luminosity of color 1
    var r, g, b;
    r = r1 / 255;
    g = g1 / 255;
    b = b1 / 255;
    if (r <= 0.03928) {
        r = r / 12.92;
    } else {
        r = Math.pow(((r + 0.055) / 1.055), 2.4);
    }

    if (g <= 0.03928) {
        g = g / 12.92;
    } else {
        g = Math.pow(((g + 0.055) / 1.055), 2.4);
    }

    if (b <= 0.03928) {
        b = b / 12.92;
    } else {
        b = Math.pow(((b + 0.055) / 1.055), 2.4);
    }

    l1 = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    var l2; //luminosity of color 2
    r = r2 / 255;
    g = g2 / 255;
    b = b2 / 255;
    if (r <= 0.03928) {
        r = r / 12.92;
    } else {
        r = Math.pow(((r + 0.055) / 1.055), 2.4);
    }

    if (g <= 0.03928) {
        g = g / 12.92;
    } else {
        g = Math.pow(((g + 0.055) / 1.055), 2.4);
    }

    if (b <= 0.03928) {
        b = b / 12.92;
    } else {
        b = Math.pow(((b + 0.055) / 1.055), 2.4);
    }

    l2 = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    if (l1 > l2) {
        ratio = ((l1 + 0.05) / (l2 + 0.05));
    } else {
        ratio = ((l2 + 0.05) / (l1 + 0.05));
    }

    if (Math.round(ratio*10)/10 >= contrastLevel) {
        return true; // two colors have enough contrast
    } else {
        return false; // two colors do not have enough contrast
    }
}


function iterativeAnalyze(radius) {
    var x = 0; // the counter in the width dimension
    var y = 0; // the counter in the height dimension
    var xMax = w; // the maximum width to check for, when iterating
    var yMax = h; // the maximum height to check for, when iterating
    var success; // number of success 
    var failure; // number of failures
    var foundContrastBorder = false; // if an existing contrast border is found
    

    /////
    // check if any contrast borders already exist in the image processed so far for a given radius around a pixel
    for (var i2 = 0, n2 = imageCheck.length; i2 < n2; i2 += 1) {
        foundContrastBorder = false;

        for (var j2 = 0; j2 <= radius; j2 += 1) {
            if(foundContrastBorder){
                break; // stop checking if a border is found
            }
            for (var k2 = 0; k2 <= radius; k2 += 1) {
                if(foundContrastBorder){
                    break; // stop checking if a border is found
                }
                
                // check to see if a contrast border had been found on a previous iteration
                // 
                // + + direction
                if (imageCheck[i2 + (w * j2) + (k2)] > 0) {
                    foundContrastBorder = true;
                }
                // + - direction
                if (imageCheck[i2 + (w * j2) - (k2)] > 0) {
                    foundContrastBorder = true;
                }
                // - + direction
                if (imageCheck[i2 - (w * j2) + (k2)] > 0) {
                    foundContrastBorder = true;
                }
                // - - direction
                if (imageCheck[i2 - (w * j2) - (k2)] > 0) {
                    foundContrastBorder = true;
                }
            }
        }

        success = 0;
        failure = 0;

        if (!foundContrastBorder) {

            for (var j = 0; j <= radius; j += 1) {

                for (var k = 0; k <= radius; k += 1) {
                    if (!(j == 0 && k == 0) && (image[y * w + x] == 0 || radius == 1)) {
                        
                        // the base pixel to compare all of the others to, in RGB
                        basePixelRed = pix[i2 * 4];
                        basePixelGreen = pix[i2 * 4 + 1];
                        basePixelBlue = pix[i2 * 4 + 2];
                        
                        // + + direction
                        if (evaluateColorContrast(basePixelRed, basePixelGreen, basePixelBlue, pix[i2 * 4 + (w * j * 4) + (k * 4)], pix[i2 * 4 + (w * j * 4) + (k * 4) + 1], pix[i2 * 4 + (w * j * 4) + (k * 4) + 2])) {
                            success = +1;
                        } //else {
                        //failure = +1;
                        //}
                        
                        // + - direction
                        if (evaluateColorContrast(basePixelRed, basePixelGreen, basePixelBlue, pix[i2 * 4 + (w * j * 4) - (k * 4)], pix[i2 * 4 + (w * j * 4) - (k * 4) + 1], pix[i2 * 4 + (w * j * 4) - (k * 4) + 2])) {
                            success = +1;
                        } //else {
                        //failure = +1;
                        //}
                        
                        // - + direction
                        if (evaluateColorContrast(basePixelRed, basePixelGreen, basePixelBlue, pix[i2 * 4 - (w * j * 4) + (k * 4)], pix[i2 * 4 - (w * j * 4) + (k * 4) + 1], pix[i2 * 4 - (w * j * 4) + (k * 4) + 2])) {
                            success = +1;
                        } //else {
                        //failure = +1;
                        //}
                        
                        // - - direction
                        if (evaluateColorContrast(basePixelRed, basePixelGreen, basePixelBlue, pix[i2 * 4 - (w * j * 4) - (k * 4)], pix[i2 * 4 - (w * j * 4) - (k * 4) + 1], pix[i2 * 4 - (w * j * 4) - (k * 4) + 2])) {
                            success = +1;
                        } //else {
                        //failure = +1;
                        //}
                        
                        if(success > 0){
                            break; // if a border if found, stop
                        }
                        if(success > 0){
                            break;
                        }
                    }
                }
            }

            // draw the result as a pixel
            if (image[y * w + x] == 0 || radius == 1) {
                if (success > 0) {
                    if (radius == 1) {
                        image[y * w + x] = 255; // white
                    } else if (radius == 2) {
                        image[y * w + x] = 170; // light gray
                    } else if (radius == 3) {
                        image[y * w + x] = 85; // medium gray
                    }

                } else {
                    image[y * w + x] = 0; // black
                }
            }
        }

        updateStatus(radius);
        x += 1; // increment the counter in the width dimension
        if (x >= xMax) { // if we reach the end of the line, go the next line
            x = 0; // reset the counter in the width dimension
            y += 1; // in crement the counter in the height dimension
        }

    }
    imageCheck = image.slice(0); // copy the array to imageCheck so it can be used in the next iteration
}

function updateStatus(i) {
    calculationsCompleted = calculationsCompleted + (i + 2) * (i + 2);
    if (calculationsCompleted > nextPostMessage) {
        // when the calculations completed passes the next threshold, update the calling function with the % complete
        postMessage('{"status":' + Math.round(calculationsCompleted / totalCalculations * 100) + '}');
        nextPostMessage += postMessageStep; // set the next calculations completed threshold
    }
}

function analyze() {
    var radius = 1;

    var d1 = new Date();
    var n1 = d1.getTime();

    for (var i = 1; i <= iterations; i += 1) {
        // the size of the pixel radius to analyze
        iterativeAnalyze(i);
    }

    d2 = new Date();
    n2 = d2.getTime();
    postMessage({
        "time":n2-n1
        });

    var buf = new ArrayBuffer(self.image.length);
    var bufView = new Uint8Array(buf);
    for (var i = 0, strLen = self.image.length; i < strLen; i++) {
        bufView[i] = self.image[i]; // copy the image to the array buffer
    }

    postMessage({
        "status":100
    });
    postMessage({
        "status":'done'
    });
    postMessage({
        "status": 100,
        "data": bufView.buffer
    }, [bufView.buffer]); // the resulting image passed as a transferable object, for speed purposes
}

function grab() {

    analyze();

}

onmessage = function (oEvent) {
    w = oEvent.data.width; // the width of the image
    h = oEvent.data.height; // the height of the image
    contrastLevel = oEvent.data.contrastLevel; // the contrast level to use

    postMessage({
        "color":contrastLevel
    });
    self.image = new Array(w * h); // initialize an array to draw the resulting picture
    self.imageCheck = new Array(w * h); // initialize an array to check for existing contrast borders
    iterations = oEvent.data.iterations; // the size of the pixel radius

    pix = new Uint8Array(oEvent.data.img); // the image passed as a transferable object, for speed purposes

    for (var i = 1; i <= iterations; i += 1) {
        totalCalculations += (w) * (h) * (i + 2) * (i + 2); // the total number of calculations needed to analyze the image
    }

    grab();
};