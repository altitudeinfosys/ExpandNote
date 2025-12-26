import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/sonner";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ExpandNote - AI-Powered Note Taking",
  description: "Create smarter notes with AI automation, intelligent tagging, and seamless sync. Access 40+ AI models including GPT-4, Claude, and Gemini. The note-taking app that thinks with you.",
  keywords: ["note taking", "AI notes", "smart notes", "GPT-4", "Claude", "markdown", "offline notes", "voice notes"],
  authors: [{ name: "ExpandNote" }],
  creator: "ExpandNote",
  openGraph: {
    title: "ExpandNote - AI-Powered Note Taking",
    description: "Create smarter notes with AI automation, intelligent tagging, and seamless sync. Access 40+ AI models. The note-taking app that thinks with you.",
    type: "website",
    locale: "en_US",
    siteName: "ExpandNote",
  },
  twitter: {
    card: "summary_large_image",
    title: "ExpandNote - AI-Powered Note Taking",
    description: "Create smarter notes with AI automation, intelligent tagging, and seamless sync. Access 40+ AI models.",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: '/logo-icon.svg', type: 'image/svg+xml', media: '(prefers-color-scheme: light)' },
      { url: '/logo-icon-dark.svg', type: 'image/svg+xml', media: '(prefers-color-scheme: dark)' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${spaceGrotesk.variable} font-sans antialiased`}
      >
        <ErrorBoundary>
          <ThemeProvider>
            <AuthProvider>
              {children}
              <Toaster position="bottom-right" richColors />
            </AuthProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
