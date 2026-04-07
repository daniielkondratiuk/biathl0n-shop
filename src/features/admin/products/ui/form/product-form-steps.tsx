// src/features/admin/products/ui/form/product-form-steps.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
  onStepClick?: (step: number) => void;
  allowStepJump?: boolean;
  maxReachableStep?: number;
}

function StepIndicator({ 
  currentStep, 
  totalSteps, 
  stepLabels, 
  onStepClick,
  allowStepJump = false,
  maxReachableStep = totalSteps,
}: StepIndicatorProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {stepLabels.map((label, index) => {
          const stepNum = index + 1;
          const isActive = stepNum === currentStep;
          const isCompleted = stepNum < currentStep;
          const isReachable = stepNum <= maxReachableStep;
          const isClickable = allowStepJump && isReachable && onStepClick;
          
          return (
            <div key={stepNum} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <button
                  type="button"
                  onClick={isClickable ? () => onStepClick(stepNum) : undefined}
                  disabled={!isClickable}
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-colors ${
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : isCompleted
                      ? "bg-green-600 text-white"
                      : isReachable
                      ? "bg-muted text-muted-foreground hover:bg-muted/80"
                      : "bg-muted/50 text-muted-foreground/50 cursor-not-allowed"
                  } ${isClickable ? "cursor-pointer" : ""}`}
                >
                  {isCompleted ? "✓" : stepNum}
                </button>
                <span className={`mt-2 text-xs font-medium ${
                  isActive ? "text-foreground" : isReachable ? "text-muted-foreground" : "text-muted-foreground/50"
                }`}>
                  {label}
                </span>
              </div>
              {index < stepLabels.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-4 ${
                    isCompleted ? "bg-green-600" : isReachable ? "bg-muted" : "bg-muted/50"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ProductFormStepsProps {
  children: (step: number, goToStep: (step: number) => void) => React.ReactNode;
  totalSteps: number;
  stepLabels: string[];
  currentStep: number;
  goNext: () => void;
  goBack: () => void;
  goToStep: (step: number) => void;
  allowStepJump?: boolean;
  maxReachableStep?: number;
  onCancel?: () => void;
}

export function ProductFormSteps({
  children,
  totalSteps,
  stepLabels,
  currentStep,
  goBack,
  goToStep,
  allowStepJump = false,
  maxReachableStep,
  onCancel,
}: ProductFormStepsProps) {
  return (
    <div className="space-y-6">
      <StepIndicator
        currentStep={currentStep}
        totalSteps={totalSteps}
        stepLabels={stepLabels}
        onStepClick={allowStepJump ? goToStep : undefined}
        allowStepJump={allowStepJump}
        maxReachableStep={maxReachableStep ?? totalSteps}
      />
      <div className="min-h-[400px]">
        {children(currentStep, goToStep)}
      </div>
      <div className="flex items-center justify-between pt-6 border-t border-border">
        <div className="flex gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            onClick={goBack}
            disabled={currentStep === 1}
          >
            Back
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          Step {currentStep} of {totalSteps}
        </div>
      </div>
    </div>
  );
}

export function useProductFormSteps(totalSteps: number, initialStep = 1) {
  const [currentStep, setCurrentStep] = useState(initialStep);

  const goToStep = (step: number) => {
    if (step >= 1 && step <= totalSteps) {
      setCurrentStep(step);
    }
  };

  const goNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return {
    currentStep,
    goToStep,
    goNext,
    goBack,
  };
}

