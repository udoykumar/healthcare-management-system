import bcrypt from "bcryptjs";
import { Role } from "../../generated/prisma/enums";
import { prisma } from "./prisma";
import config from "../config";

export const seedSuperAdmin = async () => {
  try {
    const superAdminExist = await prisma.user.findFirst({
      where: {
        role: Role.SUPER_ADMIN,
      },
    });

    if (superAdminExist) {
      console.log("supper admin exist");
      return;
    }

    const name = config.super_admin_name;
    const email = config.super_admin_email;
    const password = config.super_admin_password;

    if (!name || !email || !password) {
      console.log("super Admin Name, Email, Password Missing in env file");
    }

    const hashedPassword = await bcrypt.hash(
      password,
      Number(config.bcrypt_salt_rounds),
    );

    const superAdmin = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: Role.SUPER_ADMIN,
        emailVerified: true,
      },
    });
    console.log(superAdmin);
  } catch (error) {
    console.log("Error seeding super admin", error);
    await prisma.user.delete({
      where: {
        email: config.super_admin_email,
      },
    });
  }
};

export const seedAdmin = async () => {
  try {
    const adminExist = await prisma.user.findFirst({
      where: {
        role: Role.ADMIN,
      },
    });

    if (adminExist) {
      console.log("Admin already exist");
      return;
    }

    const name = config.admin_name;
    const email = config.admin_email;
    const password = config.admin_password;

    if (!name || !email || !password) {
      console.log("Admin Name, Email, Password Missing in env file");
    }

    const hashedPassword = await bcrypt.hash(
      password,
      Number(config.bcrypt_salt_rounds),
    );

    const adminCreate = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: Role.ADMIN,
        emailVerified: true,
      },
    });
    console.log("admin create", adminCreate);
  } catch (error) {
    console.log("Admin create error", error);
    await prisma.user.delete({
      where: {
        email: config.admin_email,
      },
    });
  }
};
