import {
  CatalogEventDetailResponseDto,
  CatalogResponseDto,
} from "@/modules/applications/controllers/dto/public-catalog.response.dto"
import { PublicCatalogService } from "@/modules/applications/services/public-catalog.service"
import { Controller, Get, Param, Req, Res } from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"
import type { Request, Response } from "express"

/** Public — no `@Auth`: anyone browses the catalog. Only events published in US-122 appear. */
@ApiTags("applications")
@Controller("public/catalog")
export class PublicCatalogController {
  constructor(private readonly catalog: PublicCatalogService) {}

  @Get()
  @ApiOperation({ summary: "Published events and the organizations that have them" })
  @ApiResponse({ status: 200, type: CatalogResponseDto })
  async list(): Promise<CatalogResponseDto> {
    return CatalogResponseDto.fromDomain(await this.catalog.list())
  }

  @Get("events/:publicToken")
  @ApiOperation({ summary: "The public page of an event published in the catalog" })
  @ApiResponse({ status: 200, type: CatalogEventDetailResponseDto })
  @ApiResponse({ status: 404, description: "Unknown or not published event (NOT_FOUND)." })
  async getEvent(
    @Param("publicToken") publicToken: string,
  ): Promise<CatalogEventDetailResponseDto> {
    return CatalogEventDetailResponseDto.fromDomain(await this.catalog.getEvent(publicToken))
  }

  @Get("events/:publicToken/photo")
  @ApiOperation({ summary: "The photo of a published event" })
  @ApiResponse({ status: 200, description: "The image." })
  @ApiResponse({ status: 304, description: "Unchanged since the ETag the client sent." })
  @ApiResponse({ status: 404, description: "Not published or no photo (NOT_FOUND)." })
  async getPhoto(
    @Param("publicToken") publicToken: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const photo = await this.catalog.getPhoto(publicToken)
    const etag = `"${photo.updatedAt.getTime().toString(36)}"`
    res.setHeader("Cache-Control", "public, max-age=300")
    res.setHeader("ETag", etag)
    res.setHeader("X-Content-Type-Options", "nosniff")
    if (req.headers["if-none-match"] === etag) {
      res.status(304).end()
      return
    }
    res.type(photo.contentType).send(Buffer.from(photo.data))
  }
}
