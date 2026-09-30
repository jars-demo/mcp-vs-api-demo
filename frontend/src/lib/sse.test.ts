import assert from "node:assert/strict";
import { test } from "node:test";
import { createSseParser } from "./sse";

test("parses messages split across chunks", () => {
  const messages: string[] = [];
  const parse = createSseParser((data) => messages.push(data));
  parse('data: {"a":');
  parse('1}\n\ndata: {"b":2}\n');
  parse("\n");
  assert.deepEqual(messages, ['{"a":1}', '{"b":2}']);
});

test("handles Windows line endings", () => {
  const messages: string[] = [];
  createSseParser((data) => messages.push(data))('data: {"ok":true}\r\n\r\n');
  assert.deepEqual(messages, ['{"ok":true}']);
});
