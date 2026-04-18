describe('Authentication', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('should display login page with phone input', () => {
    cy.contains('গণক').should('be.visible');
    cy.contains('Sign in to your account').should('be.visible');
    cy.get('input[name="phone"]').should('be.visible');
    cy.contains('button', 'Send OTP').should('be.visible');
    cy.contains('Register').should('be.visible');
  });

  it('should send OTP and show OTP input', () => {
    cy.get('input[name="phone"]').type('01700000000');
    cy.contains('button', 'Send OTP').click();
    cy.get('input[name="otp"]', { timeout: 10000 }).should('be.visible');
    cy.contains('Enter OTP sent to 01700000000').should('be.visible');
    cy.contains('Change phone number').should('be.visible');
  });

  it('should show error for invalid OTP', () => {
    cy.get('input[name="phone"]').type('01700000000');
    cy.contains('button', 'Send OTP').click();
    cy.get('input[name="otp"]', { timeout: 10000 }).type('000000');
    cy.contains('button', 'Verify OTP').click();
    cy.contains('Invalid', { timeout: 5000 }).should('be.visible');
  });

  it('should login successfully with valid OTP', () => {
    // Direct login without cy.session so we stay on the resulting page
    cy.get('input[name="phone"]').clear().type('01700000000');
    cy.contains('button', 'Send OTP').click();
    cy.get('input[name="otp"]', { timeout: 10000 }).should('be.visible');
    cy.get('input[name="otp"]').clear().type('123456');
    cy.contains('button', 'Verify OTP').click();
    cy.url({ timeout: 15000 }).should('match', /\/(dashboard|create-business)/);
  });

  it('should allow going back to change phone number', () => {
    cy.get('input[name="phone"]').type('01700000000');
    cy.contains('button', 'Send OTP').click();
    cy.get('input[name="otp"]', { timeout: 10000 }).should('be.visible');
    cy.contains('Change phone number').click();
    cy.get('input[name="phone"]').should('be.visible');
  });

  it('should navigate to register page', () => {
    cy.contains('Register').click();
    cy.url().should('include', '/register');
  });

  it('should redirect unauthenticated users to login', () => {
    cy.clearLocalStorage();
    cy.visit('/dashboard');
    cy.url({ timeout: 10000 }).should('include', '/login');
  });
});
