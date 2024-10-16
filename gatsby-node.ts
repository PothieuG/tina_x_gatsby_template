import express from 'express';
import { parseMDX } from '@tinacms/mdx';
import { GatsbyNode } from 'gatsby';
import path from 'path';
const queries = require('./tina/__generated__/queries');

export const createPages: GatsbyNode['createPages'] = async ({ graphql, actions }) => {
    const { createPage } = actions;

    const result = (await graphql(`
        {
            allFile(filter: { extension: { eq: "mdx" } }) {
                edges {
                    node {
                        id
                        childMdx {
                            frontmatter {
                                slug
                            }
                            body
                        }
                    }
                }
            }
        }
    `)) as { data: { allFile: { edges: { node: { childMdx: { frontmatter: { slug: string }; body: string } } }[] } } };

    queries.collections.forEach((collection: any) => {
        result.data.allFile.edges.forEach(
            ({ node }: { node: { childMdx: { frontmatter: { slug: string }; body: string } } }) => {
                const { frontmatter, body } = node.childMdx;

                createPage({
                    path: `${collection.collectionName}/${frontmatter.slug.toLowerCase()}`,
                    component: path.resolve(`./src/templates/${collection.collectionName}.tsx`),
                    context: {
                        parsedMdx: parseMDX(
                            body,
                            { type: 'rich-text', name: 'markdownParser', parser: { type: 'markdown' } },
                            (s: string) => s
                        ),
                        variables: { relativePath: frontmatter.slug + '.mdx' },
                        query: `${collection.queries.frag}${collection.queries.query}`,
                    },
                    defer: true,
                });
            }
        );
    });
};

//Required as per https://tina.io/docs/frameworks/gatsby/#allowing-static-adminindexhtml-file-in-dev-mode
import { Express } from 'express';

exports.onCreateDevServer = ({ app }: { app: Express }) => {
    app.use('/admin', express.static('public/admin'));
};
