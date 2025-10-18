import { NextRequest } from "next/server";
import { prisma } from "../../../lib/prisma";
import { verifyPassword } from "../../../lib/password";
import { generateToken } from "../../../lib/auth";
import { createResponse, createErrorResponse } from "../../../lib/api-utils";
import { loginSchema } from "../../../lib/validations";
import jwt from 'jsonwebtoken';

// POST /api/auth/login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        merchant: {
          select: {
            id: true,
            businessName: true,
            onboardingStatus: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return createErrorResponse("Invalid credentials", 401);
    }

    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return createErrorResponse("Invalid credentials", 401);
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      // Generate temporary token for 2FA verification
      const tempToken = jwt.sign(
        { 
          userId: user.id, 
          type: 'temp_2fa',
          email: user.email 
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '10m' } // 10 minutes to complete 2FA
      )

      return createResponse({
        requires2FA: true,
        tempToken,
        message: '2FA verification required'
      }, 200, '2FA verification required')
    }

    // Update last login for non-2FA users
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      merchantId: user.merchantId || undefined,
    });

    // Create session
    await prisma.userSession.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      },
    });

    const { password: _, ...userWithoutPassword } = user;

    return createResponse(
      {
        user: userWithoutPassword,
        token,
      },
      200,
      "Login successful"
    );
  } catch (error) {
    console.error("Login error:", error);
    return createErrorResponse("Login failed", 500);
  }
}
