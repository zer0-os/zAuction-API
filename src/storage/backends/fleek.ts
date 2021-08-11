import * as env from "env-var";
import fleekStorage, { getInput, getOptionsValues, uploadInput } from "@fleekhq/fleek-storage-js";

const fleekAuth = () => {
  return {
    apiKey: env.get(`FLEEK_STORAGE_API_KEY`).required().asString(),
    apiSecret: env.get(`FLEEK_STORAGE_API_SECRET`).required().asString()
  };
};

export const uploadFile = async (
  filename: string,
  data: Buffer | string,
  bucket?: string
): Promise<fleekStorage.uploadOutput> => {
  const uploadRequest: uploadInput = {
    ...fleekAuth(),
    key: filename,
    bucket,
    data,
  };

  const file = await fleekStorage.upload(uploadRequest);

  return file;
};

export const downloadFile = async (filename: string, bucket?: string) => {
  const downloadRequest: getInput = {
    ...fleekAuth(),
    key: filename,
    bucket
  }

  const file = await fleekStorage.get(downloadRequest);

  return file.data;
}
