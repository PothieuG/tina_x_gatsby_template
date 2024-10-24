# Tinasby

If you would like to use TinaCMS and its live editing features on top of Gatsby, you can follow the documentation below. Each step corresponds to a commit you can follow along.

## 1. Update `gatsby-config.ts`
If your Gatsby project doesn't already include `gatsby-plugin-mdx` and `gatsby-source-filesystem`, install them:

```bash
# Using npm
npm install gatsby-plugin-mdx gatsby-source-filesystem

# Using yarn
yarn add gatsby-plugin-mdx gatsby-source-filesystem
```
Then, update your `gatsby-config.ts` as follows:

```ts
 plugins: [
      {
          resolve: `gatsby-source-filesystem`,
          options: {
              name: `content`,
              path: `${__dirname}/content`,
          },
      },
      `gatsby-plugin-mdx`,
  ],
```
This code configures two plugins in Gatsby:
- `gatsby-source-filesystem`: Reads files from the local `content` directory.
- `gatsby-plugin-mdx`: Enables support for `.mdx` files, allowing Markdown with JSX.

Together, they allow Gatsby to process and render MDX content from the `content` directory.

## 2. Update the `config.ts` File from TinaCMS

In your TinaCMS `config.ts`, update the `defineConfig` object as follows:
- **Add** `client: { skip: true }`: Disables the TinaCMS client during the build process.
- **Change** the `publicFolder` of `build` and `media` to a folder other than `"public"`, for example, `"static"`.
- **Update** each of your collections as follows:
  ```ts
  format: 'mdx', // Specifies that the content will be stored and managed in MDX format, which combines Markdown and JSX.
         // Customizes the routing in the TinaCMS interface.
        ui: {
          router: ({ document }: { document: { _sys: { template: string; filename: string } } }) => {
            return `/${document._sys.template}/${document._sys.filename}`;
          },
        },
  ```
  This configuration:
  - Sets the content format to MDX.
  - Customizes the routing in the TinaCMS interface, generating URLs based on the template and filename of the document.

## 3. Create or Update `gatsby-node.ts`

Here is an example of a `gatsby-node.ts` file with explanations in comments:
```ts
import express from 'express';
import { parseMDX } from '@tinacms/mdx'; // Import the MDX parser from TinaCMS
import { GatsbyNode } from 'gatsby';
import path from 'path';
const queries = require('./tina/__generated__/queries'); // Import the generated queries from TinaCMS

// Gatsby's `createPages` API to programmatically create pages
export const createPages: GatsbyNode['createPages'] = async ({ graphql, actions }) => {
    const { createPage } = actions; // Destructure `createPage` function from Gatsby actions

    // Run a GraphQL query to fetch all MDX files from the filesystem
    const result = (await graphql(`
        {
            allFile(filter: { extension: { eq: "mdx" } }) {
                edges {
                    node {
                        id
                        childMdx {
                            frontmatter {
                                slug // Fetch the slug from the frontmatter
                            }
                            body // Fetch the content of the MDX file
                        }
                    }
                }
            }
        }
    `)) as { 
        data: { 
            allFile: { 
                edges: { 
                    node: { 
                        childMdx: { frontmatter: { slug: string }; body: string } 
                    } 
                }[] 
            } 
        } 
    };

    // Loop through each collection defined in the TinaCMS queries
    queries.collections.forEach((collection: any) => {
        // Loop through each MDX file found in the GraphQL query result
        result.data.allFile.edges.forEach(
            ({ node }: { node: { childMdx: { frontmatter: { slug: string }; body: string } } }) => {
                const { frontmatter, body } = node.childMdx; // Destructure slug and body from MDX node

                // Create a page in Gatsby for each MDX file
                createPage({
                    path: `${collection.collectionName}/${frontmatter.slug.toLowerCase()}`, // Set the URL path
                    component: path.resolve(`./src/templates/${collection.collectionName}.tsx`), // Use the appropriate template component based on the collection name
                    context: {
                        parsedMdx: parseMDX(
                            body, // Parse the MDX body content
                            { type: 'rich-text', name: 'markdownParser', parser: { type: 'markdown' } }, 
                            (s: string) => s // Provide a custom parser function (in this case, just a passthrough)
                        ),
                        variables: { relativePath: frontmatter.slug + '.mdx' }, // Pass the relative path to the context
                        query: `${collection.queries.frag}${collection.queries.query}`, // Use the specific queries for this collection
                    },
                    defer: true, // Enable deferred static generation (DSG) to optimize build performance
                });
            }
        );
    });
};

// Required for allowing static `admin/index.html` in development mode for TinaCMS
import { Express } from 'express';
exports.onCreateDevServer = ({ app }: { app: Express }) => {
    // Serve the admin panel from the `/admin` route using static files from the `public/admin` directory
    app.use('/admin', express.static('public/admin'));
};
```

## 4. Adding or Updating a Template

Create a template for each collection in your `src/templates` directory as a `.tsx` file. These templates will use the `pageContext` created during the page creation process in `gatsby-node.ts`.

Here is an example of a template with comments:
```ts
'use client';
import React from 'react';
import { TinaMarkdown } from 'tinacms/dist/rich-text'; // Import TinaCMS's rich-text Markdown component
import { useTina, tinaField, useEditState } from 'tinacms/dist/react'; // TinaCMS hooks for editing and managing content

// Define the shape of the page context, which includes the GraphQL query, variables, and parsed MDX data
interface PageContext {
    query: string;
    variables: Record<string, any>;
    parsedMdx: any;
}

// Main component for rendering the post
const Post = ({ pageContext }: { pageContext: PageContext }) => {
    const { edit } = useEditState(); // Check whether the user is in edit mode
    const { query, variables, parsedMdx } = pageContext; // Destructure the context to get query, variables, and MDX content

    // Fetch data using TinaCMS (with query and variables); initially, the parsed MDX data is passed
    const data = useTina({
        query: query,
        variables: variables,
        data: parsedMdx,
    });

    // If in edit mode, render fields with TinaCMS's live editing features
    if (edit) {
        return (
            <div>
                <h1>Post page:</h1>
                {/* Editable title field using TinaCMS's `data-tina-field` */}
                <h1 data-tina-field={tinaField(data?.data.post, 'title')}>{data?.data.post?.title}</h1>
                
                {/* Editable body field, rendering the content with TinaMarkdown */}
                <div data-tina-field={tinaField(data?.data.post, 'body')}>
                    <TinaMarkdown content={data?.data.post?.body} />
                </div>
            </div>
        );
    } else {
        // If not in edit mode, just render the post content as static Markdown
        return (
            <div>
                <TinaMarkdown content={data.data} />
            </div>
        );
    }
};

export default Post; // Export the Post component for use in the application
```


## 5. Update Markdown Files in Your Collection

- **Change** your files from `.md` to `.mdx`.
- ***Add** a `slug` property in the frontmatter of the file. This slug needs to reflect the name of the file.

Example:
```mdx
---
title: "My First Post"
slug: "my-first-post"
---

# My First Post

This is the content of my first post.
```

## 6. Add `generate-queries.js` at the Root of Your Project

This script will take the queries generated by TinaCMS, format them, and add them to a new `queries.js` file in the  `tina` folder.

Create a file named `generate-queries.js` at the root of your project with the following content:
```js
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
```

After running this script, your `queries.js` should look like:
```json
module.exports = {
    "collections": [
      {
        "collectionName": "post",
        "queries": {
          "query": "query post($relativePath: String!) {\n  post(relativePath: $relativePath) {\n    ... on Document {\n      _sys {\n        filename\n        basename\n        breadcrumbs\n        path\n        relativePath\n        extension\n      }\n      id\n    }\n    ...PostParts\n  }\n}",
          "frag": "fragment PostParts on Post {\n  __typename\n  title\n  slug\n  body\n}"
        }
      }
    ],
}
```

## 7. Add `update-tina-config.js` at the Root of Your Project

Create a file named `update-tina-config.js` at the root of your project. This script will change your client configuration to skip or not skip the client in the TinaCMS `config.ts` file, depending on the parameter.

```js
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
```

## 8. Update `package.json` Scripts

Finally, update your `package.json` file by adding the following lines to the `scripts` object:
```json
{
  "scripts": {
    "generate-queries": "node ./generate-queries.js",
    "update-config": "node ./update-tina-config.js",
    "dev": "npm run update-config -- false && npm run tina-build-local && npm run generate-queries && npm run update-config -- true && tinacms dev -c \"gatsby develop\"",
    "tina-build-local": "tinacms build --local || exit 0"
  }
}
```

Explanation of the dev script:
- **Update TinaCMS config (`skip: false`)**: Runs `npm run update-config -- false` to ensure the TinaCMS client is not skipped before starting the process.
- **Build TinaCMS locally**: Runs `tinacms build --local`. If this step fails, the process continues due to `|| exit 0`.
- **Generate queries**: Runs `npm run generate-queries` to generate necessary queries for the project.
- **Update TinaCMS config (`skip: true`)**: Runs `npm run update-config -- true` to skip the client after generating files.
- **Start the development server**: Runs `tinacms dev -c "gatsby develop"` to start both TinaCMS and Gatsby in development mode.

---
By following these steps, you should have TinaCMS integrated with Gatsby, enabling live editing of your MDX content. If you encounter any issues, ensure that all paths and configurations match your project's structure.
