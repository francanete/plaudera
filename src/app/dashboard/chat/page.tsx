import { PaidAccessGate } from "@/components/paid-access-gate";
import { ChatInterface } from "./chat-interface";

export default function ChatPage() {
  return (
    <PaidAccessGate>
      <ChatInterface />
    </PaidAccessGate>
  );
}
