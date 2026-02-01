import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import { appConfig } from "@/lib/config";
import { getCurrentSession } from "@/lib/dal";

export const metadata: Metadata = {
  title: `Sign In | ${appConfig.name}`,
  description: `Sign in to your ${appConfig.name} account`,
};

export default async function LoginPage() {
  const session = await getCurrentSession();

  if (session) {
    redirect("/dashboard");
  }

  return <LoginForm />;
}
