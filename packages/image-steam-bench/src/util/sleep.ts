export default async (timeout = 10000): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, timeout).unref();
  });
};
