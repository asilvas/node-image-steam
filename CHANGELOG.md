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
