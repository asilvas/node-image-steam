# 0.41.0 - March 2018

* ***(BREAKING)*** S3 Storage - Client moved to its own repo: https://github.com/asilvas/image-steam-s3
* ***(PERFORMANCE)*** `storage.cacheTTS` - Added to support "refreshing" of stale objects in cache to avoid needless reprocessing of images in caches with time-to-live set.
* ***(GEO)*** `storage.replicas` - Tunable cache replication beyond what you'd get from storage-native replication settings. Allows for more flexible architectures that span multiple regions.
