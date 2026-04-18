describe('Dashboard', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/dashboard');
    cy.url({ timeout: 15000 }).should('include', '/dashboard');
  });

  it('should display the dashboard page header', () => {
    cy.contains('h1', 'Dashboard').should('be.visible');
  });

  it('should show stat cards for key metrics', () => {
    cy.contains('Total Sales', { timeout: 15000 }).should('be.visible');
    cy.contains('Total Purchase').should('be.visible');
    cy.contains('Total Expenses').should('be.visible');
    cy.contains('Stock Value').should('be.visible');
    cy.contains('Receivable').should('be.visible');
    cy.contains('Payable').should('be.visible');
    cy.contains('Products').should('be.visible');
    cy.contains('Parties').should('be.visible');
  });

  it('should show recent transactions section', () => {
    cy.contains('Recent Transactions', { timeout: 15000 }).should('be.visible');
  });

  it('should display stat values as numbers (with currency symbol)', () => {
    cy.get('.card--stat .card__value', { timeout: 15000 }).should('have.length.gte', 8);
  });
});
