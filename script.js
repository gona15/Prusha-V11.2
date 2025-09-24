/**
 * ArmanLeads Premium Interactive JavaScript
 * Production-ready, accessible, and performant landing page interactions
 */
(function() {
    'use strict';
    
    // Performance and state management
    let scrollTicking = false;
    let resizeTicking = false;
    let lastScrollY = 0;
    let windowHeight = window.innerHeight;
    let windowWidth = window.innerWidth;
    
    // Reduced motion detection
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // Cache DOM elements for performance
    const elements = {};
    
    // Utility functions
    const utils = {
        debounce(func, wait, immediate = false) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    timeout = null;
                    if (!immediate) func(...args);
                };
                const callNow = immediate && !timeout;
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
                if (callNow) func(...args);
            };
        },
        
        throttle(func, limit) {
            let inThrottle;
            return function(...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },
        
        lerp(start, end, factor) {
            return start * (1 - factor) + end * factor;
        },
        
        clamp(value, min, max) {
            return Math.min(Math.max(value, min), max);
        },
        
        getScrollProgress() {
            const scrollTop = window.pageYOffset;
            const documentHeight = document.documentElement.scrollHeight - windowHeight;
            return Math.min(scrollTop / documentHeight, 1);
        }
    };
    
    // Cache DOM elements on initialization
    function cacheElements() {
        elements.navbar = document.querySelector('#navbar');
        elements.heroSection = document.querySelector('.hero');
        elements.heroHeadline = document.querySelector('.hero-headline');
        elements.heroPhoto = document.querySelector('.hero-photo');
        elements.faqItems = document.querySelectorAll('.faq-item');
        elements.fadeElements = document.querySelectorAll('.fade-in');
        elements.form = document.getElementById('auditForm');
        elements.buttons = document.querySelectorAll('.btn');
        elements.revealElements = document.querySelectorAll('.reveal-on-scroll');
        elements.urgencyStats = document.querySelectorAll('.urgency-stat');
        elements.lazyImages = document.querySelectorAll('img[data-src], img[data-srcset]');
    }
    
    // Hero Section Animations with Fixed Transform Bug
    class HeroAnimations {
        constructor() {
            this.heroPhoto = elements.heroPhoto;
            this.heroHeadline = elements.heroHeadline;
            this.mouseX = 0;
            this.mouseY = 0;
            this.currentX = 0;
            this.currentY = 0;
            this.scrollY = 0;
            
            if (prefersReducedMotion) return;
            this.init();
        }
        
        init() {
            if (!this.heroPhoto || !this.heroHeadline) return;
            
            this.setupParallax();
            this.setupMouseMovement();
            this.animateEntrance();
        }
        
        setupParallax() {
            const handleScroll = () => {
                if (!scrollTicking) {
                    requestAnimationFrame(() => {
                        this.scrollY = window.pageYOffset;
                        this.updateTransforms();
                        scrollTicking = false;
                    });
                    scrollTicking = true;
                }
            };
            
            window.addEventListener('scroll', handleScroll, { passive: true });
        }
        
        setupMouseMovement() {
            const heroSection = elements.heroSection;
            if (!heroSection) return;
            
            const handleMouseMove = (e) => {
                const rect = heroSection.getBoundingClientRect();
                this.mouseX = (e.clientX - rect.left - rect.width / 2) / rect.width;
                this.mouseY = (e.clientY - rect.top - rect.height / 2) / rect.height;
            };
            
            const animate = () => {
                this.currentX = utils.lerp(this.currentX, this.mouseX * 10, 0.1);
                this.currentY = utils.lerp(this.currentY, this.mouseY * 10, 0.1);
                
                requestAnimationFrame(animate);
                this.updateTransforms();
            };
            
            heroSection.addEventListener('mousemove', utils.throttle(handleMouseMove, 16));
            animate();
        }
        
        updateTransforms() {
            // Fixed transform bug: compute single transform string each frame
            if (this.heroPhoto && this.scrollY < windowHeight) {
                const parallaxY = utils.clamp(this.scrollY * 0.5, 0, 100);
                const mouseOffsetX = utils.clamp(this.currentX, -18, 18);
                const mouseOffsetY = utils.clamp(this.currentY, -18, 18);
                const scale = utils.clamp(1 + this.scrollY * 0.0002, 1, 1.02);
                
                // Single transform assignment - no accumulation
                this.heroPhoto.style.transform = `translate3d(${mouseOffsetX}px, ${parallaxY + mouseOffsetY}px, 0) scale(${scale})`;
            }
            
            if (this.heroHeadline) {
                const mouseOffsetX = utils.clamp(this.currentX * 0.5, -18, 18);
                const mouseOffsetY = utils.clamp(this.currentY * 0.5, -18, 18);
                
                // Single transform assignment - no accumulation
                this.heroHeadline.style.transform = `translate3d(${mouseOffsetX}px, ${mouseOffsetY}px, 0)`;
            }
        }
        
        animateEntrance() {
            // Staggered entrance animation
            const timeline = [
                { element: this.heroHeadline, delay: 0 },
                { element: document.querySelector('.hero-sub'), delay: 200 },
                { element: document.querySelector('.hero-actions'), delay: 400 },
                { element: this.heroPhoto, delay: 600 }
            ];
            
            timeline.forEach(({ element, delay }) => {
                if (!element) return;
                
                element.style.opacity = '0';
                element.style.transform = 'translateY(40px)';
                
                setTimeout(() => {
                    element.style.transition = 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
                    element.style.opacity = '1';
                    element.style.transform = 'translateY(0)';
                }, delay);
            });
        }
    }
    
    // Navigation Scroll Behavior with Dynamic Offset
    class NavigationController {
        constructor() {
            this.navbar = elements.navbar;
            this.isHidden = true;
            this.lastScrollY = 0;
            this.scrollThreshold = 100;
            this.hasFocus = false;
            
            this.init();
        }
        
        init() {
            if (!this.navbar) return;
            
            this.setupScrollBehavior();
            this.setupSmoothScrolling();
            this.setupFocusTracking();
        }
        
        setupFocusTracking() {
            // Track if navigation has focus to prevent hiding
            const navElements = this.navbar.querySelectorAll('button, a, input, [tabindex]');
            navElements.forEach(el => {
                el.addEventListener('focus', () => { this.hasFocus = true; });
                el.addEventListener('blur', () => { this.hasFocus = false; });
            });
        }
        
        setupScrollBehavior() {
            const handleScroll = utils.throttle(() => {
                const currentScrollY = window.pageYOffset;
                const scrollingDown = currentScrollY > this.lastScrollY;
                const beyondThreshold = currentScrollY > this.scrollThreshold;
                
                if (beyondThreshold && scrollingDown && this.isHidden && !this.hasFocus) {
                    this.show();
                } else if ((!beyondThreshold || !scrollingDown) && !this.isHidden) {
                    this.hide();
                }
                
                this.lastScrollY = currentScrollY;
            }, 16);
            
            window.addEventListener('scroll', handleScroll, { passive: true });
        }
        
        show() {
            if (!this.navbar || !this.isHidden) return;
            this.navbar.classList.remove('hidden');
            this.isHidden = false;
        }
        
        hide() {
            if (!this.navbar || this.isHidden || this.hasFocus) return;
            this.navbar.classList.add('hidden');
            this.isHidden = true;
        }
        
        setupSmoothScrolling() {
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', (e) => {
                    const href = anchor.getAttribute('href');
                    if (href === '#') return;
                    
                    const target = document.querySelector(href);
                    if (!target) return;
                    
                    e.preventDefault();
                    
                    // Compute navbar height dynamically
                    const navHeight = this.navbar ? this.navbar.offsetHeight : 0;
                    const targetTop = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 20;
                    
                    window.scrollTo({
                        top: Math.max(0, targetTop),
                        behavior: 'smooth'
                    });
                });
            });
        }
    }
    
    // FAQ Accessible Accordion System
    class FAQController {
        constructor() {
            this.faqItems = elements.faqItems;
            this.activeItem = null;
            
            this.init();
        }
        
        init() {
            if (!this.faqItems.length) return;
            
            this.faqItems.forEach((item, index) => this.setupFAQItem(item, index));
        }
        
        setupFAQItem(item, index) {
            const question = item.querySelector('.faq-question');
            const answer = item.querySelector('.faq-answer');
            
            if (!question || !answer) return;
            
            // Set up ARIA attributes
            const answerId = `faq-answer-${index + 1}`;
            answer.id = answerId;
            answer.setAttribute('role', 'region');
            question.setAttribute('aria-controls', answerId);
            question.setAttribute('aria-expanded', 'false');
            
            // Make answer focusable for accessibility
            answer.setAttribute('tabindex', '-1');
            
            // Event listeners
            question.addEventListener('click', () => this.toggleFAQ(item));
            question.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.toggleFAQ(item);
                }
            });
        }
        
        toggleFAQ(targetItem) {
            const isCurrentlyActive = this.activeItem === targetItem;
            
            // Close all items
            this.faqItems.forEach(item => {
                if (item !== targetItem || isCurrentlyActive) {
                    this.closeFAQ(item);
                }
            });
            
            // Open target item if it wasn't active
            if (!isCurrentlyActive) {
                this.openFAQ(targetItem);
                this.activeItem = targetItem;
            } else {
                this.activeItem = null;
            }
        }
        
        openFAQ(item) {
            const question = item.querySelector('.faq-question');
            const answer = item.querySelector('.faq-answer');
            
            if (!question || !answer) return;
            
            // Update ARIA and add open class
            question.setAttribute('aria-expanded', 'true');
            answer.classList.add('open');
            answer.removeAttribute('hidden');
            
            // Focus management - move focus to answer content
            setTimeout(() => {
                answer.focus({ preventScroll: true });
            }, 300);
        }
        
        closeFAQ(item) {
            const question = item.querySelector('.faq-question');
            const answer = item.querySelector('.faq-answer');
            
            if (!question || !answer) return;
            
            // Update ARIA and remove open class
            question.setAttribute('aria-expanded', 'false');
            answer.classList.remove('open');
            answer.setAttribute('hidden', '');
        }
    }
    
    // Robust Lazy Loading with Fallback
    class LazyLoadController {
        constructor() {
            this.lazyImages = elements.lazyImages;
            this.imageObserver = null;
            
            this.init();
        }
        
        init() {
            if (!this.lazyImages.length) return;
            
            // Use IntersectionObserver if available, otherwise load immediately
            if ('IntersectionObserver' in window) {
                this.setupIntersectionObserver();
            } else {
                // Fallback: load all images immediately
                this.lazyImages.forEach(img => this.loadImage(img));
            }
        }
        
        setupIntersectionObserver() {
            const options = {
                threshold: 0,
                rootMargin: '50px 0px'
            };
            
            this.imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.loadImage(entry.target);
                        this.imageObserver.unobserve(entry.target);
                    }
                });
            }, options);
            
            this.lazyImages.forEach(img => this.imageObserver.observe(img));
        }
        
        loadImage(img) {
            // Don't interfere with native loading="lazy" 
            if (img.loading === 'lazy' && !img.dataset.src && !img.dataset.srcset) {
                return;
            }
            
            const loadHandler = () => {
                img.style.opacity = '1';
                img.classList.add('loaded');
            };
            
            const errorHandler = () => {
                console.warn('Image failed to load:', img.src || img.dataset.src);
            };
            
            img.addEventListener('load', loadHandler, { once: true });
            img.addEventListener('error', errorHandler, { once: true });
            
            // Apply fade-in effect
            img.style.opacity = '0';
            img.style.transition = 'opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
            
            // Set src and srcset from data attributes
            if (img.dataset.src) {
                img.src = img.dataset.src;
                delete img.dataset.src;
            }
            
            if (img.dataset.srcset) {
                img.srcset = img.dataset.srcset;
                delete img.dataset.srcset;
            }
            
            // Handle picture element sources
            const picture = img.closest('picture');
            if (picture) {
                const sources = picture.querySelectorAll('source[data-srcset]');
                sources.forEach(source => {
                    if (source.dataset.srcset) {
                        source.srcset = source.dataset.srcset;
                        delete source.dataset.srcset;
                    }
                });
            }
        }
    }
    
    // Button Loading States and Double Submit Prevention
    class ButtonController {
        constructor() {
            this.buttons = elements.buttons;
            this.loadingButtons = new Set();
            
            this.init();
        }
        
        init() {
            if (!this.buttons.length) return;
            
            this.buttons.forEach(button => this.enhanceButton(button));
        }
        
        enhanceButton(button) {
            // Skip if already enhanced
            if (button.dataset.enhanced) return;
            button.dataset.enhanced = 'true';
            
            // Add loading state for external links or submit buttons
            if (this.shouldAddLoadingState(button)) {
                button.addEventListener('click', (e) => this.handleLoadingButton(e, button));
            }
        }
        
        shouldAddLoadingState(button) {
            // Add loading for submit buttons
            if (button.type === 'submit') return true;
            
            // Add loading for external links or target="_blank"
            if (button.tagName === 'A') {
                const href = button.getAttribute('href');
                const target = button.getAttribute('target');
                
                if (target === '_blank') return true;
                if (href && href.startsWith('http') && !href.includes(window.location.hostname)) {
                    return true;
                }
            }
            
            return false;
        }
        
        handleLoadingButton(e, button) {
            // Prevent double clicks
            if (this.loadingButtons.has(button)) {
                e.preventDefault();
                return;
            }
            
            this.addLoadingState(button);
            
            // Remove loading state after navigation or timeout
            setTimeout(() => {
                this.removeLoadingState(button);
            }, 3000);
        }
        
        addLoadingState(button) {
            this.loadingButtons.add(button);
            button.classList.add('is-loading');
            button.disabled = true;
            
            const originalText = button.textContent;
            button.dataset.originalText = originalText;
            button.textContent = 'Loading...';
        }
        
        removeLoadingState(button) {
            this.loadingButtons.delete(button);
            button.classList.remove('is-loading');
            button.disabled = false;
            
            if (button.dataset.originalText) {
                button.textContent = button.dataset.originalText;
                delete button.dataset.originalText;
            }
        }
    }
    
    // Intersection-based Fade-in Animation Controller
    class ScrollAnimationController {
        constructor() {
            this.revealElements = document.querySelectorAll('.reveal-on-scroll, .fade-in');
            this.countersAnimated = new Set();
            this.revealObserver = null;
            
            this.init();
        }
        
        init() {
            this.setupRevealAnimations();
            this.setupCounterAnimations();
        }
        
        setupRevealAnimations() {
            if (!this.revealElements.length) return;
            
            if ('IntersectionObserver' in window && !prefersReducedMotion) {
                const options = {
                    threshold: 0.1,
                    rootMargin: '0px 0px -120px 0px'
                };
                
                this.revealObserver = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            this.animateElement(entry.target);
                            this.revealObserver.unobserve(entry.target); // Unobserve after reveal
                        }
                    });
                }, options);
                
                this.revealElements.forEach(el => this.revealObserver.observe(el));
            } else {
                // Fallback: show all elements immediately
                this.revealElements.forEach(el => el.classList.add('visible'));
            }
        }
        
        animateElement(element) {
            element.style.transition = 'opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1), transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
            element.classList.add('visible');
        }
        
        setupCounterAnimations() {
            const statsContainer = document.querySelector('.urgency-stats');
            if (!statsContainer || prefersReducedMotion) return;
            
            if ('IntersectionObserver' in window) {
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting && !this.countersAnimated.has(entry.target)) {
                            this.animateCounters(entry.target);
                            this.countersAnimated.add(entry.target);
                            observer.unobserve(entry.target);
                        }
                    });
                }, { threshold: 0.5 });
                
                observer.observe(statsContainer);
            }
        }
        
        animateCounters(container) {
            const numbers = container.querySelectorAll('.urgency-number');
            
            numbers.forEach((number, index) => {
                setTimeout(() => {
                    const text = number.textContent;
                    const matches = text.match(/(\d+)/);
                    
                    if (matches) {
                        const finalValue = parseInt(matches[1]);
                        this.animateNumber(number, 0, finalValue, 1500, text);
                    }
                }, index * 200);
            });
        }
        
        animateNumber(element, start, end, duration, originalText) {
            const startTime = performance.now();
            
            const update = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Eased progress
                const easedProgress = 1 - Math.pow(1 - progress, 3);
                const currentValue = Math.floor(start + (end - start) * easedProgress);
                
                element.textContent = originalText.replace(/\d+/, currentValue);
                
                if (progress < 1) {
                    requestAnimationFrame(update);
                }
            };
            
            requestAnimationFrame(update);
        }
    }
    
    // Touch Support (Non-invasive)
    class TouchController {
        constructor() {
            this.touchStartX = 0;
            this.touchStartY = 0;
            
            this.init();
        }
        
        init() {
            // Only add touch support if touch is available
            if ('ontouchstart' in window) {
                this.setupTouchHandlers();
            }
        }
        
        setupTouchHandlers() {
            document.addEventListener('touchstart', (e) => {
                this.touchStartX = e.touches[0].clientX;
                this.touchStartY = e.touches[0].clientY;
            }, { passive: true });
            
            document.addEventListener('touchmove', (e) => {
                if (!this.touchStartX || !this.touchStartY) return;
                
                const touchEndX = e.touches[0].clientX;
                const touchEndY = e.touches[0].clientY;
                
                const deltaX = this.touchStartX - touchEndX;
                const deltaY = this.touchStartY - touchEndY;
                
                // Only detect horizontal swipe if significant and not vertical
                if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 50) {
                    // Potential swipe detected - could be used for UI interactions
                    // Not blocking vertical scroll
                }
            }, { passive: true });
        }
    }
    
    // Live Region for Accessibility
    class AccessibilityController {
        constructor() {
            this.liveRegion = null;
            this.init();
        }
        
        init() {
            this.setupLiveRegion();
            this.setupKeyboardSupport();
        }
        
        setupLiveRegion() {
            let liveRegion = document.getElementById('live-region');
            if (!liveRegion) {
                liveRegion = document.createElement('div');
                liveRegion.id = 'live-region';
                liveRegion.setAttribute('aria-live', 'polite');
                liveRegion.setAttribute('aria-atomic', 'true');
                liveRegion.className = 'sr-only';
                document.body.appendChild(liveRegion);
            }
            this.liveRegion = liveRegion;
        }
        
        announce(message) {
            if (this.liveRegion) {
                this.liveRegion.textContent = message;
                setTimeout(() => {
                    this.liveRegion.textContent = '';
                }, 3000);
            }
        }
        
        setupKeyboardSupport() {
            // Escape key to close open FAQ
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const openFAQ = document.querySelector('.faq-item .faq-answer.open');
                    if (openFAQ) {
                        const question = openFAQ.previousElementSibling;
                        if (question && question.classList.contains('faq-question')) {
                            question.click();
                        }
                    }
                }
            });
        }
    }
    
    // Form Enhancement System
    class FormController {
        constructor() {
            this.form = elements.form;
            this.fields = {};
            this.validationRules = {
                name: { required: true, minLength: 2 },
                practice: { required: true, minLength: 2 },
                email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
                website: { required: false, pattern: /^https?:\/\/.+/ }
            };
            
            this.init();
        }
        
        init() {
            if (!this.form) return;
            
            this.cacheFormElements();
            this.setupRealTimeValidation();
            this.setupSubmission();
        }
        
        cacheFormElements() {
            Object.keys(this.validationRules).forEach(fieldName => {
                const field = this.form.querySelector(`[name="${fieldName}"]`);
                if (field) {
                    this.fields[fieldName] = {
                        input: field,
                        error: document.getElementById(`${fieldName}-error`) || this.createErrorElement(field),
                        valid: false
                    };
                }
            });
        }
        
        createErrorElement(input) {
            const errorEl = document.createElement('span');
            errorEl.className = 'error-message';
            errorEl.setAttribute('role', 'alert');
            errorEl.id = `${input.name}-error`;
            input.parentNode.appendChild(errorEl);
            return errorEl;
        }
        
        setupRealTimeValidation() {
            Object.entries(this.fields).forEach(([fieldName, field]) => {
                const { input } = field;
                
                input.addEventListener('blur', () => {
                    this.validateField(fieldName);
                });
                
                input.addEventListener('input', utils.debounce(() => {
                    this.validateField(fieldName);
                }, 300));
            });
        }
        
        validateField(fieldName) {
            const field = this.fields[fieldName];
            const { input, error } = field;
            const value = input.value.trim();
            const rules = this.validationRules[fieldName];
            
            let isValid = true;
            let errorMessage = '';
            
            if (rules.required && !value) {
                isValid = false;
                errorMessage = 'This field is required';
            } else if (value && rules.minLength && value.length < rules.minLength) {
                isValid = false;
                errorMessage = `Minimum ${rules.minLength} characters required`;
            } else if (value && rules.pattern && !rules.pattern.test(value)) {
                isValid = false;
                if (fieldName === 'email') {
                    errorMessage = 'Please enter a valid email address';
                } else if (fieldName === 'website') {
                    errorMessage = 'Please enter a valid URL (https://...)';
                }
            }
            
            field.valid = isValid;
            this.updateFieldState(input, error, isValid, errorMessage);
            
            return isValid;
        }
        
        updateFieldState(input, error, isValid, errorMessage) {
            if (isValid) {
                input.style.borderColor = 'var(--accent-emerald)';
                error.textContent = '';
                error.style.opacity = '0';
            } else {
                input.style.borderColor = 'var(--accent-crimson)';
                error.textContent = errorMessage;
                error.style.opacity = '1';
            }
        }
        
        setupSubmission() {
            this.form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSubmit();
            });
        }
        
        handleSubmit() {
            const submitButton = this.form.querySelector('button[type="submit"]');
            if (!submitButton || submitButton.disabled) return;
            
            // Validate all fields
            const isFormValid = Object.keys(this.fields).every(fieldName => 
                this.validateField(fieldName)
            );
            
            if (!isFormValid) {
                console.warn('Form validation failed');
                return;
            }
            
            this.showLoadingState(submitButton);
            
            // Simulate submission
            setTimeout(() => {
                this.showSuccessState(submitButton);
                this.form.reset();
                
                // Announce success to screen readers
                const accessibility = window.ArmanLeadsApp?.getController('accessibility');
                if (accessibility) {
                    accessibility.announce('Form submitted successfully. Check your email for the audit.');
                }
            }, 2000);
        }
        
        showLoadingState(button) {
            const originalText = button.textContent;
            button.textContent = 'Sending Analysis...';
            button.disabled = true;
            button.style.opacity = '0.7';
            button.dataset.originalText = originalText;
        }
        
        showSuccessState(button) {
            button.textContent = 'Analysis Sent! ✓';
            button.style.backgroundColor = 'var(--accent-emerald)';
            button.style.opacity = '1';
            
            setTimeout(() => {
                button.textContent = button.dataset.originalText;
                button.style.backgroundColor = '';
                button.disabled = false;
            }, 3000);
        }
    }
    
    // Main App Controller
    class ArmanLeadsApp {
        constructor() {
            this.controllers = {};
            this.init();
        }
        
        init() {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.initializeApp());
            } else {
                this.initializeApp();
            }
        }
        
        initializeApp() {
            try {
                // Cache DOM elements first
                cacheElements();
                
                // Initialize controllers in order
                this.controllers.hero = new HeroAnimations();
                this.controllers.navigation = new NavigationController();
                this.controllers.faq = new FAQController();
                this.controllers.lazyLoad = new LazyLoadController();
                this.controllers.buttons = new ButtonController();
                this.controllers.scroll = new ScrollAnimationController();
                this.controllers.touch = new TouchController();
                this.controllers.accessibility = new AccessibilityController();
                this.controllers.form = new FormController();
                
                // Update window dimensions on resize
                window.addEventListener('resize', utils.debounce(() => {
                    windowHeight = window.innerHeight;
                    windowWidth = window.innerWidth;
                }, 250), { passive: true });
                
                console.log('ArmanLeads Premium JavaScript initialized successfully');
                
            } catch (error) {
                console.error('Error initializing ArmanLeads app:', error);
            }
        }
        
        // Public API for external interaction
        getController(name) {
            return this.controllers[name];
        }
        
        // Cleanup method for SPA navigation
        destroy() {
            Object.values(this.controllers).forEach(controller => {
                if (controller.destroy) controller.destroy();
            });
        }
    }
    
    // Initialize the application
    window.ArmanLeadsApp = new ArmanLeadsApp();
    
    // Export for potential external use
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = ArmanLeadsApp;
    }

})();
