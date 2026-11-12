import './globals.scss';
import { SessionProvider } from '@/components/SessionProvider';

export const metadata = {
  title: 'Moderação | Constella',
  description: 'Painel de moderação do Constella',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
