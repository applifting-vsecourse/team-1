import {
  BadRequestException,
  ForbiddenException,
  HttpStatus,
  UnauthorizedException,
} from "@nestjs/common"
import { AppException } from "./app.exception"
import { toErrorBody } from "./http-error.filter"

describe("toErrorBody", () => {
  it("maps Nest exceptions to codes", () => {
    expect(toErrorBody(new UnauthorizedException())).toMatchObject({
      statusCode: 401,
      code: "UNAUTHORIZED",
    })
    expect(toErrorBody(new ForbiddenException())).toMatchObject({
      statusCode: 403,
      code: "FORBIDDEN",
    })
  })

  it("keeps validation messages for the developer", () => {
    expect(toErrorBody(new BadRequestException(["name should not be empty"]))).toEqual({
      statusCode: 400,
      code: "VALIDATION_FAILED",
      message: ["name should not be empty"],
    })
  })

  it("passes an AppException code through", () => {
    expect(toErrorBody(new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN", "No"))).toEqual({
      statusCode: 403,
      code: "FORBIDDEN",
      message: "No",
    })
  })

  it("hides unexpected errors behind INTERNAL", () => {
    expect(toErrorBody(new Error("db password is wrong"))).toEqual({
      statusCode: 500,
      code: "INTERNAL",
      message: "Internal server error",
    })
  })
})
