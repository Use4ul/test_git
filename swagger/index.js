const router = require('express').Router();
const swaggerUi = require('swagger-ui-express');
const fs = require('fs');
const path = require('path');
const swaggerDocument = require('./swaggerDocs/swagger.main.json');

router.get(
    '/docs',
    async (req, res) => {
        res.send(swaggerUi.setup(swaggerDocument))
    },
    swaggerUi.serve,
    swaggerUi.setup()
);

module.exports = router;
