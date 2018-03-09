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
