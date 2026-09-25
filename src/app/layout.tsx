import type { Metadata } from "next";
import { MotionProvider } from "@/components/motion/motion-provider";
import { AuthProvider } from "@/context/auth-context";
import { LearningProvider } from "@/context/learning-context";
import AppNav from "@/components/AppNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "LearnOS AI – Learn with direction",
  description:
    "Your syllabus, your weaknesses, your way of learning. A more personal way to master what matters.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <AuthProvider>
          <LearningProvider>
            <MotionProvider>
              <AppNav />
              {children}
            </MotionProvider>
          </LearningProvider>
        </AuthProvider>
      </body>
    </html>
  );
}