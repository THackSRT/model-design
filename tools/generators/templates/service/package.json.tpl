{
  "name": "@atelier/__name__",
  "version": "0.1.0",
  "private": true,
  "description": "Service __name__ (à décrire en une phrase).",
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "lint": "eslint .",
    "test": "vitest run",
    "start": "node dist/main.js"
  },
  "dependencies": {
    "@atelier/contracts-ts": "workspace:*",
    "@atelier/kernel": "workspace:*",
    "@atelier/service-kit": "workspace:*",
    "@nestjs/common": "^11",
    "@nestjs/core": "^11",
    "@nestjs/platform-express": "^11",
    "reflect-metadata": "^0.2",
    "rxjs": "^7",
    "zod": "^4"
  },
  "devDependencies": {
    "@types/node": "^22"
  },
  "nx": { "tags": ["type:service", "scope:__name__"] }
}
