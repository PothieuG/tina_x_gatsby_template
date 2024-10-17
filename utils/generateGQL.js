const fs = require('fs');
const path = require('path');

const graphqlJson = JSON.parse(fs.readFileSync('./tina/__generated__/_graphql.json', 'utf-8'));
const lookupJson = JSON.parse(fs.readFileSync('./tina/__generated__/_lookup.json', 'utf-8'));
const schemaJson = JSON.parse(fs.readFileSync('./tina/__generated__/_schema.json', 'utf-8'));

function generateFragments() {
  let fragments = '';

  graphqlJson.definitions.forEach((definition) => {
    if (definition.kind === 'ObjectTypeDefinition') {
      const typeName = definition.name.value;

      if (lookupJson[typeName] && definition.fields && definition.fields.length > 0) {
        let fragment = `fragment ${typeName}Parts on ${typeName} {\n`;

        fragment += `  __typename\n`;

        definition.fields.forEach((field) => {
          const fieldName = field.name.value;
          fragment += `  ${fieldName}\n`;
        });

        fragment += `}\n\n`;
        fragments += fragment;
      }
    }
  });

  return fragments;
}

function generateQueries() {
  let queries = '';

  queries += `query post($relativePath: String!) {\n`;
  queries += `  post(relativePath: $relativePath) {\n`;
  queries += `    ... on Document {\n`;
  queries += `      _sys {\n`;
  queries += `        filename\n`;
  queries += `        basename\n`;
  queries += `        breadcrumbs\n`;
  queries += `        path\n`;
  queries += `        relativePath\n`;
  queries += `        extension\n`;
  queries += `      }\n`;
  queries += `      id\n`;
  queries += `    }\n`;
  queries += `    ...PostParts\n`;
  queries += `  }\n`;
  queries += `}\n\n`;

  queries += `query postConnection(\n`;
  queries += `  $before: String\n`;
  queries += `  $after: String\n`;
  queries += `  $first: Float\n`;
  queries += `  $last: Float\n`;
  queries += `  $sort: String\n`;
  queries += `  $filter: PostFilter\n`;
  queries += `) {\n`;
  queries += `  postConnection(\n`;
  queries += `    before: $before\n`;
  queries += `    after: $after\n`;
  queries += `    first: $first\n`;
  queries += `    last: $last\n`;
  queries += `    sort: $sort\n`;
  queries += `    filter: $filter\n`;
  queries += `  ) {\n`;
  queries += `    pageInfo {\n`;
  queries += `      hasPreviousPage\n`;
  queries += `      hasNextPage\n`;
  queries += `      startCursor\n`;
  queries += `      endCursor\n`;
  queries += `    }\n`;
  queries += `    totalCount\n`;
  queries += `    edges {\n`;
  queries += `      cursor\n`;
  queries += `      node {\n`;
  queries += `        ... on Document {\n`;
  queries += `          _sys {\n`;
  queries += `            filename\n`;
  queries += `            basename\n`;
  queries += `            breadcrumbs\n`;
  queries += `            path\n`;
  queries += `            relativePath\n`;
  queries += `            extension\n`;
  queries += `          }\n`;
  queries += `          id\n`;
  queries += `        }\n`;
  queries += `        ...PostParts\n`;
  queries += `      }\n`;
  queries += `    }\n`;
  queries += `  }\n`;
  queries += `}\n`;

  return queries;
}

const fragments = generateFragments();
const queries = generateQueries();

fs.writeFileSync('./tina/__generated__/_frags.gql', fragments, 'utf-8');

fs.writeFileSync('./tina/__generated__/_queries.gql', queries, 'utf-8');

console.log('Les fichiers queries.gql et frags.gql ont été générés avec succès.');
