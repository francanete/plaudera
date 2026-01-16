import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { appConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: `Sign In | ${appConfig.name}`,
  description: `Sign in to your ${appConfig.name} account`,
};

export default function LoginPage() {
  return <LoginForm />;
}
