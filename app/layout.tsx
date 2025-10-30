import type { Metadata } from "next";
import { Fira_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { UserProvider } from "@/hooks/useUser";

const firaSans = Fira_Sans({
  weight: '700',
  style: 'italic',
  subsets: ["latin"],
  variable: "--font-fira-sans",
});

export const metadata: Metadata = {
  title: "Sistema ASLI - Gestión Logística",
  description: "Sistema de gestión para exportaciones marítimas y aéreas",
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/logo-asli.png', sizes: '192x192', type: 'image/png' }
    ],
    apple: [
      { url: '/logo-asli.png', sizes: '180x180', type: 'image/png' }
    ]
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${firaSans.variable} antialiased`}
        style={{ fontFamily: 'var(--font-fira-sans), sans-serif' }}
      >
        <ThemeProvider>
          <UserProvider>
            {children}
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
