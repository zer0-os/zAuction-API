export { adapters } from "./adapters";

export interface UploadedFile {
  name: string;
  publicUrl: string;
  ipfsHash: string;
}

export interface StorageService {
  uploadFile: (
    filename: string,
    data: Buffer | string
  ) => Promise<UploadedFile>;
  downloadFile: (
    filename: string
  ) => Promise<any>
  fileExists: (
    filename: string
  ) => Promise<boolean>
}