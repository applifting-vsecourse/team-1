import {
  CatalogEventDetailResponseDto,
  CatalogResponseDto,
} from "@/modules/applications/controllers/dto/public-catalog.response.dto"
import { PublicCatalogService } from "@/modules/applications/services/public-catalog.service"
import { Controller, Get, Param, Req, Res } from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"
import type { Request, Response } from "express"

/**
 * Public — no `@Auth`. The catalog lists only events published in US-122; the page of an event
 * (and its photo) is open for every event with a working application link (US-22).
 */
@ApiTags("applications")
@Controller("public")
export class PublicCatalogController {
  constructor(private readonly catalog: PublicCatalogService) {}

  @Get("catalog")
  @ApiOperation({ summary: "Published events and the organizations that have them" })
  @ApiResponse({ status: 200, type: CatalogResponseDto })
  async list(): Promise<CatalogResponseDto> {
    return CatalogResponseDto.fromDomain(await this.catalog.list())
  }

  @Get("events/:publicToken/page")
  @ApiOperation({ summary: "The public page of an event with a working application link" })
  @ApiResponse({ status: 200, type: CatalogEventDetailResponseDto })
  @ApiResponse({
    status: 404,
    description: "Unknown event or one without a working application link (NOT_FOUND).",
  })
  async getEvent(
    @Param("publicToken") publicToken: string,
  ): Promise<CatalogEventDetailResponseDto> {
    return CatalogEventDetailResponseDto.fromDomain(await this.catalog.getEvent(publicToken))
  }

  @Get("events/:publicToken/photo")
  @ApiOperation({ summary: "The photo of an event page" })
  @ApiResponse({ status: 200, description: "The image." })
  @ApiResponse({ status: 304, description: "Unchanged since the ETag the client sent." })
  @ApiResponse({ status: 404, description: "No page for the event or no photo (NOT_FOUND)." })
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
