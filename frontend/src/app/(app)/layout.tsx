import { AuthenticatedApp } from "@/components/authenticated-app";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedApp>{children}</AuthenticatedApp>;
}
