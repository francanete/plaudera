import { Inngest, EventSchemas } from "inngest";

export const inngest = new Inngest({
  id: "plaudera",
  schemas: new EventSchemas().fromRecord<{
    "user/created": { data: { userId: string; email: string } };
    "user/paid-signup": {
      data: { userId: string; email: string; name: string | null };
    };
    "email/welcome": { data: { userId: string; email: string; name: string } };
    "subscription/changed": { data: { userId: string; plan: string } };
  }>(),
});

// Step type for testability (subset of Inngest step methods we use)
export type InngestStepLike = {
  run: <T>(name: string, fn: () => Promise<T>) => Promise<T>;
  sleep: (name: string, duration: string | number) => Promise<void>;
};
