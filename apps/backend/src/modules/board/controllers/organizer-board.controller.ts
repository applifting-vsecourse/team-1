import {
  BoardPostRequestDto,
  BoardTermDto,
  OrganizerPostDto,
  OrganizerPostItemDto,
} from "@/modules/board/controllers/dto/board.dto"
import { BoardService } from "@/modules/board/services/board.service"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

@ApiTags("board")
@Auth("ORGANIZER")
@Controller("organizer/events/:eventId/board")
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
@ApiResponse({ status: 401, description: "Session required" })
@ApiResponse({
  status: 403,
  description: "Wrong account type, foreign or missing event or post",
})
export class OrganizerBoardController {
  constructor(private readonly board: BoardService) {}

  @Get("terms")
  @ApiOperation({ summary: "Active terms of the event, the choice in the post dialog" })
  @ApiResponse({ status: 200, type: [BoardTermDto] })
  async terms(@User() user: Identity, @Param("eventId") eventId: string): Promise<BoardTermDto[]> {
    return this.board.activeTerms(user, eventId)
  }

  @Get("posts")
  @ApiOperation({ summary: "Posts of the event board, newest first (US-91)" })
  @ApiResponse({ status: 200, type: [OrganizerPostItemDto] })
  async list(
    @User() user: Identity,
    @Param("eventId") eventId: string,
  ): Promise<OrganizerPostItemDto[]> {
    return (await this.board.list(user, eventId)).map(OrganizerPostItemDto.fromDomain)
  }

  @Get("posts/:postId")
  @ApiOperation({ summary: "One post with its text, to edit it" })
  @ApiResponse({ status: 200, type: OrganizerPostDto })
  @ApiResponse({ status: 403, description: "A foreign or missing post" })
  async get(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Param("postId") postId: string,
  ): Promise<OrganizerPostDto> {
    return OrganizerPostDto.fromDomain(await this.board.get(user, eventId, postId))
  }

  @Post("posts")
  @ApiOperation({
    summary: "Publish a post for the chosen terms",
    description:
      "Every account with an application in one of the terms that is confirmed or a substitute gets a notification in the bell.",
  })
  @ApiResponse({ status: 201, type: OrganizerPostDto })
  @ApiResponse({
    status: 400,
    description:
      "A text out of its limits, or BOARD_POST_TERM_INVALID (none, foreign or cancelled)",
  })
  async create(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Body() body: BoardPostRequestDto,
  ): Promise<OrganizerPostDto> {
    return OrganizerPostDto.fromDomain(await this.board.create(user, eventId, body))
  }

  @Put("posts/:postId")
  @ApiOperation({
    summary: "Edit a post",
    description: "Sends no new notification and keeps who has read it.",
  })
  @ApiResponse({ status: 200, type: OrganizerPostDto })
  @ApiResponse({ status: 400, description: "Same as publishing" })
  @ApiResponse({ status: 403, description: "A foreign or missing post" })
  async update(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Param("postId") postId: string,
    @Body() body: BoardPostRequestDto,
  ): Promise<OrganizerPostDto> {
    return OrganizerPostDto.fromDomain(await this.board.update(user, eventId, postId, body))
  }

  @Delete("posts/:postId")
  @HttpCode(204)
  @ApiOperation({ summary: "Delete a post; its notifications and reads go with it" })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 403, description: "A foreign or missing post" })
  async remove(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Param("postId") postId: string,
  ): Promise<void> {
    await this.board.remove(user, eventId, postId)
  }
}
