"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  getOnboardingFlow,
  type TourStep,
  type FlowId,
} from "@/lib/onboarding-config";
import { useIsMobile } from "@/hooks/use-mobile";
import { TourOverlay } from "./tour-overlay";
import { TourCard } from "./tour-card";

interface OnboardingContextValue {
  isActive: boolean;
  currentStep: number;
  flowId: string | null;
  startTour: (overrideFlowId?: string) => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

// SSR-safe mounted check using useSyncExternalStore
const emptySubscribe = () => () => {};
function useIsMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

interface OnboardingProviderProps {
  children: ReactNode;
  flowId: FlowId;
  flowCompleted: boolean;
}

export function OnboardingProvider({
  children,
  flowId,
  flowCompleted,
}: OnboardingProviderProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [activeFlowId, setActiveFlowId] = useState<string | null>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const mounted = useIsMounted();
  const isMobile = useIsMobile();

  // Get flow configuration
  const flow = useMemo(() => getOnboardingFlow(flowId), [flowId]);

  // Filter out desktop-only steps on mobile
  const activeSteps = useMemo(() => {
    if (!flow) return [];
    if (isMobile) {
      return flow.steps.filter((step) => !step.desktopOnly);
    }
    return flow.steps;
  }, [flow, isMobile]);

  const currentStepData: TourStep | undefined = activeSteps[currentStep];

  // Find and track target element position
  useEffect(() => {
    if (!isActive || !currentStepData) return;

    const updateTargetRect = () => {
      const target = document.querySelector(currentStepData.selector);
      if (target) {
        setTargetRect(target.getBoundingClientRect());
      } else {
        console.warn(
          `Onboarding tour: Element not found for selector "${currentStepData.selector}"`,
          { flowId: activeFlowId, step: currentStep }
        );
      }
    };

    updateTargetRect();
    window.addEventListener("resize", updateTargetRect);
    window.addEventListener("scroll", updateTargetRect);

    return () => {
      window.removeEventListener("resize", updateTargetRect);
      window.removeEventListener("scroll", updateTargetRect);
    };
  }, [isActive, currentStep, currentStepData, activeFlowId]);

  const startTour = useCallback(
    (overrideFlowId?: string) => {
      const targetFlowId = overrideFlowId || flowId;
      setActiveFlowId(targetFlowId);
      setCurrentStep(0);
      setIsActive(true);
    },
    [flowId]
  );

  const closeTour = useCallback(async () => {
    setIsActive(false);
    if (!activeFlowId) return;

    try {
      const response = await fetch("/api/onboarding/skip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flowId: activeFlowId }),
      });
      if (!response.ok) {
        console.error("Failed to skip onboarding", {
          flowId: activeFlowId,
          status: response.status,
          statusText: response.statusText,
        });
      }
    } catch (error) {
      console.error("Network error skipping onboarding", error);
    }
  }, [activeFlowId]);

  const nextStep = useCallback(async () => {
    if (currentStep < activeSteps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      setIsActive(false);
      if (!activeFlowId) return;

      try {
        const response = await fetch("/api/onboarding/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ flowId: activeFlowId }),
        });
        if (!response.ok) {
          console.error("Failed to complete onboarding", {
            flowId: activeFlowId,
            status: response.status,
            statusText: response.statusText,
          });
          toast.error(
            "Failed to save tour completion. The tour may appear again."
          );
        }
      } catch (error) {
        console.error("Network error completing onboarding", error);
        toast.error("Network error. The tour may appear again.");
      }
    }
  }, [currentStep, activeSteps.length, activeFlowId]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  // Auto-start for new users (only if flow supports it)
  useEffect(() => {
    if (!flowCompleted && mounted && flow?.autoStart !== false) {
      const delay = flow?.autoStartDelay ?? 500;
      const timer = setTimeout(() => startTour(flowId), delay);
      return () => clearTimeout(timer);
    }
  }, [flowCompleted, startTour, mounted, flow, flowId]);

  return (
    <OnboardingContext.Provider
      value={{ isActive, currentStep, flowId: activeFlowId, startTour }}
    >
      {children}
      {mounted &&
        isActive &&
        currentStepData &&
        targetRect &&
        createPortal(
          <>
            <TourOverlay targetRect={targetRect} />
            <TourCard
              step={currentStepData}
              currentStep={currentStep}
              totalSteps={activeSteps.length}
              targetRect={targetRect}
              onNext={nextStep}
              onPrev={prevStep}
              onClose={closeTour}
            />
          </>,
          document.body
        )}
    </OnboardingContext.Provider>
  );
}

export function useOnboardingContext() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error(
      "useOnboardingContext must be used within OnboardingProvider"
    );
  }
  return context;
}
