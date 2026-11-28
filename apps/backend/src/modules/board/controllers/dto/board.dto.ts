import {
  BoardSummary,
  BoardTerm,
  OrganizerPost,
  OrganizerPostItem,
  ParticipantPost,
} from "@/modules/board/domain/board"
import { excerpt } from "@/modules/board/domain/board-summary"
import { POST_BODY_MAX, POST_TITLE_MAX } from "@/modules/board/domain/validate-post"
import { ApiProperty } from "@nestjs/swagger"
import { IsArray, IsOptional, IsString } from "class-validator"

/** The limits and the terms are checked in the domain, so a wrong value is VALIDATION_FAILED. */
export class BoardPostRequestDto {
  @ApiProperty({ maxLength: POST_TITLE_MAX, example: "Odjezd a sraz" })
  @IsOptional()
  @IsString()
  title?: string

  @ApiProperty({ maxLength: POST_BODY_MAX, description: "Plain text, line breaks are kept" })
  @IsOptional()
  @IsString()
  body?: string

  @ApiProperty({ type: [String], description: "At least one active term of the event" })
  @IsOptional()
  @IsArray()
  termIds?: string[]
}

export class BoardTermDto implements BoardTerm {
  @ApiProperty() id!: string
  @ApiProperty({ nullable: true, type: String }) name!: string | null
  @ApiProperty({ example: "2027-07-12" }) startsOn!: string
  @ApiProperty({ example: "2027-07-18" }) endsOn!: string
}

export class OrganizerPostItemDto {
  @ApiProperty() id!: string
  @ApiProperty() title!: string
  @ApiProperty() createdAt!: string
  @ApiProperty({ type: [BoardTermDto] }) terms!: BoardTermDto[]
  @ApiProperty({ description: "Active terms of the event" }) eventTermCount!: number

  static fromDomain(post: OrganizerPostItem): OrganizerPostItemDto {
    return {
      id: post.id,
      title: post.title,
      createdAt: post.createdAt.toISOString(),
      terms: post.terms,
      eventTermCount: post.eventTermCount,
    }
  }
}

export class OrganizerPostDto extends OrganizerPostItemDto {
  @ApiProperty() body!: string

  static fromDomain(post: OrganizerPost): OrganizerPostDto {
    return { ...OrganizerPostItemDto.fromDomain(post), body: post.body }
  }
}

export class ParticipantPostItemDto {
  @ApiProperty() id!: string
  @ApiProperty() title!: string
  @ApiProperty({ description: "The beginning of the text, for the list" }) excerpt!: string
  @ApiProperty() createdAt!: string
  @ApiProperty() eventName!: string
  @ApiProperty({ type: [BoardTermDto], description: "Only the terms the account is in" })
  terms!: BoardTermDto[]
  @ApiProperty({ description: "Active terms of the event" }) eventTermCount!: number
  @ApiProperty({ description: "True until the account opens the post" }) isNew!: boolean

  static fromDomain(post: ParticipantPost): ParticipantPostItemDto {
    return {
      id: post.id,
      title: post.title,
      excerpt: excerpt(post.body),
      createdAt: post.createdAt.toISOString(),
      eventName: post.eventName,
      terms: post.terms,
      eventTermCount: post.eventTermCount,
      isNew: post.isNew,
    }
  }
}

export class ParticipantPostDto extends ParticipantPostItemDto {
  @ApiProperty({ description: "The whole text" }) body!: string

  static fromDomain(post: ParticipantPost): ParticipantPostDto {
    return { ...ParticipantPostItemDto.fromDomain(post), body: post.body }
  }
}

export class LatestPostDto {
  @ApiProperty() id!: string
  @ApiProperty() title!: string
}

export class UnreadByApplicationDto {
  @ApiProperty() applicationId!: string
  @ApiProperty() unreadCount!: number
}

export class BoardSummaryDto implements BoardSummary {
  @ApiProperty({ description: "Posts the account has not opened" }) unreadCount!: number
  @ApiProperty({ type: LatestPostDto, nullable: true }) latest!: LatestPostDto | null
  @ApiProperty({
    type: [UnreadByApplicationDto],
    description: "New posts per application; applications without one are left out",
  })
  unreadByApplication!: UnreadByApplicationDto[]
}
