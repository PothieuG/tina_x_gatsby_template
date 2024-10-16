const fs = require('fs');
const path = require('path');

// Get the value of the skip argument
const skipArg = process.argv[2];
const skipValue = skipArg === 'true';

const tinaConfigPath = path.join(__dirname, '../tina/config.ts');

fs.readFile(tinaConfigPath, 'utf8', (err, data) => {
    if (err) {
        console.error('Erro during the reading of the file:', err);
        return;
    }

    // Regex to find the client.skip value
    const regex = /client:\s*{\s*skip:\s*(true|false)\s*}/;

    // Replace the client.skip value with the
    const updatedConfig = data.replace(regex, `client: { skip: ${skipValue} }`);

    fs.writeFile(tinaConfigPath, updatedConfig, 'utf8', (err) => {
        if (err) {
            console.error('Error while writing the value:', err);
            return;
        }
        console.log(`Update of Tina config file, now the client.skipValue = ${skipValue}`);
    });
});
