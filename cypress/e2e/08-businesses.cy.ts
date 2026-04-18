describe('Business Management', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/businesses');
    cy.contains('h1', 'Businesses', { timeout: 15000 }).should('be.visible');
  });

  it('should display businesses page', () => {
    cy.contains('h1', 'Businesses').should('be.visible');
    cy.contains('button', '+ Add Business').should('be.visible');
  });

  it('should show at least one business card', () => {
    cy.get('.biz-card').should('have.length.gte', 1);
  });

  it('should show active badge on current business', () => {
    cy.get('.badge--success').should('contain', 'Active');
  });

  it('should show and cancel business form', () => {
    cy.contains('button', '+ Add Business').click();
    cy.get('input[name="nameEn"]').should('be.visible');
    cy.get('input[name="nameBn"]').should('be.visible');
    cy.get('input[name="phone"]').should('be.visible');
    cy.get('input[name="address"]').should('be.visible');

    // Validation
    cy.contains('button', 'Save').click();
    cy.contains('At least one business name is required').should('be.visible');

    // Cancel
    cy.contains('button', 'Cancel').click();
    cy.get('input[name="nameEn"]').should('not.exist');
  });

  it('should open edit form when clicking Edit', () => {
    cy.get('.biz-card').first().within(() => {
      cy.contains('button', 'Edit').click();
    });
    cy.contains('Edit Business').should('be.visible');
    cy.contains('button', 'Cancel').click();
  });
});
