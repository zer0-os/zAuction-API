import fleekStorage, { getInput, uploadInput } from "@fleekhq/fleek-storage-js";

const fleekAuth = () => {
  const key = process.env.FLEEK_STORAGE_API_KEY
  const secret = process.env.FLEEK_STORAGE_API_SECRET

  if (!key || !secret) {
    throw new ReferenceError("Fleek environment variables are not present")
  }

  return {
    apiKey: key,
    apiSecret: secret
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

export const downloadFile = async (
  filename: string,
  bucket?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> => {
  const downloadRequest: getInput = {
    ...fleekAuth(),
    key: filename,
    bucket,
  };

  const file = await fleekStorage.get(downloadRequest);

  return file.data;
};
