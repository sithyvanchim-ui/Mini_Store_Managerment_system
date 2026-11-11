import type { Metadata } from "next";
import { Suspense } from "react";
import {
  LoginPageSkeleton,
  LoginScreen,
} from "@/components/auth/login-screen";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to MiniStore to manage dorm fridge stock, sales, restocking, and the daily ABA close.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageSkeleton />}>
      <LoginScreen />
    </Suspense>
  );
}
