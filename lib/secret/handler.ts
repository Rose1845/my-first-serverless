export const handler = async (): Promise<{
  statusCode: number;
  body: string;
}> => {
  return Promise.resolve({
    statusCode: 200,
    body: "CAUTION !!! THIS IS VERY SECRET",
  });
};
