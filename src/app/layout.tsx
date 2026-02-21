import "./globals.css";

export const metadata = {
  title: "하나유통 샘플 카탈로그",
  description: "거래처 배포용 샘플 카탈로그",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}