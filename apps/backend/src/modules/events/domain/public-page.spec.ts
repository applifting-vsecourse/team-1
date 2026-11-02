import {
  cleanFileName,
  detectPhotoType,
  MAX_PHOTO_BYTES,
  missingForCatalog,
  PHONE_PATTERN,
  photoProblem,
} from "@/modules/events/domain/public-page"

const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0])
const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0])

describe("missingForCatalog", () => {
  it("lists every empty field the catalog needs", () => {
    expect(missingForCatalog({ description: null, location: null, contactEmail: null })).toEqual([
      "DESCRIPTION",
      "LOCATION",
      "CONTACT_EMAIL",
    ])
  })

  it("is empty when everything is filled in", () => {
    expect(missingForCatalog({ description: "a", location: "b", contactEmail: "c@d.cz" })).toEqual(
      [],
    )
  })
})

describe("photo validation", () => {
  it("recognises JPEG and PNG by their bytes", () => {
    expect(detectPhotoType(png)).toBe("image/png")
    expect(detectPhotoType(jpeg)).toBe("image/jpeg")
    expect(detectPhotoType(Uint8Array.from([0x47, 0x49, 0x46, 0x38]))).toBeNull()
  })

  it("accepts a small image", () => {
    expect(photoProblem(png)).toBeNull()
  })

  it("rejects another type, even one that claims to be an image", () => {
    expect(photoProblem(Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]))).toBe("INVALID_TYPE")
    expect(photoProblem(new Uint8Array(0))).toBe("INVALID_TYPE")
  })

  it("rejects an image over the limit", () => {
    const big = new Uint8Array(MAX_PHOTO_BYTES + 1)
    big.set(png)
    expect(photoProblem(big)).toBe("TOO_LARGE")
  })
})

describe("cleanFileName", () => {
  it("drops any path and odd characters", () => {
    expect(cleanFileName("C:\\fotky\\lipno-2027.jpg", "image/jpeg")).toBe("lipno-2027.jpg")
    expect(cleanFileName("../../etc/pa<ss>wd.png", "image/png")).toBe("passwd.png")
  })

  it("falls back to a name by the type", () => {
    expect(cleanFileName(undefined, "image/png")).toBe("photo.png")
    expect(cleanFileName("", "image/jpeg")).toBe("photo.jpg")
  })
})

describe("PHONE_PATTERN", () => {
  it.each(["+420 777 000 001", "777000001", "02 1234-5678"])("accepts %s", (phone) => {
    expect(PHONE_PATTERN.test(phone)).toBe(true)
  })

  it.each(["abc", "12", "+420 777 000 00x", "++420777000001"])("rejects %s", (phone) => {
    expect(PHONE_PATTERN.test(phone)).toBe(false)
  })
})
