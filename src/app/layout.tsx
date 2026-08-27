import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DecisionOS",
  description: "Counselor and project-admin workspace",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
