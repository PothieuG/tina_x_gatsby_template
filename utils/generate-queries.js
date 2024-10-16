const fs = require('fs');
const path = require('path');

const gqlDir = path.join(__dirname, '../tina/__generated__');
const outputFilePath = path.join(gqlDir, 'queries.js');

const generateQueries = () => {
    // Check if queries.js already exists, if so, delete it
    if (fs.existsSync(outputFilePath)) {
        fs.unlinkSync(outputFilePath);
    }

    // Objects to store fragments, collections, and connections
    const fragmentsMap = {};
    const collections = [];
    const connections = [];

    fs.readdirSync(gqlDir).forEach((file) => {
        if (file.endsWith('.gql')) {
            const gqlContent = fs.readFileSync(path.join(gqlDir, file), 'utf-8');

            // Use regular expressions to extract fragments and queries
            const fragmentRegex = /fragment\s+(\w+)[\s\S]+?(?=\n\n|$)/g;
            const queryRegex = /query\s+(\w+)[\s\S]+?(?=\n\n|$)/g;

            let match;

            // Extract fragments
            while ((match = fragmentRegex.exec(gqlContent)) !== null) {
                const fragmentName = match[1];
                const fragmentContent = match[0].trim();
                fragmentsMap[fragmentName] = fragmentContent;
            }

            // Extract queries
            while ((match = queryRegex.exec(gqlContent)) !== null) {
                const queryName = match[1];
                const queryContent = match[0].trim();

                // Find fragments used in the query
                const fragmentSpreadRegex = /\.\.\.(\w+)/g;
                const usedFragments = [];
                let spreadMatch;
                while ((spreadMatch = fragmentSpreadRegex.exec(queryContent)) !== null) {
                    const fragmentName = spreadMatch[1];
                    usedFragments.push(fragmentName);
                }

                // Retrieve the contents of the used fragments
                const fragmentsContent = {};
                usedFragments.forEach((fragmentName) => {
                    fragmentsContent[fragmentName] = fragmentsMap[fragmentName];
                });

                // Extract collection name from the query
                const collectionNameMatch = queryContent.match(/query\s+\w+\s*\([^)]*\)\s*{\s*(\w+)/);
                const collectionName = collectionNameMatch ? collectionNameMatch[1] : 'unknown';

                // Build the query object
                const queryObject = {
                    collectionName: collectionName,
                    queries: {
                        query: queryContent,
                        frag: usedFragments.map((fragName) => fragmentsContent[fragName]).join('\n'),
                    },
                };

                // Determine if it is a collection or a connection
                if (collectionName.endsWith('Connection')) {
                    connections.push(queryObject);
                } else {
                    collections.push(queryObject);
                }
            }
        }
    });

    // Build the final output object
    const outputObject = {
        collections: collections,
        connections: connections,
    };

    // Write the object to the queries.js file
    const outputContent = `module.exports = ${JSON.stringify(outputObject, null, 2)};\n`;
    fs.writeFileSync(outputFilePath, outputContent);

    console.log('queries.js file generated successfully!');
};

generateQueries();
