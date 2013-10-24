/*

Read license.txt for licensing information.

*/

var w; 
var h; 
var image; 
var imageCheck; 
var imageBuffer;

var iterations;
var pix;

var totalCalculations = 0;
var calculationsCompleted = 0;

var contrastLevel;

var postMessageStep = 250000
var nextPostMessage = 0;


function evaluateColorContrast(r1, g1, b1, r2, g2, b2) {
    var ratio;
    var l1;
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

    var l2;
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
        return true;
    } else {
        return false;
    }
}


function iterativeAnalyze(radius) {
    var x = 0;
    var y = 0;
    var xMax = w;
    var yMax = h;
    var success;
    var failure;
    var foundContrastBorder = false;
    

    /////
    // check if any contrast borders already exist in the image processed so far for a given radius around a pixel
    for (var i2 = 0, n2 = imageCheck.length; i2 < n2; i2 += 1) {
        foundContrastBorder = false;

        for (var j2 = 0; j2 <= radius; j2 += 1) {
			if(foundContrastBorder){
				break;
			}
            for (var k2 = 0; k2 <= radius; k2 += 1) {
				if(foundContrastBorder){
					break;
				}
                // + +
                if (imageCheck[i2 + (w * j2) + (k2)] > 0) {
                    foundContrastBorder = true;
                }
                // + -
                if (imageCheck[i2 + (w * j2) - (k2)] > 0) {
                    foundContrastBorder = true;
                }
                // - +
                if (imageCheck[i2 - (w * j2) + (k2)] > 0) {
                    foundContrastBorder = true;
                }
                // - -
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
                        // + +
                        
                       	basePixelRed = pix[i2 * 4];
                       	basePixelGreen = pix[i2 * 4 + 1];
                        basePixelBlue = pix[i2 * 4 + 2];
                        
                        if (evaluateColorContrast(basePixelRed, basePixelGreen, basePixelBlue, pix[i2 * 4 + (w * j * 4) + (k * 4)], pix[i2 * 4 + (w * j * 4) + (k * 4) + 1], pix[i2 * 4 + (w * j * 4) + (k * 4) + 2])) {
                            success = +1;
                        } //else {
                            //failure = +1;
                        //}
                        // + -
                        if (evaluateColorContrast(basePixelRed, basePixelGreen, basePixelBlue, pix[i2 * 4 + (w * j * 4) - (k * 4)], pix[i2 * 4 + (w * j * 4) - (k * 4) + 1], pix[i2 * 4 + (w * j * 4) - (k * 4) + 2])) {
                            success = +1;
                        } //else {
                            //failure = +1;
                        //}
                        // - +
                        if (evaluateColorContrast(basePixelRed, basePixelGreen, basePixelBlue, pix[i2 * 4 - (w * j * 4) + (k * 4)], pix[i2 * 4 - (w * j * 4) + (k * 4) + 1], pix[i2 * 4 - (w * j * 4) + (k * 4) + 2])) {
                            success = +1;
                        } //else {
                            //failure = +1;
                        //}
                        // - -
                        if (evaluateColorContrast(basePixelRed, basePixelGreen, basePixelBlue, pix[i2 * 4 - (w * j * 4) - (k * 4)], pix[i2 * 4 - (w * j * 4) - (k * 4) + 1], pix[i2 * 4 - (w * j * 4) - (k * 4) + 2])) {
                            success = +1;
                        } //else {
                            //failure = +1;
                        //}
                        if(success > 0){
                        	break;
                        }
                    if(success > 0){
                       	break;
                    }
                    }
                }
            }

            if (image[y * w + x] == 0 || radius == 1) {
                if (success > 0) {
                    if (radius == 1) {
                        image[y * w + x] = 255;
                    } else if (radius == 2) {
                        image[y * w + x] = 170;
                    } else if (radius == 3) {
                        image[y * w + x] = 85;
                    }

                } else {
                    image[y * w + x] = 0;
                }
            }
        }

        updateStatus(radius);
        x += 1;
        if (x >= xMax) {
            x = 0;
            y += 1;
        }

    }
    imageCheck = image.slice(0);
}

function updateStatus(i) {
    calculationsCompleted = calculationsCompleted + (i + 2) * (i + 2);
    if (calculationsCompleted > nextPostMessage) {
        postMessage('{"status":' + Math.round(calculationsCompleted / totalCalculations * 100) + '}');
        nextPostMessage += postMessageStep;
    }
}

function analyze() {
    var radius = 1;

    var d1 = new Date();
    var n1 = d1.getTime();

    for (var i = 1; i <= iterations; i += 1) {
        iterativeAnalyze(i);
    }

    d2 = new Date();
    n2 = d2.getTime();
    postMessage({"time":n2-n1});

    var buf = new ArrayBuffer(self.image.length);
    var bufView = new Uint8Array(buf);
    for (var i = 0, strLen = self.image.length; i < strLen; i++) {
        bufView[i] = self.image[i];
    }

    postMessage({"status":100});
    postMessage({"status":'done'});
    postMessage({
        "status": 100,
        "data": bufView.buffer
    }, [bufView.buffer]);
}

function grab() {

    analyze();

}

onmessage = function (oEvent) {
    w = oEvent.data.width;
    h = oEvent.data.height;
    contrastLevel = oEvent.data.contrastLevel;

postMessage({"color":contrastLevel});
    self.image = new Array(w * h);
    self.imageCheck = new Array(w * h);
    iterations = oEvent.data.iterations;

    pix = new Uint8Array(oEvent.data.img);

    for (var i = 1; i <= iterations; i += 1) {
        totalCalculations += (w) * (h) * (i + 2) * (i + 2);
    }

    grab();
};