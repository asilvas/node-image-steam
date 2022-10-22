# 0.64.1 - October 22 2022

* ***(FIX)*** Fix height calculation error for animated images.


# 0.64.0 - October 14 2022

* ***(ENHANCEMENT)*** Format (`fm`) now supports `gif` as output.


# 0.63.2 - June 10 2022

* ***(FIX)*** Rare crash fix when initializing `sharp` if invalid input.


# 0.63.1 - June 9 2022

* ***(FIX)*** `http` storage exception.


# 0.63.0 - June 8 2022

* ***(BREAKING)*** `saliency` was deprecated 2 years ago, and is now removed.


# 0.62.0 - June 8 2022

* ***(ENHANCEMENT)*** `fallback` storage option to support multi-tiered
  storage architectures.


# 0.61.2 - February 2 2022

* ***(SECURITY)*** Do not track "author".
* ***(SECURITY)*** All dependencies updated with latest security patches.


# 0.61.1 - January 3 2022

* ***(SECURITY)*** All dependencies updated with latest security patches.
* ***(CLEANUP)*** Removal of unused `jscs` & `jshint` deps, addition of `prettier`,
  and updates to Travis CI config.


# 0.61.0 - November 30 2021

* ***(ENHANCEMENT)*** Default resize limits increased from 2K to 4K resolution. Default
  optimized original size remains unchanged (2K), so this primarily benefits special
  usage of `?useOriginal=true`.
* ***(BUG FIX)*** When `?useOriginal=true` is supplied the hash will reflect this
  modification to permit the same operations generating unique artifacts. Primarily
  benefits the above enhancement.


# 0.60.0 - November 5 2021

* ***(ENHANCEMENT)*** Support for `avif` compression format, enabled by default
  for supporting browsers. Optimized originals will remain `webp` for the time being.

# 0.59.0 - May 31 2021

* ***(ENHANCEMENT)*** Support for `route.beforeProcess` custom handler.


# 0.56.1 - November 4 2020

* ***(FIX)*** Images rotated prior to optimized original would result in optimized losing their
  orientation and resulting in unpredictable orientations.


# 0.56.0 - June 9 2020

* ***(MINOR FIX)*** Support for scoped driver options. This prevents reusing the same driver
  across apps to avoid polluting of options. This was not a problem with most pre-existing drivers,
  but will make things safer.


# 0.55.0 - May 26 2020

* ***(ENHANCEMENT)*** Option to set `isteamEndpoint=true` on the `http` storage client, allowing
  multiple regions to be chained together for speed and/or cost savings. This in effect permits
  multi-layered proxies to drastically reduce the volume of origin hits.


# 0.54.0 - May 18 2020

* ***(ENHANCEMENT)*** Sharp - Upgrade to latest Sharp (`0.25.3`).
* ***(DEPRECATION)*** Saliency was always experimental. Now it's been deprecated and will be removed
  in future version. Warning provided at startup.
* ***(CHANGE)*** `globalAgent` - Option is still adhered to, but no longer defaults to use
  `agentkeepalive` until explicitly provided.

# 0.53.0 - April 27 2020

* ***(FEATURE)*** Direct support for `isteamb` [driver](./lib/storage/isteamb), removing the need to use `http` proxy mode.


# September 11 2019

* ***(FEATURE)*** Full benchmark suite now available, [check it out](./packages/image-steam-bench)! `npm i -g image-steam-bench`

# 0.51.0 - April 2019

* ***(FEATURE)*** `router.hqOriginalSteps` - Support for highest quality optimized originals for smaller images (400x400 by default). Will only impact newly generated OO's.
* ***(FEATURE)*** `lossless` - Option to enable lossless WebP via `/ll` path.


# 0.50.0 - March 2019

* ***(BREAKING)*** `embed` - Removal of deprecated function.
* ***(ENHANCEMENT)*** Sharp - Upgrade to latest Sharp (`0.22.0`).


# 0.49.0 - March 2019

* ***(BREAKING)*** `background` is no longer a standalone image operation, which is not in a useful state anyway.
* ***(FEATURE)*** `extend` - New operation allows extending the image.
* ***(ENHANCEMENT)*** `resize.fit` - Resize now allows `fit` to be overridden.
* ***(ENHANCEMENT)*** `resize.position` - Resize now allows `position` to be overridden.
* ***(ENHANCEMENT)*** `resize.background` - Permits background to be applied to resize operation when applicable.
* ***(FIX)*** `+/-` on percentage dimensions is now working. Was only working on fixed (px) dimensions prior.
* ***(FIX)*** Various test fixes.


# 0.48.0 - October 2018

* ***(ENHANCEMENT)*** HTTP Agent - Utilize a more optimized HTTP(S) agent by default, including connection reuse.


# 0.47.0 - October 2018

* ***(ENHANCEMENT)*** Sharp - Upgrade to latest Sharp (`0.21.0`) for greater platform support.


# 0.46.0 - June 2018

* ***(ENHANCEMENT)*** Crop auto-focus - Greatly improved accuracy/consistency after being trained with hundreds of
  thousands of data points, which also allowed for the switch to a far more efficient (~10x) saliency mode (spectral).


# 0.45.0 - May 2018

* ***(CONFIGURATION)*** `router.supportWebP` - WebP may not be explicitly disabled, but remains enabled by default
  to avoid breakages. If performance is critical, disabling this option has been known to speed up image operations
  by 2 to 4 times.
* ***(FIX)*** Saliency - Minor fixes to enabling/disabling this feature.


# 0.44.0 - May 2018

* ***(FEATURE)*** `$info` command - Returns all known information about the image, including saliency (new) if available.
* ***(FEATURE)*** Crop auto-focus - An experimental new feature to permit saliency-based auto-focus. Exposed by crop anchor=`auto`.
* ***(FEATURE)*** `$saliency` command - An experimental new feature to permit retrieving of saliency meta data.
* ***(FEATURE)*** `$saliencyMap` command - An experimental new feature to permit retrieving of saliency map.
* ***(DEPENDENCIES)*** `salient-autofocus` - Required by the new saliency auto-focus feature. 


# 0.43.0 - March 2018

* ***(DEPENDENCIES)*** `sharp` - Updated to `v0.20` which requires `libvips` `v8.6.1` or later. 


# 0.42.0 - March 2018

* ***(CONFIGURATION)*** `storage.cacheArtifacts` - Caching of image artifacts may now be disabled. 


# 0.41.0 - March 2018

* ***(BREAKING)*** Default StorageOptions - Root of `storage` options may no longer include `StorageOptions` (options supplied to storage driver), and instead must supply to `storage.defaults` instead. This is a necessary change to avoid polluting the options supplied to storage drivers.
* ***(BREAKING)*** S3 Storage - Client moved to its own repo: https://github.com/asilvas/image-steam-s3
* ***(BREAKING)*** Node - Version 6 and later required.
* ***(PERFORMANCE)*** `storage.cacheTTS` & `storage.cacheOptimizedTTS` - Added to support "refreshing" of stale objects in cache to avoid needless reprocessing of images in caches with time-to-live set.
* ***(CONFIGURATION)*** `storage.cacheOptimized` - Added a new caching option to allow discrete `StorageOptions` supplied only for optimized original caching. This permits splitting of cache for sake of replication or eviction policies.
* ***(CONFIGURATION)*** `isDefaults` - Commandline argument `isDefaults` was added to allow merging of your own defaults.
* ***(GEO)*** `storage.replicas` - Tunable cache replication beyond what you'd get from storage-native replication settings. Allows for more flexible architectures that span multiple regions.
