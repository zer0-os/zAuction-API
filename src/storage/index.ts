export { adapters } from "./adapters";
import { InsertOneResult, Document } from "mongodb";
import { Bid } from "../types";

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

// TODO rename when successfully overridden existing StorageService
export interface MongoStorageService {
  uploadData: (data: Bid) => Promise<InsertOneResult<Document>>;
  queryData: (query?: Object) => Promise<Document[]>;
  deleteData:(data: Bid) => Promise<any>;
}
