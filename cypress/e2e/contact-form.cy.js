describe("Contact form", () => {
  it("Envoyer un formulaire de contact avec succès et afficher le message de confirmation", () => {
    cy.visit("/");

    cy.get("#contact").within(() => {
      cy.get('input[name="nom"]').type("Doe");
      cy.get('input[name="prenom"]').type("John");

      cy.get('[data-testid="select-testid"] [data-testid="collapse-button-testid"]').click();
      cy.contains("li", "Entreprise").click();

      cy.get('input[name="email"]').type("john.doe@example.com");
      cy.get('textarea[name="message"]').type(
        "Bonjour, ceci est un message de test."
      );

      cy.get('[data-testid="button-test-id"]').click();
    });

    // cy.contains("Message envoyé !").should("be.visible");
    cy.contains("helloFail").should("be.visible");
  });
});
