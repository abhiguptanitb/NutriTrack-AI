import bcrypt from "bcrypt";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/appError.js";
import { AuthRepository } from "./auth.repository.js";

const authRepository = new AuthRepository();

export class AuthService {
  async register(input: { name: string; email: string; password: string }) {
    const email = input.email.toLowerCase();
    const existingUser = await authRepository.findByEmail(email);
    if (existingUser) {
      throw new AppError("Email is already registered", 409);
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await authRepository.create({
      name: input.name.trim(),
      email,
      passwordHash
    });

    return this.authPayload(user);
  }

  async login(input: { email: string; password: string }) {
    const user = await authRepository.findByEmail(input.email.toLowerCase());
    if (!user) {
      throw new AppError("Invalid email or password", 401);
    }

    const isValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isValid) {
      throw new AppError("Invalid email or password", 401);
    }

    return this.authPayload(user);
  }

  async getCurrentUser(userId: string) {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    return user;
  }

  private authPayload(user: { id: string; name: string; email: string }) {
    const signOptions: SignOptions = {
      expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"]
    };

    const token = jwt.sign({ sub: user.id, email: user.email, name: user.name }, env.JWT_SECRET, signOptions);

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    };
  }
}
