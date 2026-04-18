describe('Transactions', () => {
  beforeEach(() => {
    cy.login();
  });

  describe('Sales', () => {
    beforeEach(() => {
      cy.visit('/sales');
      cy.contains('h1', 'Sales', { timeout: 15000 }).should('be.visible');
    });

    it('should display sales page with header and add button', () => {
      cy.contains('h1', 'Sales').should('be.visible');
      cy.contains('button', '+ New Sale').should('be.visible');
    });

    it('should open sale form modal with correct fields', () => {
      cy.contains('button', '+ New Sale').click();
      cy.get('.modal', { timeout: 5000 }).should('be.visible');
      cy.contains('New Sale').should('be.visible');
      cy.get('select[name="mode"]').should('be.visible');
      cy.get('select[name="partyUuid"]').should('be.visible');
      cy.get('input[name="txDate"]').should('be.visible');
      cy.get('.modal__footer .btn--ghost').click();
    });

    it('should show error when saving without items', () => {
      cy.contains('button', '+ New Sale').click();
      cy.get('.modal').should('be.visible');
      cy.get('.modal__footer .btn--primary').click();
      cy.contains('At least one item is required').should('be.visible');
      cy.get('.modal__footer .btn--ghost').click();
    });
  });

  describe('Purchase', () => {
    beforeEach(() => {
      cy.visit('/purchase');
      cy.contains('h1', 'Purchase', { timeout: 15000 }).should('be.visible');
    });

    it('should display purchase page', () => {
      cy.contains('h1', 'Purchase').should('be.visible');
      cy.contains('button', '+ New Purchase').should('be.visible');
    });

    it('should open purchase form modal', () => {
      cy.contains('button', '+ New Purchase').click();
      cy.get('.modal', { timeout: 5000 }).should('be.visible');
      cy.contains('New Purchase').should('be.visible');
      cy.get('.modal__footer .btn--ghost').click();
    });
  });

  describe('Sales Return', () => {
    it('should display sales return page', () => {
      cy.visit('/sales-return');
      cy.contains('h1', 'Sales Return', { timeout: 15000 }).should('be.visible');
      cy.contains('button', '+ New Sales Return').should('be.visible');
    });
  });

  describe('Purchase Return', () => {
    it('should display purchase return page', () => {
      cy.visit('/purchase-return');
      cy.contains('h1', 'Purchase Return', { timeout: 15000 }).should('be.visible');
      cy.contains('button', '+ New Purchase Return').should('be.visible');
    });
  });

  describe('Payment In', () => {
    beforeEach(() => {
      cy.visit('/payment-in');
      cy.contains('h1', 'Payment In', { timeout: 15000 }).should('be.visible');
    });

    it('should display payment in page', () => {
      cy.contains('button', '+ New Payment In').should('be.visible');
    });

    it('should open payment in form with amount field', () => {
      cy.contains('button', '+ New Payment In').click();
      cy.get('.modal', { timeout: 5000 }).should('be.visible');
      cy.contains('New Payment In').should('be.visible');
      cy.get('input[name="paidAmount"]').should('be.visible');
      cy.get('.modal__footer .btn--ghost').click();
    });

    it('should show error when saving with zero amount', () => {
      cy.contains('button', '+ New Payment In').click();
      cy.get('.modal').should('be.visible');
      cy.get('input[name="paidAmount"]').clear().type('0');
      cy.get('.modal__footer .btn--primary').click();
      cy.contains('Amount must be greater than zero').should('be.visible');
      cy.get('.modal__footer .btn--ghost').click();
    });
  });

  describe('Payment Out', () => {
    beforeEach(() => {
      cy.visit('/payment-out');
      cy.contains('h1', 'Payment Out', { timeout: 15000 }).should('be.visible');
    });

    it('should display payment out page', () => {
      cy.contains('button', '+ New Payment Out').should('be.visible');
    });

    it('should open payment out form', () => {
      cy.contains('button', '+ New Payment Out').click();
      cy.get('.modal', { timeout: 5000 }).should('be.visible');
      cy.contains('New Payment Out').should('be.visible');
      cy.get('.modal__footer .btn--ghost').click();
    });
  });

  describe('Full sale flow', () => {
    it('should create product, customer, sale, then clean up', () => {
      // 1. Create product
      cy.visit('/products');
      cy.contains('h1', 'Products', { timeout: 15000 }).should('be.visible');
      cy.contains('button', '+ New Product').click();
      cy.get('.modal').should('be.visible');
      cy.get('input[name="name"]').type('Sale Flow Product');
      cy.get('input[name="purchasePrice"]').clear().type('100');
      cy.get('input[name="salesPrice"]').clear().type('200');
      cy.get('input[name="stockCount"]').clear().type('50');
      cy.get('.modal__footer .btn--primary').click();
      cy.get('.modal').should('not.exist');
      cy.contains('td', 'Sale Flow Product').should('be.visible');

      // 2. Create customer
      cy.visit('/parties');
      cy.contains('h1', 'Parties', { timeout: 15000 }).should('be.visible');
      cy.contains('button', '+ New Party').click();
      cy.get('.modal').should('be.visible');
      cy.get('input[name="name"]').type('Sale Flow Customer');
      cy.get('select[name="partyType"]').select('customer');
      cy.get('.modal__footer .btn--primary').click();
      cy.get('.modal').should('not.exist');

      // 3. Create sale
      cy.visit('/sales');
      cy.contains('h1', 'Sales', { timeout: 15000 }).should('be.visible');
      cy.contains('button', '+ New Sale').click();
      cy.get('.modal').should('be.visible');
      cy.get('select[name="partyUuid"]').select('Sale Flow Customer');
      cy.get('select[name="newItem"]').select(1);
      cy.get('input[name="newQty"]').clear().type('5');
      cy.get('input[name="newPrice"]').clear().type('200');
      cy.contains('button', 'Add').click();
      cy.get('.modal__footer .btn--primary').click();
      cy.get('.modal').should('not.exist');

      // 4. Verify sale appears
      cy.get('table.table tbody tr').should('have.length.gte', 1);

      // 5. Delete the sale
      cy.get('table.table tbody tr').first().within(() => {
        cy.contains('button', 'Delete').click();
      });
      cy.get('.modal__footer .btn--danger').click();

      // 6. Cleanup product
      cy.visit('/products');
      cy.contains('h1', 'Products', { timeout: 15000 }).should('be.visible');
      cy.get('body').then(($body) => {
        if ($body.text().includes('Sale Flow Product')) {
          cy.contains('tr', 'Sale Flow Product').find('button').contains('Delete').click();
          cy.get('.modal__footer .btn--danger').click();
        }
      });

      // 7. Cleanup customer
      cy.visit('/parties');
      cy.contains('h1', 'Parties', { timeout: 15000 }).should('be.visible');
      cy.get('body').then(($body) => {
        if ($body.text().includes('Sale Flow Customer')) {
          cy.contains('tr', 'Sale Flow Customer').find('button').contains('Delete').click();
          cy.get('.modal__footer .btn--danger').click();
        }
      });
    });
  });
});
