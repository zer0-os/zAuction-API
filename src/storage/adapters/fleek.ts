import * as fleek from "../backends/fleek";
import * as env from "env-var";

import { SafeDownloadedFile, StorageService, UploadedFile } from "../";

const defaultBucket = env.get("DEFAULT_FLEEK_BUCKET").asString();

export interface FleekUploadedFile extends UploadedFile {
  fleekHash: string;
}

export const create = (bucket?: string, prefix?: string): StorageService => {
  bucket = bucket ?? defaultBucket;
  prefix = prefix ?? "";

  const uploadFile = async (filename: string, data: Buffer | string) => {
    const res = await fleek.uploadFile(`${prefix}${filename}`, data, bucket);
    const file: FleekUploadedFile = {
      name: filename,
      publicUrl: res.publicUrl,
      ipfsHash: res.hashV0,
      fleekHash: res.hash,
    };

    return file;
  };

  const downloadFile = async (filename: string) => {
    const res = await fleek.downloadFile(`${prefix}${filename}`, bucket);
    return res;
  };

  const safeDownloadFile = async (filename: string) => {
    const safeFile: SafeDownloadedFile = {
      exists: false,
      data: undefined,
    };

    try {
      const res = await fleek.downloadFile(`${prefix}${filename}`, bucket);
      safeFile.data = res;
      safeFile.exists = true;
    } catch {
      // intentional
    }

    return safeFile;
  };

  const storageService = {
    uploadFile,
    downloadFile,
    safeDownloadFile,
  };

  return storageService;
};
