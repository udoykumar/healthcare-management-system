import z from "zod";

const patiendRegistrationZodSchema = z.object({
  name: z.string("Not a String").min(3, "Name must be 3 carater"),
  email: z.email(),
  password: z
    .string()
    .min(8, "Password must minimum 8 Character Long")
    .regex(/[A-Z]/, "Password must contain atleast 1 uppercase")
    .regex(/[a-z]/, "Password must contain atleast 1 Lowercase")
    .regex(/[0-9]/, "Password must contain atleast 1 number")
    .regex(
      /[^a-zA-Z0-9]/,
      "Password must contain at least one special character",
    ),

  patient: z
    .object({
      contactNumber: z.string().optional(),
    })
    .optional(),
});

const loginZodSchema = z.object({
  email: z.email(),
  password: z
    .string()
    .min(8, "Password must minimum 8 Character Long")
    .regex(/[A-Z]/, "Password must contain atleast 1 uppercase")
    .regex(/[a-z]/, "Password must contain atleast 1 Lowercase")
    .regex(/[0-9]/, "Password must contain atleast 1 number")
    .regex(
      /[^a-zA-Z0-9]/,
      "Password must contain at least one special character",
    ),
});

const getMeZodSchema = z.object({
  userId: z.string("is not a string"),
});

const ForgotPasswordZodSchema = z.object({
  email: z.email(),
});

const ResetPasswordZodSchema = z.object({
  email: z.email(),
  otp: z.string("otp error").length(6),
  newPassword: z
    .string("pass ero")
    .min(8, "Password must minimum 8 Character Long")
    .regex(/[A-Z]/, "Password must contain atleast 1 uppercase")
    .regex(/[a-z]/, "Password must contain atleast 1 Lowercase")
    .regex(/[0-9]/, "Password must contain atleast 1 number")
    .regex(
      /[^a-zA-Z0-9]/,
      "Password must contain at least one special character",
    ),
});
export const userValidation = {
  patiendRegistrationZodSchema,
  loginZodSchema,
  getMeZodSchema,
  ForgotPasswordZodSchema,
  ResetPasswordZodSchema,
};
