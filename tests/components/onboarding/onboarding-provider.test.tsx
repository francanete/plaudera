import { render, screen, act, fireEvent } from "@testing-library/react";
import {
  OnboardingProvider,
  useOnboardingContext,
} from "@/components/onboarding/onboarding-provider";
import { onboardingFlows } from "@/lib/onboarding-config";
import { useIsMobile } from "@/hooks/use-mobile";

// Get dashboard flow steps for testing
const dashboardSteps = onboardingFlows.dashboard.steps;

// Mock useIsMobile hook
vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: vi.fn(() => false),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper component to access context
function TestConsumer({
  onContext,
}: {
  onContext?: (ctx: ReturnType<typeof useOnboardingContext>) => void;
}) {
  const context = useOnboardingContext();
  onContext?.(context);
  return (
    <div>
      <span data-testid="is-active">{String(context.isActive)}</span>
      <span data-testid="current-step">{context.currentStep}</span>
      <span data-testid="flow-id">{context.flowId ?? "null"}</span>
      <button onClick={() => context.startTour()} data-testid="start-tour">
        Start Tour
      </button>
    </div>
  );
}

// Create mock DOM elements for tour targets
function setupTourTargets() {
  dashboardSteps.forEach((step) => {
    const element = document.createElement("div");
    element.id = step.selector.replace("#", "");
    element.setAttribute("data-testid", step.id);
    document.body.appendChild(element);
  });
}

function cleanupTourTargets() {
  dashboardSteps.forEach((step) => {
    const element = document.querySelector(step.selector);
    element?.remove();
  });
}

describe("OnboardingProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    setupTourTargets();
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanupTourTargets();
    vi.useRealTimers();
  });

  describe("context", () => {
    it("throws when useOnboardingContext is used outside provider", () => {
      // Suppress console.error for this test
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => {
        render(<TestConsumer />);
      }).toThrow("useOnboardingContext must be used within OnboardingProvider");

      consoleSpy.mockRestore();
    });

    it("provides context values within provider", () => {
      render(
        <OnboardingProvider flowId="dashboard" flowCompleted={true}>
          <TestConsumer />
        </OnboardingProvider>
      );

      expect(screen.getByTestId("is-active")).toHaveTextContent("false");
      expect(screen.getByTestId("current-step")).toHaveTextContent("0");
      expect(screen.getByTestId("flow-id")).toHaveTextContent("null");
    });
  });

  describe("auto-start behavior", () => {
    it("auto-starts tour for users who have not completed the flow", async () => {
      render(
        <OnboardingProvider flowId="dashboard" flowCompleted={false}>
          <TestConsumer />
        </OnboardingProvider>
      );

      // Initially inactive
      expect(screen.getByTestId("is-active")).toHaveTextContent("false");

      // Advance timer to trigger auto-start (500ms delay)
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      expect(screen.getByTestId("is-active")).toHaveTextContent("true");
      expect(screen.getByTestId("flow-id")).toHaveTextContent("dashboard");
    });

    it("does not auto-start for users who completed the flow", async () => {
      render(
        <OnboardingProvider flowId="dashboard" flowCompleted={true}>
          <TestConsumer />
        </OnboardingProvider>
      );

      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getByTestId("is-active")).toHaveTextContent("false");
    });
  });

  describe("manual tour control", () => {
    it("starts tour when startTour is called", async () => {
      render(
        <OnboardingProvider flowId="dashboard" flowCompleted={true}>
          <TestConsumer />
        </OnboardingProvider>
      );

      expect(screen.getByTestId("is-active")).toHaveTextContent("false");

      await act(async () => {
        fireEvent.click(screen.getByTestId("start-tour"));
      });

      expect(screen.getByTestId("is-active")).toHaveTextContent("true");
      expect(screen.getByTestId("current-step")).toHaveTextContent("0");
      expect(screen.getByTestId("flow-id")).toHaveTextContent("dashboard");
    });
  });

  describe("flow-specific behavior", () => {
    it("tracks the active flow ID", async () => {
      render(
        <OnboardingProvider flowId="dashboard" flowCompleted={false}>
          <TestConsumer />
        </OnboardingProvider>
      );

      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      expect(screen.getByTestId("flow-id")).toHaveTextContent("dashboard");
    });
  });
});

describe("useOnboardingContext", () => {
  it("returns isActive, currentStep, flowId, and startTour", () => {
    let contextValue: ReturnType<typeof useOnboardingContext> | null = null;

    render(
      <OnboardingProvider flowId="dashboard" flowCompleted={true}>
        <TestConsumer
          onContext={(ctx) => {
            contextValue = ctx;
          }}
        />
      </OnboardingProvider>
    );

    expect(contextValue).not.toBeNull();
    expect(contextValue).toHaveProperty("isActive");
    expect(contextValue).toHaveProperty("currentStep");
    expect(contextValue).toHaveProperty("flowId");
    expect(contextValue).toHaveProperty("startTour");
    expect(typeof contextValue!.startTour).toBe("function");
  });
});

describe("step navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    setupTourTargets();
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanupTourTargets();
    vi.useRealTimers();
  });

  it("advances to next step when Next button is clicked", async () => {
    render(
      <OnboardingProvider flowId="dashboard" flowCompleted={true}>
        <TestConsumer />
      </OnboardingProvider>
    );

    // Start the tour
    await act(async () => {
      fireEvent.click(screen.getByTestId("start-tour"));
    });

    expect(screen.getByTestId("current-step")).toHaveTextContent("0");

    // Click the Next button in TourCard
    const nextButton = screen.getByRole("button", { name: /next/i });
    await act(async () => {
      fireEvent.click(nextButton);
    });

    expect(screen.getByTestId("current-step")).toHaveTextContent("1");
  });

  it("goes back to previous step when Back button is clicked", async () => {
    render(
      <OnboardingProvider flowId="dashboard" flowCompleted={true}>
        <TestConsumer />
      </OnboardingProvider>
    );

    // Start the tour
    await act(async () => {
      fireEvent.click(screen.getByTestId("start-tour"));
    });

    // Advance to step 1
    const nextButton = screen.getByRole("button", { name: /next/i });
    await act(async () => {
      fireEvent.click(nextButton);
    });

    expect(screen.getByTestId("current-step")).toHaveTextContent("1");

    // Go back
    const backButton = screen.getByRole("button", { name: /back/i });
    await act(async () => {
      fireEvent.click(backButton);
    });

    expect(screen.getByTestId("current-step")).toHaveTextContent("0");
  });

  it("does not show Back button on first step", async () => {
    render(
      <OnboardingProvider flowId="dashboard" flowCompleted={true}>
        <TestConsumer />
      </OnboardingProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("start-tour"));
    });

    // At step 0, back button should not exist
    expect(
      screen.queryByRole("button", { name: /back/i })
    ).not.toBeInTheDocument();
  });
});

describe("API calls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    setupTourTargets();
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanupTourTargets();
    vi.useRealTimers();
  });

  it("calls /api/onboarding/complete with correct payload when tour finishes", async () => {
    // Filter steps for desktop (no desktopOnly filtering when useIsMobile returns false)
    const steps = dashboardSteps;

    render(
      <OnboardingProvider flowId="dashboard" flowCompleted={true}>
        <TestConsumer />
      </OnboardingProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("start-tour"));
    });

    // Navigate through all steps
    for (let i = 0; i < steps.length; i++) {
      const isLastStep = i === steps.length - 1;
      const buttonText = isLastStep ? /get started/i : /next/i;
      const button = screen.getByRole("button", { name: buttonText });
      await act(async () => {
        fireEvent.click(button);
      });
    }

    expect(mockFetch).toHaveBeenCalledWith("/api/onboarding/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flowId: "dashboard" }),
    });
  });

  it("calls /api/onboarding/skip with correct payload when tour is closed", async () => {
    render(
      <OnboardingProvider flowId="dashboard" flowCompleted={true}>
        <TestConsumer />
      </OnboardingProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("start-tour"));
    });

    // Find and click the close button (X icon)
    const closeButton = screen.getByRole("button", { name: "" });
    await act(async () => {
      fireEvent.click(closeButton);
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/onboarding/skip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flowId: "dashboard" }),
    });
  });
});

describe("mobile step filtering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    setupTourTargets();
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanupTourTargets();
    vi.useRealTimers();
    // Reset mock to default
    vi.mocked(useIsMobile).mockReturnValue(false);
  });

  it("filters out desktopOnly steps on mobile", async () => {
    // Mock mobile
    vi.mocked(useIsMobile).mockReturnValue(true);

    render(
      <OnboardingProvider flowId="dashboard" flowCompleted={true}>
        <TestConsumer />
      </OnboardingProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("start-tour"));
    });

    // The tour card should show total steps excluding desktopOnly
    const mobileStepCount = dashboardSteps.filter((s) => !s.desktopOnly).length;
    const stepIndicator = screen.getByText(new RegExp(`of ${mobileStepCount}`));
    expect(stepIndicator).toBeInTheDocument();
  });

  it("includes all steps on desktop", async () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    render(
      <OnboardingProvider flowId="dashboard" flowCompleted={true}>
        <TestConsumer />
      </OnboardingProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("start-tour"));
    });

    const stepIndicator = screen.getByText(
      new RegExp(`of ${dashboardSteps.length}`)
    );
    expect(stepIndicator).toBeInTheDocument();
  });
});

describe("error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupTourTargets();
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanupTourTargets();
    vi.useRealTimers();
  });

  it("shows toast when API returns error on completion", async () => {
    const { toast } = await import("sonner");
    mockFetch.mockResolvedValue({ ok: false, status: 500 });

    const steps = dashboardSteps;

    render(
      <OnboardingProvider flowId="dashboard" flowCompleted={true}>
        <TestConsumer />
      </OnboardingProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("start-tour"));
    });

    // Navigate through all steps to trigger completion
    for (let i = 0; i < steps.length; i++) {
      const isLastStep = i === steps.length - 1;
      const buttonText = isLastStep ? /get started/i : /next/i;
      const button = screen.getByRole("button", { name: buttonText });
      await act(async () => {
        fireEvent.click(button);
      });
    }

    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining("Failed to save tour completion")
    );
  });

  it("shows toast when network error occurs on completion", async () => {
    const { toast } = await import("sonner");
    mockFetch.mockRejectedValue(new Error("Network error"));

    const steps = dashboardSteps;

    render(
      <OnboardingProvider flowId="dashboard" flowCompleted={true}>
        <TestConsumer />
      </OnboardingProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("start-tour"));
    });

    // Navigate through all steps
    for (let i = 0; i < steps.length; i++) {
      const isLastStep = i === steps.length - 1;
      const buttonText = isLastStep ? /get started/i : /next/i;
      const button = screen.getByRole("button", { name: buttonText });
      await act(async () => {
        fireEvent.click(button);
      });
    }

    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining("Network error")
    );
  });

  it("does not show toast when skip API fails (silent failure)", async () => {
    const { toast } = await import("sonner");
    mockFetch.mockResolvedValue({ ok: false, status: 500 });

    render(
      <OnboardingProvider flowId="dashboard" flowCompleted={true}>
        <TestConsumer />
      </OnboardingProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("start-tour"));
    });

    // Close the tour (triggers skip API)
    const closeButton = screen.getByRole("button", { name: "" });
    await act(async () => {
      fireEvent.click(closeButton);
    });

    // Toast should NOT be called for skip failures
    expect(toast.error).not.toHaveBeenCalled();
  });
});
