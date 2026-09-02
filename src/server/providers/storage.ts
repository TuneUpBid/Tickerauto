import { createReadStream, promises as fs } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { createHash, createHmac } from "node:crypto";
import { getConfig } from "../config";

export interface StoredObject {
  key: string;
  sha256: string;
  byteSize: number;
}

export interface DocumentStorage {
  put(key: string, bytes: Buffer, contentType: string): Promise<StoredObject>;
  getSignedUrl(key: string, expiresInSeconds: number): Promise<string>;
  read(key: string): Promise<Buffer>;
}

export class LocalDocumentStorage implements DocumentStorage {
  constructor(private readonly root: string) {}

  async put(key: string, bytes: Buffer): Promise<StoredObject> {
    const dest = path.join(this.root, key);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, bytes);
    return {
      key,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      byteSize: bytes.length,
    };
  }

  async getSignedUrl(key: string, expiresInSeconds: number): Promise<string> {
    const expires = Date.now() + expiresInSeconds * 1000;
    const sig = signLocal(key, expires);
    return `/api/documents/local?key=${encodeURIComponent(key)}&exp=${expires}&sig=${sig}`;
  }

  async read(key: string): Promise<Buffer> {
    return fs.readFile(path.join(this.root, key));
  }

  createReadStream(key: string): Readable {
    return createReadStream(path.join(this.root, key));
  }
}

export class UnconfiguredS3Storage implements DocumentStorage {
  async put(): Promise<StoredObject> {
    throw new Error(
      "S3 storage is not configured. Set S3_* environment variables or use STORAGE_PROVIDER=local.",
    );
  }
  async getSignedUrl(): Promise<string> {
    throw new Error("S3 storage is not configured.");
  }
  async read(): Promise<Buffer> {
    throw new Error("S3 storage is not configured.");
  }
}

function signLocal(key: string, expires: number): string {
  const secret = getConfig().sessionSecret;
  return createHmac("sha256", secret).update(`${key}:${expires}`).digest("hex");
}

export function verifyLocalSignature(key: string, expires: number, sig: string): boolean {
  if (Date.now() > expires) return false;
  const expected = signLocal(key, expires);
  return expected === sig;
}

export function getDocumentStorage(): DocumentStorage {
  const config = getConfig();
  if (config.storage.provider === "s3") {
    if (!config.storage.s3.bucket || !config.storage.s3.accessKeyId) {
      return new UnconfiguredS3Storage();
    }
    return new UnconfiguredS3Storage();
  }
  return new LocalDocumentStorage(config.storage.localDir);
}
