color-contrast-chrome
=====================

Color Contrast Analyzer Extension for Google Chrome

http://accessibility.oit.ncsu.edu/tools/color-contrast-chrome/

Notes on the Code

Some of this code is from another project from Google.

https://chrome.google.com/webstore/detail/screen-capture-by-google/cpngackimfmofbokmjmljamhdncknpmg

I used the code from this project for creating the draggable selection box. This code has lots of other functionality, most of which I have removed. There could still be some remnants of this code that is basically dormant in the Color Contrast Analyzer at this point.

Versions

1.1.2
* adjusted z-index for the draggable area to the maximum allowed value of 2147483647 to help ensure it will not be positioned underneath other elements

1.1.1
* adjusted CSS for Windows buttons

1.1.0
* added ability to download the image analysis to a local file

1.03
* fixed a bug where the WCAG 2 and pixel radius settings were not sticking once you clicked the rescan button

1.02
* added better support for processing local files within Chrome

1.01
* added keyboard support for the popup window
* increased the z-index value of the draggable area

1.00
* compressed icon images and removed unused images

0.60
* fixed problem with extension not loading when the page was idle for too long
* made the layout screen more fluid
* added WCAG contrast ratio levels to the conformance level selector
* added the link to the help file

0.53
* initial commit

