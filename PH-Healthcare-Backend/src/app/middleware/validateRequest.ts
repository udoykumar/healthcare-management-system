/** biome-ignore-all lint/style/useImportType: <explanation> */
// biome-ignore assist/source/organizeImports: <explanation>
import z from "zod";
import { catchAsync } from "../utils/catchAsync";
import { NextFunction, Request, Response } from "express";

export const validateObject = (zodObject: z.ZodObject) => {
  return catchAsync((req: Request, res: Response, next: NextFunction) => {
    // const payload = req.body ? req.body : {}
    const payload = req.body ?? {};

    const result = zodObject.safeParse(payload);
    if (!result.success) {
      console.log(result.error);
      console.log(result.error.issues);
      throw new Error(result.error.issues[0].message);
    }
    req.body = result.data;
    next();
  });
};
