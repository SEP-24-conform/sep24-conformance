import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

export interface MockAnchorOptions {
  toml?: string;
  info?: unknown;
  infoStatus?: number;
}

export interface MockAnchor {
  server: Server;
  url: string;
  close: () => Promise<void>;
}

/**
 * Spins up a real HTTP server on loopback serving /.well-known/stellar.toml
 * and /sep24/info, so tests exercise actual network + parsing code paths
 * instead of mocking fetch.
 */
export async function startMockAnchor(opts: MockAnchorOptions): Promise<MockAnchor> {
  const server = createServer((req, res) => {
    if (req.url === "/.well-known/stellar.toml") {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end(opts.toml ?? "");
      return;
    }
    if (req.url === "/sep24/info") {
      res.writeHead(opts.infoStatus ?? 200, { "content-type": "application/json" });
      res.end(JSON.stringify(opts.info ?? {}));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  const url = `http://127.0.0.1:${port}`;

  return {
    server,
    url,
    close: () => new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve()))),
  };
}
