import { NextRequest } from "next/server";
import { prisma } from "../../../lib/prisma";
import {
  createResponse,
  createErrorResponse,
  withRole,
} from "../../../lib/api-utils";
import { JWTPayload } from "../../../lib/auth";
import { updateMerchantSchema } from "../../../lib/validations";
import bcrypt from "bcryptjs";
import * as speakeasy from "speakeasy";

// GET /api/merchants/[id]
export const GET = withRole(
  ["SJFS_ADMIN", "MERCHANT_ADMIN"],
  async (
    request: NextRequest,
    user: JWTPayload,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    try {
      const { id: merchantId } = await params;

      // Check permissions
      if (user.role === "MERCHANT_ADMIN" && user.merchantId !== merchantId) {
        return createErrorResponse("Forbidden", 403);
      }

      const merchant = await prisma.merchant.findUnique({
        where: { id: merchantId },
        include: {
          users: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              role: true,
              isActive: true,
              lastLogin: true,
              createdAt: true,
            },
          },
          subscriptions: {
            include: {
              servicePlan: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  basePrice: true,
                  features: true,
                },
              },
              addons: {
                include: {
                  addonService: {
                    select: {
                      id: true,
                      name: true,
                      description: true,
                      price: true,
                      pricingType: true,
                    },
                  },
                },
              },
            },
          },
          merchantServiceSubscriptions: {
            select: {
              id: true,
              status: true,
              service: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                },
              },
            },
          },
          products: {
            select: {
              id: true,
              sku: true,
              name: true,
              category: true,
              isActive: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 10,
          },
          orders: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              totalAmount: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 10,
          },
          warehouses: {
            select: {
              id: true,
              name: true,
              code: true,
              city: true,
              state: true,
              isActive: true,
            },
          },
          billingRecords: {
            select: {
              id: true,
              billingType: true,
              description: true,
              amount: true,
              status: true,
              dueDate: true,
            },
            orderBy: { dueDate: "asc" },
          },
          _count: {
            select: {
              products: true,
              orders: true,
              users: true,
            },
          },
        },
      });

      if (!merchant) {
        return createErrorResponse("Merchant not found", 404);
      }

      // Calculate accumulated charges from billing records
      const accumulatedCharges = {
        total: 0,
        paid: 0,
        pending: 0,
        overdue: 0
      };

      // Calculate from the included billing records
      merchant.billingRecords.forEach(record => {
        accumulatedCharges.total += Number(record.amount);
        
        switch (record.status) {
          case 'PAID':
            accumulatedCharges.paid += Number(record.amount);
            break;
          case 'PENDING':
            accumulatedCharges.pending += Number(record.amount);
            break;
          case 'OVERDUE':
            accumulatedCharges.overdue += Number(record.amount);
            break;
        }
      });

      const merchantWithCharges = {
        ...merchant,
        accumulatedCharges
      };

      return createResponse(merchantWithCharges, 200, "Merchant retrieved successfully");
    } catch (error) {
      console.error("Get merchant error:", error);
      return createErrorResponse("Failed to retrieve merchant", 500);
    }
  }
);

// PUT /api/merchants/[id]
export const PUT = withRole(
  ["SJFS_ADMIN", "MERCHANT_ADMIN"],
  async (
    request: NextRequest,
    user,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    try {
      const { id: merchantId } = await params;
      const body = await request.json();
      const updateData = updateMerchantSchema.parse(body);

      // Check if merchant exists
      const existingMerchant = await prisma.merchant.findUnique({
        where: { id: merchantId },
        select: { id: true, onboardingStatus: true },
      });

      if (!existingMerchant) {
        return createErrorResponse("Merchant not found", 404);
      }

      // Check permissions
      if (user.role === "MERCHANT_ADMIN" && user.merchantId !== merchantId) {
        return createErrorResponse("Forbidden", 403);
      }

      // Merchant admins cannot change onboarding status
      if (user.role === "MERCHANT_ADMIN") {
        delete updateData.onboardingStatus;
      }

      // Update merchant
      const updatedMerchant = await prisma.merchant.update({
        where: { id: merchantId },
        data: updateData,
        include: {
          users: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
      });

      // Log the change
      await prisma.auditLog.create({
        data: {
          user: {
            connect: { id: user.userId }
          },
          action: "UPDATE_MERCHANT",
          entityType: "merchants",
          entityId: merchantId,
          newValues: updateData,
        },
      });

      return createResponse(
        updatedMerchant,
        200,
        "Merchant updated successfully"
      );
    } catch (error) {
      console.error("Update merchant error:", error);
      if (error instanceof Error && error.message.includes("validation")) {
        return createErrorResponse("Invalid input data", 400);
      }
      return createErrorResponse("Failed to update merchant", 500);
    }
  }
);

// DELETE /api/merchants/[id]
export const DELETE = withRole(
  ["SJFS_ADMIN", "MERCHANT_ADMIN"],
  async (
    request: NextRequest,
    user,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    try {
      const { id: merchantId } = await params;
      
      // Parse request body for verification
      let password: string | undefined; // merchant self-deletion password
      let twoFactorToken: string | undefined; // merchant self-deletion 2FA token
      let adminPassword: string | undefined; // admin password when admin deletes a merchant
      
      try {
        const body = await request.json();
        password = body.password;
        twoFactorToken = body.twoFactorToken;
        adminPassword = body.adminPassword;
      } catch {
        // request body may be empty in some cases
      }

      // Check if merchant exists
      const existingMerchant = await prisma.merchant.findUnique({
        where: { id: merchantId },
        select: { 
          id: true, 
          businessName: true,
          users: {
            select: {
              id: true,
              email: true,
              role: true,
              password: true,
              twoFactorEnabled: true,
              twoFactorSecret: true,
              backupCodes: true
            }
          },
          billingRecords: {
            where: {
              status: {
                in: ['PENDING', 'OVERDUE']
              }
            },
            select: {
              id: true,
              amount: true,
              status: true
            }
          },
          merchantServiceSubscriptions: {
            where: {
              status: 'ACTIVE'
            },
            select: {
              id: true,
              createdAt: true,
              updatedAt: true,
              service: {
                select: {
                  name: true
                }
              }
            }
          }
        },
      });

      if (!existingMerchant) {
        return createErrorResponse("Merchant not found", 404);
      }

      const isSelfDeletion = user.merchantId === merchantId;
      const isAdmin = user.role === 'SJFS_ADMIN';

      // For merchant self-deletion, enforce conditions
      if (isSelfDeletion && user.role === 'MERCHANT_ADMIN') {
        // Find the current user in the merchant's users
        const currentUser = existingMerchant.users.find(u => u.id === user.userId);
        
        if (!currentUser) {
          return createErrorResponse("User not found", 404);
        }

        // REQUIRE PASSWORD VERIFICATION
        if (!password) {
          return createErrorResponse("Password is required to delete your account", 400);
        }

        const validPassword = await bcrypt.compare(password, currentUser.password);
        
        if (!validPassword) {
          return createErrorResponse("Invalid password", 401);
        }

        // REQUIRE 2FA VERIFICATION IF ENABLED
        if (currentUser.twoFactorEnabled) {
          if (!twoFactorToken) {
            return createErrorResponse("2FA verification code is required", 400);
          }
          
          // Try TOTP verification first
          let verified = speakeasy.totp.verify({
            secret: currentUser.twoFactorSecret!,
            encoding: 'base32',
            token: twoFactorToken,
            window: 2
          });

          // If TOTP fails, check backup codes
          if (!verified && currentUser.backupCodes && currentUser.backupCodes.length > 0) {
            verified = currentUser.backupCodes.includes(twoFactorToken);
            
            // If backup code used, remove it from the list
            if (verified) {
              await prisma.user.update({
                where: { id: user.userId },
                data: {
                  backupCodes: currentUser.backupCodes.filter(code => code !== twoFactorToken)
                }
              });
            }
          }

          if (!verified) {
            return createErrorResponse("Invalid 2FA verification code or backup code", 401);
          }
        }
        // Check for outstanding debts
        const outstandingDebt = existingMerchant.billingRecords.reduce(
          (total, record) => total + Number(record.amount), 
          0
        );

        if (outstandingDebt > 0) {
          return createErrorResponse(
            `Cannot delete account. You have outstanding debts totaling ${outstandingDebt.toFixed(2)}. Please clear all debts before deleting your account.`,
            403
          );
        }

        // Check for active subscriptions
        if (existingMerchant.merchantServiceSubscriptions.length > 0) {
          // Check if any subscription has been updated within the last 24 hours
          const now = new Date();
          const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

          const recentlyActiveSubscriptions = existingMerchant.merchantServiceSubscriptions.filter(
            sub => new Date(sub.updatedAt) > twentyFourHoursAgo
          );

          if (recentlyActiveSubscriptions.length > 0) {
            const serviceNames = recentlyActiveSubscriptions.map(sub => sub.service.name).join(', ');
            return createErrorResponse(
              `Cannot delete account. You have active subscriptions (${serviceNames}) that must be inactive for at least 24 hours before account deletion.`,
              403
            );
          }
        }
      }

      // Admin can delete any merchant except their own (if they belong to one)
      if (isAdmin && isSelfDeletion) {
        return createErrorResponse("Admin cannot delete their own merchant account", 403);
      }

      // If admin is deleting, require admin password verification
      if (isAdmin && !isSelfDeletion) {
        if (!adminPassword) {
          return createErrorResponse('Admin password is required to delete a merchant account', 400)
        }
        const adminUser = await prisma.user.findUnique({
          where: { id: user.userId },
          select: { id: true, password: true }
        })
        if (!adminUser) {
          return createErrorResponse('Admin user not found', 404)
        }
        const validAdminPassword = await bcrypt.compare(adminPassword, adminUser.password)
        if (!validAdminPassword) {
          return createErrorResponse('Invalid admin password', 401)
        }
      }

      // PERMANENT DELETION - Delete all associated data first (cascade)
      
      // 1. Delete all staff users (with full cascade)
      const staffUsers = existingMerchant.users.filter(u => 
        u.role === 'MERCHANT_STAFF' || u.role === 'MERCHANT_ADMIN'
      );

      console.log(`Deleting ${staffUsers.length} staff users for merchant ${merchantId}`);
      for (const staffUser of staffUsers) {
        // Delete notifications
        await prisma.notification.deleteMany({
          where: { recipientId: staffUser.id }
        });
        
        // Delete password reset tokens
        await prisma.passwordResetToken.deleteMany({
          where: { userId: staffUser.id }
        });
        
        // Finally delete the user
        await prisma.user.delete({
          where: { id: staffUser.id }
        });
        console.log(`Permanently deleted user ${staffUser.email} and their related data`);
      }

      // 2. Delete API keys
      await prisma.apiKey.deleteMany({
        where: { merchantId }
      });

      // 3. Delete webhooks
      await prisma.webhook.deleteMany({
        where: { merchantId }
      });

      // 4. Delete merchant service subscriptions
      await prisma.merchantServiceSubscription.deleteMany({
        where: { merchantId }
      });

      // 5. Delete subscriptions
      await prisma.subscription.deleteMany({
        where: { merchantId }
      });

      // 6. Delete billing records
      await prisma.billingRecord.deleteMany({
        where: { merchantId }
      });

      // 7. Delete the merchant record (HARD DELETE - PERMANENT)
      console.log(`PERMANENTLY DELETING merchant ${merchantId}: ${existingMerchant.businessName}`);
      await prisma.merchant.delete({
        where: { id: merchantId }
      });
      
      console.log(`Merchant ${merchantId} PERMANENTLY DELETED from database`);

      // Log the deletion
      await prisma.auditLog.create({
        data: {
          user: {
            connect: { id: user.userId }
          },
          action: isSelfDeletion ? "SELF_DELETE_MERCHANT" : "DELETE_MERCHANT",
          entityType: "merchants",
          entityId: merchantId,
          oldValues: {
            businessName: existingMerchant.businessName,
            deletedStaffCount: staffUsers.length
          }
        },
      }).catch(err => {
        // If audit log fails (e.g., user already deleted), just log it
        console.error('Failed to create audit log:', err);
      });

      return createResponse(
        { 
          deletedStaffCount: staffUsers.length,
          message: isSelfDeletion 
            ? 'Your account and all associated staff accounts have been permanently deleted.' 
            : 'Merchant account and all associated staff accounts have been permanently deleted.'
        }, 
        200, 
        "Merchant deleted successfully"
      );
    } catch (error) {
      console.error("Delete merchant error:", error);
      return createErrorResponse("Failed to delete merchant", 500);
    }
  }
);
