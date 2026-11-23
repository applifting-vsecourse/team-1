/**
 * Offers CSV text as a file download. The BOM makes Excel read the UTF-8 file with its diacritics;
 * the CSV text itself stays as the server sent it.
 */
export function downloadCsv(fileName: string, text: string): void {
  const url = URL.createObjectURL(new Blob(["﻿", text], { type: "text/csv;charset=utf-8" }))
  const link = document.createElement("a")
  link.href = url
  link.download = ensureCsvExtension(fileName)
  // Attached to the DOM and revoked later: otherwise some browsers ignore `download` and save the
  // blob under its generated name without an extension.
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function ensureCsvExtension(fileName: string): string {
  return /\.csv$/i.test(fileName) ? fileName : `${fileName}.csv`
}

/** `vypis.csv` → `vypis-result.csv` */
export function resultFileName(uploadedName: string): string {
  const base = uploadedName.replace(/\.[^./\\]*$/, "") || "statement"
  return `${base}-result.csv`
}
