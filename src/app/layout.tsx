import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Inter, Space_Grotesk } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { HiddenHabitsProvider } from "@/components/hidden-habits-context";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Used only by the Finance module (scoped via `.finance-theme` in globals.css), to match the
// Belanje reference app's typeface. Every other module keeps Plus Jakarta Sans.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

// Used only by the Focus session timer's big clock (`.fx-clock` in globals.css): crisp geometric
// tabular figures that read well at a huge size, in place of the body's humanist Plus Jakarta Sans.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-countdown",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: "Istiqamahly",
  description: "Track your five daily prayers, streaks, and progress.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Istiqamahly",
  },
};

export const viewport: Viewport = {
  themeColor: "#047857",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${inter.variable} ${spaceGrotesk.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background font-sans text-neutral-900">
        <HiddenHabitsProvider>{children}</HiddenHabitsProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
