const maxRetries = 3;
const retryDelay = 2000;
/* eslint-disable */
export function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function retry<Type>(fn: () => Promise<Type>) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch {
      await delay(retryDelay * (i + 1)); // increase retry delay with each failure
    }
  }
  console.warn(
    `Could not successfully execute ${fn.name} after ${maxRetries} tries.`
  );
}
