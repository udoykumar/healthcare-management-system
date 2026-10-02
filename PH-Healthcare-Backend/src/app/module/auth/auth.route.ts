// biome-ignore assist/source/organizeImports: <explanation>
import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { AuthController } from "./auth.controller";
import { userValidation } from "./auth.validation";
import { validateObject } from "../../middleware/validateRequest";

const router = Router();

router.post(
  "/register",
  validateObject(userValidation.patiendRegistrationZodSchema),
  AuthController.registerPatient,
);
router.post(
  "/login",
  validateObject(userValidation.loginZodSchema),
  AuthController.loginUser,
);
router.get(
  "/me",
  auth(Role.ADMIN, Role.DOCTOR, Role.PATIENT, Role.SUPER_ADMIN),
  validateObject(userValidation.getMeZodSchema),
  AuthController.getMe,
);
router.post("/refresh-token", AuthController.refreshToken);
router.post("/google", AuthController.googleLogin);
router.post(
  "/forgot-password",
  validateObject(userValidation.ForgotPasswordZodSchema),
  AuthController.forgotPassword,
);
router.post(
  "/reset-password",
  validateObject(userValidation.ResetPasswordZodSchema),
  AuthController.resetPassword,
);
export const AuthRoutes = router;
