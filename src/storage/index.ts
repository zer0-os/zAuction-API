export { adapters } from "./adapters";

export interface UploadedFile {
  name: string;
  publicUrl: string;
  ipfsHash: string;
}

export interface SafeDownloadedFile {
  exists: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}

export interface StorageService {
  uploadFile: (
    filename: string,
    data: Buffer | string
  ) => Promise<UploadedFile>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  downloadFile: (filename: string) => Promise<any>;
  safeDownloadFile: (filename: string) => Promise<SafeDownloadedFile>;
}
