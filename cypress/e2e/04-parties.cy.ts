describe('Parties', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/parties');
    cy.contains('h1', 'Parties', { timeout: 15000 }).should('be.visible');
  });

  it('should display parties page with header and filters', () => {
    cy.contains('h1', 'Parties').should('be.visible');
    cy.contains('button', '+ New Party').should('be.visible');
    cy.contains('button', 'All').should('be.visible');
    cy.contains('button', 'Customers').should('be.visible');
    cy.contains('button', 'Suppliers').should('be.visible');
  });

  it('should display parties table with correct columns', () => {
    cy.get('table.table thead th').should('contain', 'Name');
    cy.get('table.table thead th').should('contain', 'Phone');
    cy.get('table.table thead th').should('contain', 'Type');
    cy.get('table.table thead th').should('contain', 'Balance');
    cy.get('table.table thead th').should('contain', 'Actions');
  });

  it('should show Cash Sale party (non-deletable)', () => {
    cy.contains('td', 'Cash Sale').should('be.visible');
    cy.contains('tr', 'Cash Sale').within(() => {
      cy.get('button').should('not.exist');
    });
  });

  it('should display summary bar', () => {
    cy.get('.summary-bar').should('be.visible');
    cy.get('.summary-bar').should('contain', 'Total');
    cy.get('.summary-bar').should('contain', 'Customers');
    cy.get('.summary-bar').should('contain', 'Suppliers');
  });

  it('should create, filter, search, edit, and delete parties', () => {
    // Create customer
    cy.contains('button', '+ New Party').click();
    cy.get('.modal', { timeout: 5000 }).should('be.visible');
    cy.get('input[name="name"]').type('E2E Customer');
    cy.get('input[name="phone"]').type('01712345678');
    cy.get('select[name="partyType"]').select('customer');
    cy.get('.modal__footer .btn--primary').click();
    cy.get('.modal').should('not.exist');
    cy.contains('td', 'E2E Customer').should('be.visible');

    // Create supplier
    cy.contains('button', '+ New Party').click();
    cy.get('.modal').should('be.visible');
    cy.get('input[name="name"]').type('E2E Supplier');
    cy.get('select[name="partyType"]').select('supplier');
    cy.get('.modal__footer .btn--primary').click();
    cy.get('.modal').should('not.exist');
    cy.contains('td', 'E2E Supplier').should('be.visible');

    // Filter by customers
    cy.contains('button', 'Customers').click();
    cy.contains('td', 'E2E Customer').should('be.visible');
    cy.contains('td', 'E2E Supplier').should('not.exist');

    // Filter by suppliers
    cy.contains('button', 'Suppliers').click();
    cy.contains('td', 'E2E Supplier').should('be.visible');
    cy.contains('td', 'E2E Customer').should('not.exist');

    // Back to all
    cy.contains('button', 'All').click();

    // Search
    cy.get('gonok-search-input input').type('E2E Customer');
    cy.contains('td', 'E2E Customer').should('be.visible');
    cy.contains('td', 'E2E Supplier').should('not.exist');
    cy.get('gonok-search-input input').clear();

    // Edit customer
    cy.contains('tr', 'E2E Customer').find('button').contains('Edit').click();
    cy.get('.modal').should('be.visible');
    cy.contains('Edit Party').should('be.visible');
    cy.get('.modal__footer .btn--ghost').click();

    // Delete supplier
    cy.contains('tr', 'E2E Supplier').find('button').contains('Delete').click();
    cy.contains('Delete Party').should('be.visible');
    cy.get('.modal__footer .btn--danger').click();
    cy.contains('td', 'E2E Supplier').should('not.exist');

    // Delete customer
    cy.contains('tr', 'E2E Customer').find('button').contains('Delete').click();
    cy.get('.modal__footer .btn--danger').click();
    cy.contains('td', 'E2E Customer').should('not.exist');
  });
});
