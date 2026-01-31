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

            // If config exists, validate stored license for ban status
            const licenseValidation = await (window.api as any).validateStoredLicense()
            if (licenseValidation && licenseValidation.isBanned) {
              // License is banned or already used; force re-onboarding
              set(
                { hasCompletedOnboarding: false, currentStep: 'license', isInitialized: true },
                false,
                'initializeFirstLaunch - license banned'
              )
              return
            }

            // License is valid or not present; initialization complete
            set({ isInitialized: true }, false, 'initializeFirstLaunch - complete')
          } catch (error) {
            console.error('Failed to check first launch:', error)
            set({ isInitialized: true }, false, 'initializeFirstLaunch - error')
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

// Selectors
export const useHasCompletedOnboarding = () =>
  useOnboardingStore((state) => state.hasCompletedOnboarding)
export const useCurrentOnboardingStep = () => useOnboardingStore((state) => state.currentStep)
export const useSkippedSteps = () => useOnboardingStore((state) => state.skippedSteps)
export const useIsFirstLaunch = () => useOnboardingStore((state) => state.isFirstLaunch)
