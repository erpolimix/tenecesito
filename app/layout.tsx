import './globals.css';
import Navbar from '@/components/Navbar';

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
    <html lang="es" suppressHydrationWarning>
      <body className="flex flex-col min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white" suppressHydrationWarning>
        <Navbar />
        <main className="flex-grow w-full">
          {children}
        </main>
      </body>
    </html>
  );
}