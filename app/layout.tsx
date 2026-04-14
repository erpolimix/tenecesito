import './globals.css';
import AmbientBackground from '@/components/AmbientBackground';
import Navbar from '@/components/Navbar';
import { Newsreader, Plus_Jakarta_Sans } from 'next/font/google';

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
  display: 'swap',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
});

export const metadata = {
  title: 'TeNecesito',
  description: 'Un espacio seguro para recibir ayuda y perspectivas externas.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning className={`${newsreader.variable} ${plusJakartaSans.variable}`}>
      <body className="flex flex-col min-h-screen text-[var(--tn-text)] selection:bg-[var(--tn-primary)]/25 selection:text-[var(--tn-text)]" suppressHydrationWarning>
        <AmbientBackground />
        <Navbar />
        <main className="flex-grow w-full">
          {children}
        </main>
      </body>
    </html>
  );
}