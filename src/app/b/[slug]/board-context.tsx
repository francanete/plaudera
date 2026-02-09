"use client";

import { createContext, useContext } from "react";

interface BoardContextValue {
  contributor: { email: string; id: string } | null;
  workspaceId: string;
  isSubdomain: boolean;
  requireAuth: (
    action: { type: "vote"; ideaId: string } | { type: "submit" }
  ) => void;
}

const BoardContext = createContext<BoardContextValue | null>(null);

export function BoardProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: BoardContextValue;
}) {
  return (
    <BoardContext.Provider value={value}>{children}</BoardContext.Provider>
  );
}

export function useBoardContext() {
  const ctx = useContext(BoardContext);
  if (!ctx)
    throw new Error("useBoardContext must be used within BoardProvider");
  return ctx;
}
