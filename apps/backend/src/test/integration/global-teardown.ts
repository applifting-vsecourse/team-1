export default function globalTeardown(): void {
  globalThis.__TOGENA_TEST_SERVER__?.kill()
}
