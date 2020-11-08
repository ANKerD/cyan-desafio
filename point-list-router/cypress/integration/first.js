describe('Test Packet ', () => {
    beforeEach(() => {
        //cy.exec('npm run db:reset && npm run db:seed')
    });
    it('check page is local online', () => {
        cy.visit('http://localhost/');
        cy.get('title').should('have.text', 'Cyan-Agro : Mini App Desafio');
    });

    it('check "envio" is online', () => {
        cy.visit('http://localhost/envio');
        cy.get('.title_envio').should('have.text', 'Envio de arquivo:');
    });

    it('check "envio" component is sending', () => {
        cy.visit('http://localhost/envio')
        cy.get('.input_envio1')
            .type('{backspace}{backspace}{backspace}{backspace}{backspace}{backspace}{backspace}{backspace}{backspace}{backspace}{backspace}{backspace}{backspace}{backspace}{backspace}/pasta1/arquivo1', { delay: 100 })
            .should('have.value', '/pasta1/arquivo1');
        cy.get('.input_envio2').click();
        
    });

    it('check "historico" is online', () => {
        cy.visit('http://localhost/historico');
        cy.get('.title_historico').should('have.text', 'Histórico:');
    });
    
});
