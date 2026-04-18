describe('Navigation & Shell', () => {
  beforeEach(() => {
    cy.login();
  });

  it('should have sidebar with navigation sections', () => {
    cy.visit('/dashboard');
    cy.contains('h1', 'Dashboard', { timeout: 15000 }).should('be.visible');

    // Check section titles
    cy.get('.sidebar__section-title').should('contain', 'Main');
    cy.get('.sidebar__section-title').should('contain', 'Sales');
    cy.get('.sidebar__section-title').should('contain', 'Purchase');
    cy.get('.sidebar__section-title').should('contain', 'Master');
    cy.get('.sidebar__section-title').should('contain', 'Others');

    // Check nav items
    cy.get('a.sidebar__nav-item').should('have.length.gte', 10);
  });

  it('should navigate to products page', () => {
    cy.visit('/dashboard');
    cy.contains('h1', 'Dashboard', { timeout: 15000 }).should('be.visible');
    cy.get('a.sidebar__nav-item').contains('Products').click();
    cy.url({ timeout: 10000 }).should('include', '/products');
    cy.contains('h1', 'Products', { timeout: 15000 }).should('be.visible');
  });

  it('should navigate to parties page', () => {
    cy.visit('/dashboard');
    cy.contains('h1', 'Dashboard', { timeout: 15000 }).should('be.visible');
    cy.get('a.sidebar__nav-item').contains('Parties').click();
    cy.url({ timeout: 10000 }).should('include', '/parties');
    cy.contains('h1', 'Parties', { timeout: 15000 }).should('be.visible');
  });

  it('should navigate to sales page', () => {
    cy.visit('/dashboard');
    cy.contains('h1', 'Dashboard', { timeout: 15000 }).should('be.visible');
    // Use exact match to avoid matching "Sales Return"
    cy.get('a.sidebar__nav-item[href="/sales"]').click();
    cy.url({ timeout: 10000 }).should('include', '/sales');
    cy.contains('h1', 'Sales', { timeout: 15000 }).should('be.visible');
  });

  it('should navigate to expenses page', () => {
    cy.visit('/dashboard');
    cy.contains('h1', 'Dashboard', { timeout: 15000 }).should('be.visible');
    cy.get('a.sidebar__nav-item').contains('Expenses').click();
    cy.url({ timeout: 10000 }).should('include', '/expenses');
    cy.contains('h1', 'Expenses', { timeout: 15000 }).should('be.visible');
  });

  it('should redirect unknown routes to dashboard', () => {
    cy.visit('/some-random-page');
    cy.url({ timeout: 10000 }).should('include', '/dashboard');
  });
});
