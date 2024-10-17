import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const queriesGql = fs.readFileSync(path.resolve(__dirname, './tina/__generated__/queries.gql'), 'utf8');
const fragmentsGql = fs.readFileSync(path.resolve(__dirname, './tina/__generated__/frags.gql'), 'utf8');

function extractQuery(queryName: string, queries: string) {
  const regex = new RegExp(`(query\\s+${queryName}[\\s\\S]*?\\n\\})`, 'g');
  const matches = queries.match(regex);
  if (matches && matches.length > 0) {
    return matches[0];
  } else {
    throw new Error(`La requête ${queryName} n'a pas été trouvée dans les requêtes générées.`);
  }
}

const POST_CONNECTION_QUERY = extractQuery('postConnection', queriesGql);

const FULL_POST_CONNECTION_QUERY = `${POST_CONNECTION_QUERY}\n\n${fragmentsGql}`;

async function fetchTinaData(query: string, variables: Record<string, any>) {
  if (!process.env.TINA_GRAPHQL_ENDPOINT) {
    throw new Error('TINA_GRAPHQL_ENDPOINT is not defined');
  }
  const response = await fetch(process.env.TINA_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.TINA_TOKEN || 'your_tina_token'}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await response.json();
  if (json.errors) {
    console.error('Erreur lors de la requête Tina:', json.errors);
    throw new Error('Erreur dans la requête GraphQL de Tina');
  }
  return json.data;
}

exports.createPages = async ({ actions }: { actions: { createPage: Function } }) => {
  const { createPage } = actions;

  const tinaData = await fetchTinaData(FULL_POST_CONNECTION_QUERY, {
    first: 100,
  });

  console.log('tinaData', tinaData);

  tinaData.postConnection.edges.forEach(({ node }: { node: { _sys: { relativePath: string }; slug: string; body: string } }) => {
    const { _sys, slug, body } = node;

    createPage({
      path: `posts/${slug.toLowerCase()}`,
      component: path.resolve(`./src/templates/post.tsx`),
      context: {
        relativePath: _sys.relativePath,
        slug,
        body,
      },
      defer: true,
    });
  });
};

import express from 'express';

exports.onCreateDevServer = ({ app }: { app: express.Application }) => {
  app.use('/admin', express.static('public/admin'));
};
