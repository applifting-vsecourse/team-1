import {
  BoardSummaryDto,
  ParticipantPostDto,
  ParticipantPostItemDto,
} from "@/modules/board/controllers/dto/board.dto"
import { BoardService } from "@/modules/board/services/board.service"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import { Controller, Get, HttpCode, Param, Post } from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

/** The board of the signed-in account; there is no way to name someone else's. */
@ApiTags("board")
@Auth("PARTICIPANT")
@Controller("participant/board")
@ApiResponse({ status: 401, description: "Session required" })
@ApiResponse({ status: 403, description: "Wrong account type" })
export class ParticipantBoardController {
  constructor(private readonly board: BoardService) {}

  @Get()
  @ApiOperation({
    summary: "Posts of the terms the account is confirmed or a substitute in, newest first (US-91)",
  })
  @ApiResponse({ status: 200, type: [ParticipantPostItemDto] })
  async list(@User() user: Identity): Promise<ParticipantPostItemDto[]> {
    return (await this.board.listForParticipant(user)).map(ParticipantPostItemDto.fromDomain)
  }

  @Get("summary")
  @ApiOperation({ summary: "Number of new posts and the newest one (the card in My application)" })
  @ApiResponse({ status: 200, type: BoardSummaryDto })
  summary(@User() user: Identity): Promise<BoardSummaryDto> {
    return this.board.summary(user)
  }

  @Get("posts/:postId")
  @ApiOperation({ summary: "One post with its whole text" })
  @ApiResponse({ status: 200, type: ParticipantPostDto })
  @ApiResponse({ status: 403, description: "Missing or not the account's post" })
  async get(@User() user: Identity, @Param("postId") postId: string): Promise<ParticipantPostDto> {
    return ParticipantPostDto.fromDomain(await this.board.getForParticipant(user, postId))
  }

  @Post("posts/:postId/read")
  @HttpCode(204)
  @ApiOperation({
    summary: "Marks the post as opened; idempotent",
    description: "Also marks the notification about the post as read.",
  })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 403, description: "A foreign or missing post" })
  async markRead(@User() user: Identity, @Param("postId") postId: string): Promise<void> {
    await this.board.markRead(user, postId)
  }
}
