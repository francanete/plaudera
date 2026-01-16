import {
  onboardingFlows,
  getOnboardingFlow,
  tourSteps,
  type TourStep,
  type OnboardingFlow,
} from "@/lib/onboarding-config";

describe("onboarding-config", () => {
  describe("onboardingFlows", () => {
    it("should have at least one flow defined", () => {
      const flowKeys = Object.keys(onboardingFlows);
      expect(flowKeys.length).toBeGreaterThan(0);
    });

    it("should have a dashboard flow", () => {
      expect(onboardingFlows.dashboard).toBeDefined();
      expect(onboardingFlows.dashboard.id).toBe("dashboard");
    });

    it("should have a settings flow", () => {
      expect(onboardingFlows.settings).toBeDefined();
      expect(onboardingFlows.settings.id).toBe("settings");
      expect(onboardingFlows.settings.steps.length).toBeGreaterThan(0);
    });

    it("should have valid flow structure for all flows", () => {
      Object.entries(onboardingFlows).forEach(([key, flow]) => {
        expect(flow.id).toBe(key);
        expect(flow.name).toBeTruthy();
        expect(Array.isArray(flow.steps)).toBe(true);
        expect(flow.steps.length).toBeGreaterThan(0);
      });
    });
  });

  describe("getOnboardingFlow", () => {
    it("returns the correct flow for valid flowId", () => {
      const flow = getOnboardingFlow("dashboard");
      expect(flow).toBeDefined();
      expect(flow?.id).toBe("dashboard");
    });

    it("returns the settings flow", () => {
      const flow = getOnboardingFlow("settings");
      expect(flow).toBeDefined();
      expect(flow?.id).toBe("settings");
      expect(flow?.name).toBe("Settings Tour");
    });

    it("returns undefined for invalid flowId", () => {
      const flow = getOnboardingFlow("nonexistent");
      expect(flow).toBeUndefined();
    });
  });

  describe("tourSteps (legacy export)", () => {
    it("should be the same as dashboard flow steps", () => {
      expect(tourSteps).toBe(onboardingFlows.dashboard.steps);
    });

    it("should have at least one step", () => {
      expect(tourSteps.length).toBeGreaterThan(0);
    });

    it("should have unique step ids", () => {
      const ids = tourSteps.map((step) => step.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should have unique selectors", () => {
      const selectors = tourSteps.map((step) => step.selector);
      const uniqueSelectors = new Set(selectors);
      expect(uniqueSelectors.size).toBe(selectors.length);
    });

    it("should have valid positions for all steps", () => {
      const validPositions = ["top", "bottom", "left", "right"];
      tourSteps.forEach((step) => {
        expect(validPositions).toContain(step.position);
      });
    });

    it("should have non-empty title and content for all steps", () => {
      tourSteps.forEach((step) => {
        expect(step.title.trim()).not.toBe("");
        expect(step.content.trim()).not.toBe("");
      });
    });

    it("should have selectors that start with # or .", () => {
      tourSteps.forEach((step) => {
        expect(step.selector).toMatch(/^[#.]/);
      });
    });
  });

  describe("settings flow", () => {
    const settingsSteps = onboardingFlows.settings.steps;

    it("should have steps with valid selectors", () => {
      settingsSteps.forEach((step) => {
        expect(step.selector).toMatch(/^#tour-settings-/);
      });
    });

    it("should have unique step ids", () => {
      const ids = settingsSteps.map((step) => step.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should include tabs, profile, and billing steps", () => {
      const stepIds = settingsSteps.map((step) => step.id);
      expect(stepIds).toContain("tabs");
      expect(stepIds).toContain("profile");
      expect(stepIds).toContain("billing");
    });
  });

  describe("step filtering", () => {
    it("should filter desktop-only steps for mobile", () => {
      const mobileSteps = tourSteps.filter((step) => !step.desktopOnly);
      const desktopOnlySteps = tourSteps.filter((step) => step.desktopOnly);

      expect(mobileSteps.length).toBeLessThanOrEqual(tourSteps.length);
      expect(mobileSteps.length + desktopOnlySteps.length).toBe(
        tourSteps.length
      );
    });

    it("should have at least one step available on mobile", () => {
      const mobileSteps = tourSteps.filter((step) => !step.desktopOnly);
      expect(mobileSteps.length).toBeGreaterThan(0);
    });
  });

  describe("TourStep type", () => {
    it("should correctly type a valid step", () => {
      const validStep: TourStep = {
        id: "test",
        title: "Test Step",
        content: "Test content",
        selector: "#test-element",
        position: "bottom",
      };

      expect(validStep.id).toBe("test");
      expect(validStep.desktopOnly).toBeUndefined();
    });

    it("should allow optional desktopOnly property", () => {
      const desktopStep: TourStep = {
        id: "desktop-test",
        title: "Desktop Step",
        content: "Desktop only content",
        selector: "#desktop-element",
        position: "right",
        desktopOnly: true,
      };

      expect(desktopStep.desktopOnly).toBe(true);
    });
  });

  describe("OnboardingFlow type", () => {
    it("should correctly type a valid flow", () => {
      const validFlow: OnboardingFlow = {
        id: "test-flow",
        name: "Test Flow",
        steps: [
          {
            id: "step1",
            title: "Step 1",
            content: "Content 1",
            selector: "#step1",
            position: "bottom",
          },
        ],
      };

      expect(validFlow.id).toBe("test-flow");
      expect(validFlow.autoStart).toBeUndefined();
      expect(validFlow.autoStartDelay).toBeUndefined();
    });

    it("should allow optional autoStart and autoStartDelay properties", () => {
      const flow: OnboardingFlow = {
        id: "auto-flow",
        name: "Auto Flow",
        autoStart: true,
        autoStartDelay: 1000,
        steps: [],
      };

      expect(flow.autoStart).toBe(true);
      expect(flow.autoStartDelay).toBe(1000);
    });
  });
});
