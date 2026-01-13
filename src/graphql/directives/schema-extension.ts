export const federationDirectiveExtensions = `
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.3",
          import: ["@key", "@shareable", "@composeDirective"])
    @link(url: "https://myspecs.dev/accessControl/v1.0",
          import: ["@public", "@private"])
    @composeDirective(name: "@public")
    @composeDirective(name: "@private")
`;
