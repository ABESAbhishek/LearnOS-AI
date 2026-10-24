import type { Metadata } from "next";
import { MotionProvider } from "@/components/motion/motion-provider";
import { AuthProvider } from "@/context/auth-context";
import { LearningProvider } from "@/context/learning-context";
import { ProfileProvider } from "@/context/profile-context";
import { DocumentProvider } from "@/context/document-context";
import AppNav from "@/components/AppNav";
import { FloatingAITutor } from "@/components/features/floating-ai-tutor";
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
          <ProfileProvider>
            <LearningProvider>
              <DocumentProvider>
                <MotionProvider>
                  <AppNav />
                  {children}
                  <FloatingAITutor />
                </MotionProvider>
              </DocumentProvider>
            </LearningProvider>
          </ProfileProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
