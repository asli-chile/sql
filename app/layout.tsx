import type { Metadata } from "next";
import { Fira_Sans } from "next/font/google";
import "./globals.css";
import { LoadingProvider } from '@/contexts/LoadingContext';
import { GlobalLoading } from '@/components/ui/GlobalLoading';
import { UserProvider } from '@/hooks/useUser';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ErrorBoundary } from "@/components/ErrorBoundary";
// import { ConsoleBanner } from "@/components/ConsoleBanner";

const firaSans = Fira_Sans({
  weight: '400',
  style: 'normal',
  subsets: ["latin"],
  variable: "--font-fira-sans",
});

export const metadata: Metadata = {
  title: "ASLI, Logística y Comercio Exterior",
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
      >
        <ErrorBoundary>
          <LoadingProvider>
            <ThemeProvider>
              <UserProvider>
                {children}
                <GlobalLoading />
                {/* <ConsoleBanner /> */}
              </UserProvider>
            </ThemeProvider>
          </LoadingProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
