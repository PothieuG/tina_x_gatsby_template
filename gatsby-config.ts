import type { GatsbyConfig } from "gatsby";

const config: GatsbyConfig = {
  siteMetadata: {
    title: `tinatsby_tutorial`,
    siteUrl: `https://www.yourdomain.tld`
  },
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
};

export default config;
