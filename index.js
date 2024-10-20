const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;
const swaggerUi = require('swagger-ui-express');

const swaggerDocument = require('./swagger/swaggerDocs/swagger.main.json');
const swaggerRoutes = require('./swagger/index.js');

app.use('/swagger', swaggerRoutes);
app.use('/swagger1', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
