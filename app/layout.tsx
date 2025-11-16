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
  title: "ASLI Gestión Logística",
  description: "Gestión logística para exportaciones marítimas y aéreas",
  icons: {
    icon: [
      { url: 'https://asli.cl/img/LOGO%20ASLI%20SIN%20FONDO%20BLLANCO.png', sizes: '32x32', type: 'image/png' },
      { url: 'https://asli.cl/img/LOGO%20ASLI%20SIN%20FONDO%20BLLANCO.png', sizes: '192x192', type: 'image/png' }
    ],
    apple: [
      { url: 'https://asli.cl/img/LOGO%20ASLI%20SIN%20FONDO%20BLLANCO.png', sizes: '180x180', type: 'image/png' }
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
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
      </head>
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
