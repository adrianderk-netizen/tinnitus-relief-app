/**
 * Setup Wizard Manager - Guides users through initial setup
 * Implements progressive disclosure and reduces overwhelming UI
 */

class WizardManager {
    constructor(app) {
        this.app = app;
        this.currentStep = 0;
        this.isWizardMode = false;
        this.wizardComplete = false;
        
        // Wizard steps configuration
        this.steps = [
            {
                id: 'welcome',
                title: 'Welcome to Setup!',
                description: 'Let\'s find your tinnitus frequency in 3 easy steps',
                allowedMode: null,
                requiredAction: null
            },
            {
                id: 'find-frequency',
                title: 'Step 1: Find Your Frequency',
                description: 'Use the Tone Matcher or Frequency Sweep to identify your tinnitus pitch',
                allowedMode: 'tone-matcher',
                requiredAction: 'frequency-marked'
            },
            {
                id: 'test-therapy',
                title: 'Step 2: Try Therapy',
                description: 'Test the Notched Noise therapy with your matched frequency',
                allowedMode: 'notched-noise',
                requiredAction: 'therapy-tested'
            },
            {
                id: 'complete',
                title: 'Setup Complete! 🎉',
                description: 'You\'re all set! All features are now unlocked.',
                allowedMode: null,
                requiredAction: null
            }
        ];
        
        this.checkWizardStatus();
    }

    checkWizardStatus() {
        // Check if wizard has been completed before
        const wizardCompleted = localStorage.getItem('tinnitusWizardComplete');
        
        if (wizardCompleted === 'true') {
            // Wizard was explicitly completed
            this.wizardComplete = true;
            this.isWizardMode = false;
        } else {
            // Start wizard for first-time users after onboarding
            const onboardingComplete = localStorage.getItem('tinnitusOnboardingComplete');
            if (onboardingComplete === 'true') {
                console.log('[Wizard] Starting wizard for first-time user');
                this.startWizard();
            } else {
                console.log('[Wizard] Waiting for onboarding to complete');
            }
        }
    }

    startWizard() {
        this.isWizardMode = true;
        this.currentStep = 0;
        this.showWizardUI();
        this.lockModes();
        this.updateWizardStep();
    }

    showWizardUI() {
        const existingBanner = document.querySelector('.wizard-banner');
        if (existingBanner) return;

        const banner = document.createElement('div');
        banner.className = 'wizard-banner';
        banner.innerHTML = `
            <div class="wizard-content">
                <div class="wizard-icon">🧭</div>
                <div class="wizard-text">
                    <h3 id="wizardTitle">Setup Wizard</h3>
                    <p id="wizardDescription">Let's get you started!</p>
                </div>
                <div class="wizard-progress">
                    <span id="wizardStep">Step 1/3</span>
                    <div class="wizard-progress-bar">
                        <div class="wizard-progress-fill" id="wizardProgressFill"></div>
                    </div>
                </div>
                <button class="btn-skip-wizard" id="skipWizard">Skip Setup</button>
            </div>
        `;

        const container = document.querySelector('.container');
        const header = document.querySelector('header');
        container.insertBefore(banner, header.nextSibling);

        // Bind skip button
        document.getElementById('skipWizard').addEventListener('click', () => this.skipWizard());
    }

    hideWizardUI() {
        const banner = document.querySelector('.wizard-banner');
        if (banner) {
            banner.style.animation = 'slideUp 0.3s ease-out';
            setTimeout(() => banner.remove(), 300);
        }
    }

    updateWizardStep() {
        if (!this.isWizardMode) return;

        const step = this.steps[this.currentStep];
        
        // Update wizard banner
        const title = document.getElementById('wizardTitle');
        const description = document.getElementById('wizardDescription');
        const stepIndicator = document.getElementById('wizardStep');
        const progressFill = document.getElementById('wizardProgressFill');

        if (title) title.textContent = step.title;
        if (description) description.textContent = step.description;
        if (stepIndicator) stepIndicator.textContent = `Step ${this.currentStep + 1}/${this.steps.length}`;
        if (progressFill) {
            const progress = ((this.currentStep + 1) / this.steps.length) * 100;
            progressFill.style.width = `${progress}%`;
        }

        // Lock/unlock modes based on current step
        this.lockModes();

        // Auto-switch to allowed mode if specified
        if (step.allowedMode && this.app) {
            this.app.switchMode(step.allowedMode);
        }
    }

    lockModes() {
        if (!this.isWizardMode) {
            // Unlock all modes
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('wizard-locked');
                btn.style.pointerEvents = '';
            });
            return;
        }

        const step = this.steps[this.currentStep];
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            const mode = btn.dataset.mode;
            if (step.allowedMode && mode === step.allowedMode) {
                btn.classList.remove('wizard-locked');
                btn.style.pointerEvents = '';
            } else if (!step.allowedMode && this.currentStep === 0) {
                // Welcome step - only show tone matcher
                if (mode === 'tone-matcher') {
                    btn.classList.remove('wizard-locked');
                    btn.style.pointerEvents = '';
                } else {
                    btn.classList.add('wizard-locked');
                    btn.style.pointerEvents = 'none';
                }
            } else if (!step.allowedMode && this.currentStep === this.steps.length - 1) {
                // Complete step - unlock all
                btn.classList.remove('wizard-locked');
                btn.style.pointerEvents = '';
            } else {
                btn.classList.add('wizard-locked');
                btn.style.pointerEvents = 'none';
            }
        });
    }

    completeCurrentStep(action) {
        if (!this.isWizardMode) return;

        const step = this.steps[this.currentStep];
        
        // Check if this action completes the current step
        if (step.requiredAction === action) {
            this.nextStep();
        }
    }

    nextStep() {
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            this.updateWizardStep();
            
            // Check if wizard is complete
            if (this.currentStep === this.steps.length - 1) {
                setTimeout(() => this.completeWizard(), 3000);
            }
        }
    }

    completeWizard() {
        this.isWizardMode = false;
        this.wizardComplete = true;
        localStorage.setItem('tinnitusWizardComplete', 'true');
        this.hideWizardUI();
        this.lockModes(); // This will unlock all modes
        
        // Show celebration
        this.showCelebration();
    }

    skipWizard() {
        if (confirm('Skip the setup wizard? You can always come back to the tutorial later.')) {
            this.completeWizard();
        }
    }

    showCelebration() {
        const celebration = document.createElement('div');
        celebration.className = 'wizard-celebration';
        celebration.innerHTML = `
            <div class="celebration-content">
                <div class="celebration-icon">🎉</div>
                <h2>Setup Complete!</h2>
                <p>You're ready to start your tinnitus relief journey!</p>
                <button class="btn btn-start" id="celebrationOk">Let's Go!</button>
            </div>
        `;
        
        document.body.appendChild(celebration);
        
        setTimeout(() => celebration.classList.add('active'), 100);

        document.getElementById('celebrationOk').addEventListener('click', () => {
            celebration.classList.remove('active');
            setTimeout(() => celebration.remove(), 300);
        });
    }

    // Public method to manually restart wizard
    restartWizard() {
        this.currentStep = 0;
        this.isWizardMode = true;
        this.wizardComplete = false;
        this.showWizardUI();
        this.updateWizardStep();
    }

    isComplete() {
        return this.wizardComplete;
    }

    getCurrentStep() {
        return this.steps[this.currentStep];
    }
}
window.WizardManager = WizardManager;
export { WizardManager };
