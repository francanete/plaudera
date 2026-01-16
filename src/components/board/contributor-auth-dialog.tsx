"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, CheckCircle, Loader2 } from "lucide-react";

interface ContributorAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callbackUrl: string;
  title?: string;
  description?: string;
}

type DialogState = "form" | "sent" | "error";

export function ContributorAuthDialog({
  open,
  onOpenChange,
  callbackUrl,
  title = "Verify your email",
  description = "We'll send you a magic link to verify your email address.",
}: ContributorAuthDialogProps) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<DialogState>("form");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/contributor/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), callbackUrl }),
      });

      if (res.ok) {
        setState("sent");
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMessage(data.error || "Failed to send verification email");
        setState("error");
      }
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
      setState("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      // Reset state when closing
      setTimeout(() => {
        setState("form");
        setEmail("");
        setErrorMessage("");
      }, 200);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {state === "form" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                {title}
              </DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send verification link"
                )}
              </Button>
            </form>
          </>
        )}

        {state === "sent" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Check your email
              </DialogTitle>
              <DialogDescription>
                We sent a verification link to <strong>{email}</strong>. Click
                the link to continue.
              </DialogDescription>
            </DialogHeader>
            <div className="text-muted-foreground space-y-4 text-sm">
              <p>The link expires in 15 minutes.</p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setState("form")}
              >
                Use a different email
              </Button>
            </div>
          </>
        )}

        {state === "error" && (
          <>
            <DialogHeader>
              <DialogTitle>Something went wrong</DialogTitle>
              <DialogDescription>{errorMessage}</DialogDescription>
            </DialogHeader>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setState("form")}
            >
              Try again
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
