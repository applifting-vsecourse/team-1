import {
  Catalog,
  CatalogEventDetail,
  organizationsOf,
} from "@/modules/applications/domain/public-catalog"
import { PublicCatalogRepository } from "@/modules/applications/repositories/public-catalog.repository"
import { AppException } from "@/shared/errors/app.exception"
import { HttpStatus, Injectable } from "@nestjs/common"

@Injectable()
export class PublicCatalogService {
  constructor(private readonly repository: PublicCatalogRepository) {}

  async list(): Promise<Catalog> {
    const events = await this.repository.listPublished()
    return { organizations: organizationsOf(events), events }
  }

  /** An unknown event and one without a working application link are a 404 with nothing to tell them apart. */
  async getEvent(publicToken: string): Promise<CatalogEventDetail> {
    const event = await this.repository.findAccessible(publicToken)
    if (!event) throw new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND")
    return event
  }

  async getPhoto(
    publicToken: string,
  ): Promise<{ contentType: string; data: Uint8Array; updatedAt: Date }> {
    const photo = await this.repository.findAccessiblePhoto(publicToken)
    if (!photo) throw new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND")
    return photo
  }
}
