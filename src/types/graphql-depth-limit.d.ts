declare module 'graphql-depth-limit' {
  import { ASTVisitor, ValidationContext } from 'graphql';
  function depthLimit(
    maxDepth: number,
    options?: Record<string, unknown>,
    callback?: (depths: Record<string, number>) => void,
  ): (context: ValidationContext) => ASTVisitor;
  export = depthLimit;
}
