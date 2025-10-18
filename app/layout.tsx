import type { Metadata } from "next";
import { Red_Hat_Display } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./lib/auth-context";
import { NotificationProvider } from "./lib/notification-context";
import { WebSocketProvider } from "./lib/websocket-context";
import { Toaster } from "react-hot-toast";

const redHatDisplay = Red_Hat_Display({
  subsets: ["latin"],
  variable: "--font-red-hat-display",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "SJFulfillment Platform",
  description: "Complete fulfillment management platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${redHatDisplay.variable} font-sans antialiased`}>
        <AuthProvider>
          <NotificationProvider>
            <WebSocketProvider>
              {children}
              <Toaster position="top-right" />
            </WebSocketProvider>
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
