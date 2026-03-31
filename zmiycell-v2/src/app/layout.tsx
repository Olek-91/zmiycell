import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ShiftBattery, RockRadio, Navigation, MobileMenu } from "@/components/Shell";
import { Zap } from "lucide-react";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  variable: "--font-geist-mono", // Using this existing variable name that was set in CSS previously
});

export const metadata: Metadata = {
  title: "zmiyCell OS v1.0",
  description: "Industrial Production & Warehouse Manager",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className={`h-full flex flex-col md:flex-row bg-background text-foreground font-mono selection:bg-toxic selection:text-black ${jetbrainsMono.variable}`}>
        
        {/* Sidebar - Desktop Only */}
        <aside className="hidden md:flex w-64 flex-shrink-0 border-r border-edge flex-col bg-card z-20">
          <div className="p-6 border-b border-edge flex items-center gap-3">
            <Zap className="text-toxic fill-toxic/20" size={24} />
            <span className="text-lg font-black tracking-tighter">zmiyCell OS</span>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <Navigation />
          </div>
          
          <div className="p-4 border-t border-edge text-[8px] text-foreground/20 font-bold uppercase tracking-widest">
            Built by Antigravity AI
          </div>
        </aside>

        {/* Main Area */}
        <div className="flex-1 flex flex-col min-w-0 relative h-full overflow-hidden">
          
          {/* Header */}
          <div className="fixed top-0 left-0 w-full h-16 border-b border-edge flex items-center justify-between px-6 md:px-8 bg-card z-50">
            <div className="flex items-center gap-3 md:gap-4">
              <MobileMenu />
              <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 text-[9px] md:text-xs font-bold text-foreground/40">
                <span className="text-toxic hidden xs:inline">ONLINE</span>
                <span className="hidden md:inline">•</span>
                <span className="uppercase">{new Date().toLocaleDateString('uk-UA')}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <RockRadio />
              <div className="hidden xs:block w-px h-4 bg-edge" />
              <ShiftBattery />
            </div>
          </div>

          {/* Content */}
          <main className="flex-1 overflow-y-auto p-4 md:p-8 relative mt-16">
            {children}
          </main>
        </div>

      </body>
    </html>
  );
}
