import type {Metadata} from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Link from 'next/link';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Home, Image as ImageIcon, BookOpen } from 'lucide-react'; // Added BookOpen for Academic Module

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Firebase Studio GenAI Apps',
  description: 'Collection of AI-powered tools including Image Alchemist and Academic Module Creator.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}>
        <header className="bg-card border-b sticky top-0 z-50">
          <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="text-2xl font-bold text-primary hover:opacity-80 transition-opacity">
                GenAI Suite
              </Link>
              <div className="flex items-center space-x-4 sm:space-x-6">
                <Link href="/" className="flex items-center text-foreground hover:text-primary transition-colors">
                  <ImageIcon className="h-5 w-5 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Image Alchemist</span>
                  <span className="sm:hidden">Images</span>
                </Link>
                <Link href="/academic-module" className="flex items-center text-foreground hover:text-primary transition-colors">
                  <BookOpen className="h-5 w-5 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Module Creator</span>
                  <span className="sm:hidden">Modules</span>
                </Link>
              </div>
            </div>
          </nav>
        </header>
        <div className="flex-grow">
         {children}
        </div>
        <Toaster />
      </body>
    </html>
  );
}
