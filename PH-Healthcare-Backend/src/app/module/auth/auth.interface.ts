import type { Role } from "../../../generated/prisma/browser";

export interface ILoginUserPayload {
  email: string;
  password: string;
}

export interface IRegisterPatientPayload {
  name: string;
  email: string;
  password: string;
  patient: {
    contactNumber?: string;
  };
}
export interface IVerifyEmailPayload {
  email: string;
  otp: string;
}

export interface IRequestUser {
  userId: string;
  email: string;
  name: string;
  role: Role;
}
export interface IGoogleLogin {
  IdToken: string;
}

export interface IForgotPayload {
  email: string;
}
export interface IResetPayload {
  email: string;
  otp: string;
  newPassword: string;
}
