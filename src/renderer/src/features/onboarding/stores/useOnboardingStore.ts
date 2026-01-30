import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export type OnboardingStep =
  | 'welcome'
  | 'account'
  | 'pin'
  | 'installation'
  | 'notifications'
  | 'complete'

interface OnboardingState {
  hasCompletedOnboarding: boolean
  currentStep: OnboardingStep
  skippedSteps: OnboardingStep[]
  isFirstLaunch: boolean
}

interface OnboardingActions {
  setCurrentStep: (step: OnboardingStep) => void
  skipStep: (step: OnboardingStep) => void
  completeOnboarding: () => void
  resetOnboarding: () => void
  initializeFirstLaunch: () => Promise<void>
}

type OnboardingStore = OnboardingState & OnboardingActions

const initialState: OnboardingState = {
  hasCompletedOnboarding: false,
  currentStep: 'welcome',
  skippedSteps: [],
  isFirstLaunch: false
}

export const useOnboardingStore = create<OnboardingStore>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        setCurrentStep: (step) => set({ currentStep: step }, false, 'setCurrentStep'),

        skipStep: (step) =>
          set(
            (state) => ({
              skippedSteps: [...state.skippedSteps, step]
            }),
            false,
            'skipStep'
          ),

        completeOnboarding: () =>
          set(
            {
              hasCompletedOnboarding: true,
              currentStep: 'complete'
            },
            false,
            'completeOnboarding'
          ),

        resetOnboarding: () => set(initialState, false, 'resetOnboarding'),

        initializeFirstLaunch: async () => {
          try {
            const hasConfig = await window.api.hasConfig()
            if (!hasConfig) {
              set(
                { isFirstLaunch: true, hasCompletedOnboarding: false },
                false,
                'initializeFirstLaunch'
              )
            }
          } catch (error) {
            console.error('Failed to check first launch:', error)
          }
        }
      }),
      {
        name: 'onboarding-storage',
        partialize: (state) => ({
          hasCompletedOnboarding: state.hasCompletedOnboarding
        })
      }
    ),
    { name: 'OnboardingStore' }
  )
)


export const useHasCompletedOnboarding = () =>
  useOnboardingStore((state) => state.hasCompletedOnboarding)
export const useCurrentOnboardingStep = () => useOnboardingStore((state) => state.currentStep)
export const useSkippedSteps = () => useOnboardingStore((state) => state.skippedSteps)
export const useIsFirstLaunch = () => useOnboardingStore((state) => state.isFirstLaunch)