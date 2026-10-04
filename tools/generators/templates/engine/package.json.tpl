{
  "name": "@atelier/__name__",
  "version": "0.1.0",
  "private": true,
  "description": "Moteur __name__ (à décrire en une phrase) ; cœur pur et déterministe, identique dans le navigateur, un Worker et Node.",
  "type": "module",
  "exports": {
    ".": {
      "source": "./src/index.ts",
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./node": {
      "source": "./src/node.ts",
      "types": "./dist/node.d.ts",
      "default": "./dist/node.js"
    }
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "lint": "eslint .",
    "test": "vitest run"
  },
  "nx": {
    "tags": [
      "type:engine"
    ]
  },
  "devDependencies": {
    "@types/node": "^22.20.4"
  }
}
