import * as fleek from "../backends/fleek";
import * as env from "env-var";

import { StorageService, UploadedFile } from "storage";

const defaultBucket = env.get("DEFAULT_FLEEK_BUCKET").asString();

export interface FleekUploadedFile extends UploadedFile {
  fleekHash: string;
}

export const create = (bucket?: string): StorageService => {
  bucket = bucket ?? defaultBucket;

  const uploadFile = async (filename: string, data: Buffer | string) => {
    const res = await fleek.uploadFile(filename, data, bucket);
    const file: FleekUploadedFile = {
      name: filename,
      publicUrl: res.publicUrl,
      ipfsHash: res.hashV0,
      fleekHash: res.hash,
    };

    return file;
  };

  const downloadFile = async (filename: string) => {
    const res = await fleek.downloadFile(filename, bucket);
    return res;
  }

  const fileExists = async (filename: string) => {
    const res = await fleek.fileExists(filename, bucket);
    return res;
  }

  const storageService = {
    uploadFile,
    downloadFile,
    fileExists
  };

  return storageService;
};
