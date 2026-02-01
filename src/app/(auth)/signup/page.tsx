import { Metadata } from "next";
import { redirect } from "next/navigation";
import { appConfig } from "@/lib/config";
import { SignupForm } from "./signup-form";
import { getCurrentSession } from "@/lib/dal";

export const metadata: Metadata = {
  title: `Sign Up | ${appConfig.name}`,
  description: `Create your ${appConfig.name} account`,
};

export default async function SignupPage() {
  const session = await getCurrentSession();

  if (session) {
    redirect("/dashboard");
  }

  return <SignupForm />;
}
