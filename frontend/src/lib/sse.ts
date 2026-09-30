// A tiny Server-Sent Events parser.
//
// The browser's EventSource only supports GET requests, but our chat
// endpoints are POST. So we read the response body ourselves and split it
// into `data: {...}` messages separated by a blank line.

export function createSseParser(onMessage: (data: string) => void): (chunk: string) => void {
  let buffer = "";

  return (chunk: string) => {
    buffer += chunk.replace(/\r\n/g, "\n");
    let boundary = buffer.indexOf("\n\n");

    while (boundary !== -1) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);

      const data = block
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).replace(/^ /, ""))
        .join("\n");
      if (data) onMessage(data);

      boundary = buffer.indexOf("\n\n");
    }
  };
}
