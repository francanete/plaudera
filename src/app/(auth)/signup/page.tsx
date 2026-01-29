import { Metadata } from "next";
import { appConfig } from "@/lib/config";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: `Sign Up | ${appConfig.name}`,
  description: `Create your ${appConfig.name} account`,
};

export default function SignupPage() {
  return <SignupForm />;
}
