describe('Settings', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/settings');
    cy.contains('h1', 'Settings', { timeout: 15000 }).should('be.visible');
  });

  it('should display settings page with tabs', () => {
    cy.contains('h1', 'Settings').should('be.visible');
    cy.contains('button', 'Item').should('be.visible');
    cy.contains('button', 'Party').should('be.visible');
    cy.contains('button', 'Transaction').should('be.visible');
    cy.contains('button', 'Export').should('be.visible');
  });

  it('should switch between tabs', () => {
    cy.contains('button', 'Party').click();
    cy.contains('button', 'Transaction').click();
    cy.contains('button', 'Export').click();
    cy.contains('button', 'Item').click();
  });

  it('should have toggle checkboxes', () => {
    cy.get('input[type="checkbox"]').should('have.length.gte', 1);
  });
});

describe('Users', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/users');
    cy.contains('h1', 'Users', { timeout: 15000 }).should('be.visible');
  });

  it('should display users page', () => {
    cy.contains('h1', 'Users').should('be.visible');
  });

  it('should show the current owner', () => {
    cy.contains('Owner').should('be.visible');
  });
});
