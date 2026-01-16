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
