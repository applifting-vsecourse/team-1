export default function globalTeardown(): void {
  globalThis.__KEMP_TEST_SERVER__?.kill();
}
