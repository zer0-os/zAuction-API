export { adapters } from "./adapters";

export interface UploadedFile {
  name: string;
  publicUrl: string;
  ipfsHash: string;
}

export interface SafeDownloadedFile {
  exists: boolean;
  data: any;
}

export interface StorageService {
  uploadFile: (
    filename: string,
    data: Buffer | string
  ) => Promise<UploadedFile>;
  downloadFile: (
    filename: string
  ) => Promise<any>;
  safeDownloadFile: (
    filename: string
  ) => Promise<SafeDownloadedFile>;
}