describe('Expenses', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/expenses');
    cy.contains('h1', 'Expenses', { timeout: 15000 }).should('be.visible');
  });

  it('should display expenses page with header', () => {
    cy.contains('h1', 'Expenses').should('be.visible');
    cy.contains('button', '+ New Expense').should('be.visible');
  });

  it('should display expenses table with correct columns', () => {
    cy.get('table.table thead th').should('contain', 'Date');
    cy.get('table.table thead th').should('contain', 'Category');
    cy.get('table.table thead th').should('contain', 'Description');
    cy.get('table.table thead th').should('contain', 'Payment');
    cy.get('table.table thead th').should('contain', 'Amount');
    cy.get('table.table thead th').should('contain', 'Actions');
  });

  it('should have search functionality', () => {
    cy.get('gonok-search-input input').should('be.visible');
  });

  it('should open expense form modal', () => {
    cy.contains('button', '+ New Expense').click();
    cy.get('.modal', { timeout: 5000 }).should('be.visible');
    cy.contains('button', 'Cancel').click();
  });

  it('should display summary bar', () => {
    cy.get('.summary-bar').should('be.visible');
  });
});
