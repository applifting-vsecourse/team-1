/** Keep the shared API hooks while measuring the actual bytes sent on HTTP/1, HTTP/2 and HTTP/3. */
export function photoUploadTransport(
  file: File,
  onProgress: (fraction: number) => void,
): typeof fetch {
  return (input, init) => {
    const request = new Request(input, init)
    return new Promise<Response>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      const abort = () => xhr.abort()
      request.signal.throwIfAborted()
      xhr.open(request.method, request.url)
      xhr.withCredentials = request.credentials === "include"
      request.headers.forEach((value, header) => xhr.setRequestHeader(header, value))
      xhr.upload.onprogress = ({ loaded, total, lengthComputable: isLengthComputable }) => {
        if (isLengthComputable && total > 0) onProgress(loaded / total)
      }
      xhr.onload = () => {
        const headers = new Headers()
        for (const line of xhr.getAllResponseHeaders().trim().split(/\r?\n/)) {
          const separator = line.indexOf(":")
          if (separator > 0) {
            headers.append(line.slice(0, separator), line.slice(separator + 1).trim())
          }
        }
        resolve(
          new Response(xhr.responseText || null, {
            status: xhr.status,
            statusText: xhr.statusText,
            headers,
          }),
        )
      }
      xhr.onerror = () => reject(new TypeError("Network request failed"))
      xhr.onabort = () => reject(new DOMException("Upload aborted", "AbortError"))
      xhr.onloadend = () => request.signal.removeEventListener("abort", abort)
      request.signal.addEventListener("abort", abort, { once: true })
      xhr.send(file)
    })
  }
}
