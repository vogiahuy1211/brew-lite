const ts = require('typescript');

module.exports = {
  process(sourceText, sourcePath) {
    const patched = sourceText.replace(
      /import\.meta\.url/g,
      'require("url").pathToFileURL(__filename).href',
    );
    const result = ts.transpileModule(patched, {
      fileName: sourcePath,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        emitDecoratorMetadata: true,
        experimentalDecorators: true,
        sourceMap: true,
      },
    });
    return {
      code: result.outputText,
      map: result.sourceMapText,
    };
  },
};
