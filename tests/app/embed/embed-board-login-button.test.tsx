import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmbedBoard } from "@/app/embed/[workspaceId]/embed-board";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/embed/test-workspace-id",
}));

// Mock the contributor logout hook
vi.mock("@/hooks/use-contributor-logout", () => ({
  useContributorLogout: () => ({
    logout: vi.fn(),
    isLoggingOut: false,
  }),
}));

// Set required env var for getBoardUrl (used by EmbedBoard internally)
vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://plaudera.com");

describe("EmbedBoard - Login Button", () => {
  const mockProps = {
    workspaceName: "Test Workspace",
    workspaceDescription: null,
    workspaceId: "test-workspace-id",
    workspaceSlug: "test-workspace",
    initialIdeas: [],
    initialContributor: null, // Unauthenticated state
  };

  it("shows login button when contributor is not authenticated", () => {
    render(<EmbedBoard {...mockProps} />);

    // Look for a button or element that allows user to sign in
    // This should be visible in the header area
    const loginButton = screen.queryByText(/sign in/i);

    expect(loginButton).toBeInTheDocument();
    expect(loginButton).toBeVisible();
  });

  it("does not show login button when contributor is authenticated", () => {
    const authenticatedProps = {
      ...mockProps,
      initialContributor: {
        email: "test@example.com",
        id: "contributor-123",
      },
    };

    render(<EmbedBoard {...authenticatedProps} />);

    // Login button should not be present when authenticated
    const loginButton = screen.queryByText(/sign in/i);
    expect(loginButton).not.toBeInTheDocument();

    // Should show logout button instead (it has sr-only text "Sign out")
    const logoutButton = screen.getByText(/sign out/i);
    expect(logoutButton).toBeInTheDocument();
  });
});
