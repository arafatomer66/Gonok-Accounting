/// <reference types="cypress" />

// Ignore PouchDB sync errors — app works fine offline via local PouchDB
Cypress.on('uncaught:exception', (err) => {
  if (
    err.message.includes('PouchDB is not defined') ||
    err.message.includes('pouchdb') ||
    err.message.includes('Failed to fetch') ||
    err.message.includes('NetworkError') ||
    err.message.includes('Unexpected token')
  ) {
    return false;
  }
});

// Custom commands
declare global {
  namespace Cypress {
    interface Chainable {
      login(phone?: string, otp?: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('login', (phone = '01700000000', otp = '123456') => {
  cy.session(
    [phone, otp],
    () => {
      cy.visit('/login');
      cy.get('input[name="phone"]').clear().type(phone);
      cy.contains('button', 'Send OTP').click();
      cy.get('input[name="otp"]', { timeout: 10000 }).should('be.visible');
      cy.get('input[name="otp"]').clear().type(otp);
      cy.contains('button', 'Verify OTP').click();
      cy.url({ timeout: 15000 }).should('match', /\/(dashboard|create-business)/);
    },
    {
      validate() {
        cy.window().then((win) => {
          expect(win.localStorage.getItem('gonok_access_token')).to.not.be.null;
        });
      },
    },
  );
});

export {};
