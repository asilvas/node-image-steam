# About

A simple, fast, and highly customizable on-the-fly image manipulation
web server built atop Node.js

***In an alpha state***


# Why Image Steam?

There are a number of options out there, but IS differentiates itself by:

* Separating itself from a Web Server, so core logic can be used elsewhere.
  Routing, mapping, image processing, storage make up the core components.
* Highly configurable. Everything all the way down to how image operations are mapped
  can be overridden. Most solutions are very prescriptive on how it must work.
* Provides an abstraction atop image processing libraries, enabling per-operation
  level of control to enable using the right tool for the given operation. Bugs,
  features, performance are a few of the factors that may influence this.
* Quality of service features such as throttling and memory thresholds, to best
  take advantage of your hardware under ideal and non ideal scenarios.
* Friendly CLI to create your web server. No forking necessary. 
* Good *Nix & Windows support. 
* Device centric responses, where more than a URI may influence response.
  Compression and Accepts header (i.e. WebP) being examples.


# Installation

The speed and power of this module would not be possible without the incredible
work of libvips (low level image processor), Sharp (depends on libvips), and xxHash
for lightning-fast hashing.

1. Install libvips via http://www.vips.ecs.soton.ac.uk/index.php?title=Supported
2. Install Sharp via http://sharp.dimens.io/en/stable/install/
3. Run `npm install` as sudo (*nix) or admin (windows) 


# Basic Usage

While Routing, Throttling, and Storage are all independently usable and configurable,
a basic usage example that pulls everything together can be as simple as:

```
var http = require('http');
var imgSteam = require('image-steam');

http.createServer(new imgSteam.http.Connect({ /* using default options */ }))
  .listen(13337, '127.0.0.1')
;
```

Which is equivalent of cloning this repo and invoking `npm start`.


# Storage

Bundled storage support includes:

* File System (type "fs")
* S3 (type "s3") - Should work with any S3-compatible storage.

# Custom Storage

Additional storage types can easily be added via exporting `fetch` and `store`.

See `lib/storage/fs` for reference.



# Routing

Routing is left-to-right for legibility.

  `/my-path/my-nice-file-name/:/rs=w:200,h:200`

See [Things to Try](#things-to-try) for many more examples.


# Supported Operations

## Resize (rs)

Resize an image, preserving aspect or not.

Arguments:

* Width (w, optional*) - Width of new size. Supports Dimension Modifiers.
* Height (h, optional*) - Height of new size. Supports Dimension Modifiers.
* Max (M, default) - Retain aspect and use dimensions as the maximum
  permitted during resize.
* Min (m, optional) - Retain aspect and use dimensions as the minimum
  permitted during resize. Set to any value to enable.
* Ignore Aspect Ratio (i, default: 'false') - If true will break aspect and
  resize to exact dimensions.

Note: Width or Height are optional, but at least one must be provided.


## Crop (cr)

Crop an image to an exact size.

Arguments:

* Top (t, default:0) - Offset from top. Supports Dimension Modifiers.
* Left (l, default:0) - Offset from left. Supports Dimension Modifiers.
* Width (w, default:width-left) - Width of new size. Supports Dimension Modifiers.
* Height (h, default:height-top) - Height of new size. Supports Dimension Modifiers.
* Anchor (a, default:cc) - Where to anchor from, using center-center by default. Top
  and Left are applied from the anchor. Possible horizontal axis
  values include left (l), center (c), and right (r). Possible vertical axis
  values include top (t), center (c), and bottom (b).

### Examples

1. `cr=t:10%,l:10%,w:80%,h:80%` - Crop 10% around the edges
2. `cr=w:64,h:64,a=cc` - Crop 64x64 anchored from center.
3. `cr=l:10,w:64,h:64` - Crops 64x64 from the left at 10px (ignoring the horizontal
   axis value of `c`), and vertically anchors from center since top is not provided.


## Background (bg)

***Not yet supported***

Arguments:

* Red (r) - Red component of the RGB(A) spectrum.
  Do not use in conjunction with Hex color.
* Green (g) - Green component of the RGB(A) spectrum.
  Do not use in conjunction with Hex color. 
* Blue (b) - Blue component of the RGB(A) spectrum.
  Do not use in conjunction with Hex color.
* Alpha (a) - Optional Alpha component of the RGB(A) spectrum.
  Do not use in conjunction with Hex color.
* Hex (#) - Full hex color (i.e. #ffffff).
  Do not use in conjunction with RGB(A) color.


## Flatten (ft)

***Not yet supported***

Merge alpha transparency channel, if any, with background.


## Rotate (rt)

Arguments:

* Degrees (d) - Degrees to rotate the image, in increments of 90.
  Future implementations may support non-optimized degrees of rotation.


## Flip (fl)

Not to be confused with rotation, flipping is the process of flipping
an image on its horizontal and/or vertical axis.

Arguments:

* X (x) - Flip on the horizontal axis. No value required.
* Y (y) - Flip on the vertical axis. No value required.


## Quality (qt)

The output quality to use for lossy JPEG, WebP and TIFF output formats. 

* Quality (q, default: 80) - Value between 1 (worst, smallest) and
  100 (best, largest).  


## Compression (cp)

An advanced setting for the zlib compression level of the lossless
PNG output format. The default level is 6.

* Compression (c, default: 6) - Number between 0 and 9.  


## Progressive (pg)

Use progressive (interlace) scan for JPEG and PNG output. This
typically reduces compression performance by 30% but results in
an image that can be rendered sooner when decompressed.

Can be useful for images that always need to be seen ASAP, but should
not be used otherwise to save bandwidth.

### Examples

1. `rs=w:3840/pg` - Create a big 4K-ish image and use progressive rendering
   to see demonstrate value in some use cases.


## Interpolation (ip)

***Not yet supported***

Use the given interpolator for image resizing. Defaults to "bilinear".

Arguments:

* Interpolator (i, optional) - Process to use for resizing, from fastest to slowest:
  * nearest - Use nearest neighbour interpolation, suitable for image enlargement only.
  * bilinear - Use bilinear interpolation, the default and fastest image reduction interpolation.
  * bicubic - Use bicubic interpolation, which typically reduces performance by 5%.
  * vertexSplitQuadraticBasisSpline - Use VSQBS interpolation, which prevents "staircasing" and typically reduces performance by 5%.
  * locallyBoundedBicubic - Use LBB interpolation, which prevents some "acutance" and typically reduces performance by a factor of 2.
  * nohalo - Use Nohalo interpolation, which prevents acutance and typically reduces performance by a factor of 3.


## Format (fm) 

***Not yet supported***

Override the auto-detected optimal format to output. Do not use this unless
you have good reason.

Arguments:

* Format (f, required) - Format to output: "jpeg", "png", or "webp".


## Sharpen (fx-sp)

***Not yet supported***

Arguments:

* Radius (r) - Optional sharpening mask to apply in pixels, but comes at
  a performance cost.
* Flat (f) - Optional sharpening to apply to flat areas. Defaults to 1.0.
* Jagged (j) - Optional sharpening to apply to jagged areas. Defaults to 2.0.
 
 
## Blur (fx-bl)

Fast mild blur by default, but can override the default sigma for more
control (at cost of performance).

Arguments:

* Sigma (s) - The approximate blur radius in pixels, from 0.3 to 1000.

### Examples

1. `fx-bl=s:5`


## Greyscale (fx-gs)

Convert to 8-bit greyscale.

## Normalize (fx-nm)

***Not yet supported***

Enhance output image contrast by stretching its luminance to cover the full
dynamic range. This typically reduces performance by 30%.


# Dimension Modifiers

Dimension modifiers can be applied to any values where size and
location are represented.

## Pixels

Any numeric value around measurement without explicit unit type
specified is implicitly of type px.

### Examples
1. `rs=w:200,h:300`
2. `rs=w:200px,h:300px` - (identical to #1)
3. `cr=t:15,l:10,w:-10,h:-15`


## Percentage

A percentage applied to original value by supplying the percentage (%) modifier.

### Examples
1. `rs=w:50%,h:50%` - 50% of source width and height
2. `cr=t:15%,l:10%,w:-10%,h:-15%`

## Offset

To be used in conjunction with locations or dimensions,
a plus (+) or minus (-) may be used to imply offset from original.

### Examples

1. `rs=w:+50px,h:-50px` - 50px wider than original, 50px shorter than original
2. `rs=w:+10%,h:-10%` - 10% wider than original, 10% shorter than original



# Things to try:

* `rs=w:640` - Resize to 640 width, retain aspect
* `rs=w:640/cr=l:5%,t:10%,w:90%,h:80%` - Same as above, and
  crop 5% of the sides and 10% of the top and bottom
* `rs=w:640/cr=l:5%,t:10%,w:90%,h:80%/fx-gs` - Same as above, and
  apply greyscale effect.
* `rs=w:640/cr=l:5%,t:10%,w:90%,h:80%/fx-gs/qt=q:20` - Same as above, and
  use a low quality of 20.
* `rs=w:64,h:64,m/cr=w:64,h:64/fx-gs` - Resize image to a *minimum* of 64x64
  w/o breaking aspect so that we can then crop the image and apply
  greyscale.
* `fx-bl=s:5` - Apply a blur
