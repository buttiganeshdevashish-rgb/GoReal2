import { Suspense } from "react";
import AuthClient from "@/components/AuthClient";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense>
      <AuthClient />
    </Suspense>
  );
}
