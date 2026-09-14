import { Module } from "@nestjs/common";
import { GcsObjects } from "./gcs-objects.service";
import { PhotosRepository } from "./photos.repository";
import { StorageService } from "./storage.service";
import { StorageController } from "./storage.controller";

@Module({
  controllers: [StorageController],
  providers: [GcsObjects, PhotosRepository, StorageService],
})
export class StorageModule {}
