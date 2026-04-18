describe('Products', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/products');
    cy.contains('h1', 'Products', { timeout: 15000 }).should('be.visible');
  });

  it('should display products page with header and add button', () => {
    cy.contains('h1', 'Products').should('be.visible');
    cy.contains('button', '+ New Product').should('be.visible');
  });

  it('should display products table with correct columns', () => {
    cy.get('table.table thead th').should('contain', 'Name');
    cy.get('table.table thead th').should('contain', 'Code');
    cy.get('table.table thead th').should('contain', 'Sale Price');
    cy.get('table.table thead th').should('contain', 'Purchase Price');
    cy.get('table.table thead th').should('contain', 'Stock');
    cy.get('table.table thead th').should('contain', 'Status');
    cy.get('table.table thead th').should('contain', 'Actions');
  });

  it('should display summary bar with totals', () => {
    cy.get('.summary-bar').should('be.visible');
    cy.get('.summary-bar').should('contain', 'Total Products');
    cy.get('.summary-bar').should('contain', 'Total Stock');
    cy.get('.summary-bar').should('contain', 'Stock Value');
  });

  it('should open product form modal when clicking + New Product', () => {
    cy.contains('button', '+ New Product').click();
    cy.get('.modal', { timeout: 5000 }).should('be.visible');
    cy.contains('New Product').should('be.visible');
    cy.get('input[name="name"]').should('be.visible');
  });

  it('should show validation error when saving without name', () => {
    cy.contains('button', '+ New Product').click();
    cy.get('.modal').should('be.visible');
    cy.get('.modal__footer .btn--primary').click();
    cy.contains('Product name is required').should('be.visible');
  });

  it('should create, edit, and delete a product', () => {
    cy.contains('button', '+ New Product').click();
    cy.get('.modal').should('be.visible');

    cy.get('input[name="name"]').type('Test Product E2E');
    cy.get('input[name="code"]').type('TEST-001');
    cy.get('input[name="purchasePrice"]').clear().type('100');
    cy.get('input[name="salesPrice"]').clear().type('150');
    cy.get('input[name="stockCount"]').clear().type('50');

    cy.get('.modal__footer .btn--primary').click();
    cy.get('.modal').should('not.exist');
    cy.contains('td', 'Test Product E2E').should('be.visible');
    cy.contains('td', 'TEST-001').should('be.visible');

    // Edit
    cy.contains('tr', 'Test Product E2E').find('button').contains('Edit').click();
    cy.get('.modal').should('be.visible');
    cy.contains('Edit Product').should('be.visible');
    cy.get('input[name="salesPrice"]').clear().type('175');
    cy.get('.modal__footer .btn--primary').click();
    cy.get('.modal').should('not.exist');

    // Delete
    cy.contains('tr', 'Test Product E2E').find('button').contains('Delete').click();
    cy.contains('Delete Product').should('be.visible');
    cy.get('.modal__footer .btn--danger').click();
    cy.contains('td', 'Test Product E2E').should('not.exist');
  });

  it('should search for products', () => {
    // Create a product to search
    cy.contains('button', '+ New Product').click();
    cy.get('input[name="name"]').type('Searchable Item');
    cy.get('input[name="salesPrice"]').clear().type('100');
    cy.get('.modal__footer .btn--primary').click();
    cy.get('.modal').should('not.exist');

    cy.get('gonok-search-input input').type('Searchable Item');
    cy.contains('td', 'Searchable Item').should('be.visible');

    cy.get('gonok-search-input input').clear().type('ZZZZNONEXISTENT');
    cy.contains('No products found').should('be.visible');

    // Cleanup
    cy.get('gonok-search-input input').clear();
    cy.contains('tr', 'Searchable Item').find('button').contains('Delete').click();
    cy.get('.modal__footer .btn--danger').click();
  });

  it('should close product form on Cancel', () => {
    cy.contains('button', '+ New Product').click();
    cy.get('.modal').should('be.visible');
    cy.get('.modal__footer .btn--ghost').click();
    cy.get('.modal').should('not.exist');
  });

  it('should have category and unit selectors with add buttons', () => {
    cy.contains('button', '+ New Product').click();
    cy.get('.modal').should('be.visible');
    cy.get('select[name="categoryUuid"]').should('be.visible');
    cy.get('select[name="unit"]').should('be.visible');
    cy.get('.input-with-action button').should('have.length', 2);
    cy.get('.modal__footer .btn--ghost').click();
  });
});
