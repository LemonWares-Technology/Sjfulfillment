import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import axios from "axios";
import jwt from "jsonwebtoken";

const vonageAppId = process.env.VONAGE_APPLICATION_ID;
const vonagePrivateKeyB64 = process.env.VONAGE_PRIVATE_KEY; // base64-encoded PEM
const vonageFromNumber = process.env.VONAGE_VIRTUAL_NUMBER;

if (!vonageAppId || !vonagePrivateKeyB64 || !vonageFromNumber) {
  throw new Error("Missing Vonage configuration (VONAGE_APPLICATION_ID, VONAGE_PRIVATE_KEY, VONAGE_VIRTUAL_NUMBER)");
}

function getVonageJwt() {
  const now = Math.floor(Date.now() / 1000);
  const privateKey = Buffer.from(vonagePrivateKeyB64!, "base64").toString("utf8");
  const token = jwt.sign(
    {
      application_id: vonageAppId,
      iat: now,
      exp: now + 60 * 5,
      jti: `${now}-${Math.random().toString(36).slice(2)}`,
    },
    privateKey,
    { algorithm: "RS256" }
  );
  return token;
}

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const user = getCurrentUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const data = await req.json();
    const { to, type, customerName, customerRole, notificationType } = data;

    if (!to || !type || !customerName) {
      return NextResponse.json(
        { success: false, message: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Format the phone number to E.164 format (assuming NG default)
    const toRaw = String(to);
    let formattedNumber = toRaw.replace(/\D/g, "");
    if (!toRaw.startsWith("+")) {
      formattedNumber =
        "+234" +
        (formattedNumber.startsWith("0")
          ? formattedNumber.slice(1)
          : formattedNumber);
    } else {
      formattedNumber = toRaw;
    }

    // Log call settings (no trial redirect in Vonage)
    const isProd = process.env.NODE_ENV === "production";
    console.log("Call settings:", {
      originalNumber: formattedNumber,
      isProd,
      nodeEnv: process.env.NODE_ENV,
    });

    if (type === "audio") {
      // Determine base URL for callbacks (prefer explicit public URL env)
      const baseEnv =
        process.env.PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "";
      // Fallback to request origin if env not provided
      const requestOrigin = `${req.nextUrl.protocol}//${req.headers.get("host")}`;
      const baseUrl = baseEnv || requestOrigin;

      const safeRole = customerRole ? String(customerRole) : "";

      const eventUrl = new URL("/api/services/call/status", baseUrl).toString();

      const ncco = [
        {
          action: "talk",
          text: `Hello, this is a call from SJ Fulfillment regarding your order. ${customerName}${
            safeRole ? ` ${safeRole}` : ""
          } would like to speak with you.`,
          language: "en-GB",
          style: 0,
        },
        {
          action: "input",
          type: ["dtmf"],
          dtmf: { timeOut: 3, maxDigits: 1 },
        },
      ];

      const payload = {
        to: [{ type: "phone", number: formattedNumber }],
        from: { type: "phone", number: vonageFromNumber },
        ncco,
        event_url: [eventUrl],
      } as any;

      const token = getVonageJwt();
      const resp = await axios.post("https://api.nexmo.com/v1/calls", payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      });

      const call = resp.data;

      // Save the call record
      await prisma.callLog.create({
        data: {
          callSid: call.uuid || call.conversation_uuid || `${Date.now()}`,
          to: formattedNumber,
          from: vonageFromNumber!,
          type: "VOICE",
          status: "INITIATED",
          customerName,
          customerRole,
          notificationType,
        },
      });

      return NextResponse.json({ success: true, callSid: call.uuid });
    } else if (type === "video") {
      // Not implemented for Vonage in this iteration
      return NextResponse.json(
        { success: false, message: "Video calls are not yet supported with Vonage in this app. Use audio calls for now." },
        { status: 501 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Invalid call type" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Error initiating call:", error);
    const message = error?.response?.data?.title || error?.response?.data?.detail || error?.message || "Failed to initiate call";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
