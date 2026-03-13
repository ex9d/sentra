import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export type OnboardingStep =
  | 'welcome'
  | 'license'
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
  isInitialized: boolean
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
  isFirstLaunch: false,
  isInitialized: false
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
                { isFirstLaunch: true, hasCompletedOnboarding: false, isInitialized: true },
                false,
                'initializeFirstLaunch'
              )
              return
            }

            // DISABLED: License validation removed - licensing system disabled
            // Skip license validation entirely; initialization complete
            set({ isInitialized: true }, false, 'initializeFirstLaunch - complete')
          } catch (error) {
            console.error('Failed to check first launch:', error instanceof Error ? error.message : String(error))
            set({ isInitialized: true }, false, 'initializeFirstLaunch - error')
          }
        }
      }),
      {
        name: 'onboarding-storage-v3',
        partialize: (state) => ({
          hasCompletedOnboarding: state.hasCompletedOnboarding
        })
      }
    ),
    { name: 'OnboardingStore' }
  )
)

// Selectors
export const useHasCompletedOnboarding = () =>
  useOnboardingStore((state) => state.hasCompletedOnboarding)
export const useCurrentOnboardingStep = () => useOnboardingStore((state) => state.currentStep)
export const useSkippedSteps = () => useOnboardingStore((state) => state.skippedSteps)
export const useIsFirstLaunch = () => useOnboardingStore((state) => state.isFirstLaunch)
