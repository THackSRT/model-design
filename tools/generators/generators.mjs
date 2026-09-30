// Gabarits copiés avec remplacement des noms. Chaque générateur rend la liste des fichiers créés.
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const TEMPLATES = join(dirname(fileURLToPath(import.meta.url)), 'templates');
const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

const pascal = (kebab) => kebab.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase());
const snake = (kebab) => kebab.replace(/-/g, '_');

function assertName(name, what) {
  if (!name || !KEBAB.test(name))
    throw new Error(`${what} : nom en kebab-case attendu (ex. supplier-stock), reçu « ${name} ».`);
}

function listFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
}

/** Copie un gabarit et remplace les noms (__name__, __Name__, __nameCamel__, __name_snake__). */
function instantiate(root, template, target, name) {
  const camel = pascal(name).replace(/^\w/, (c) => c.toLowerCase());
  const vars = {
    __name_snake__: snake(name),
    __nameCamel__: camel,
    __Name__: pascal(name),
    __name__: name,
  };
  const replace = (text) => Object.entries(vars).reduce((t, [k, v]) => t.replaceAll(k, v), text);
  const files = listFiles(join(TEMPLATES, template)).map((file) => ({
    file,
    out: join(
      root,
      target,
      replace(relative(join(TEMPLATES, template), file)).replace(/\.tpl$/, ''),
    ),
  }));
  const taken = files.find(({ out }) => existsSync(out));
  if (taken) throw new Error(`${relative(root, taken.out)} existe déjà.`);
  for (const { file, out } of files) {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, replace(readFileSync(file, 'utf8')));
  }
  return files.map(({ out }) => relative(root, out));
}

export function generateService(root, name) {
  assertName(name, 'service');
  const created = instantiate(root, 'service', `services/${name}`, name);
  return [...created, ...instantiate(root, 'service-contract', 'contracts/openapi', name)];
}

export function generateEngine(root, name) {
  assertName(name, 'moteur');
  const created = instantiate(root, 'engine', `engines/${name}`, name);
  const pyproject = join(root, 'pyproject.toml');
  const text = readFileSync(pyproject, 'utf8');
  writeFileSync(
    pyproject,
    text.replace(/members = \[([^\]]*)\]/, (_, list) => `members = [${list}, "engines/${name}"]`),
  );
  return [...created, 'pyproject.toml (membre ajouté)'];
}

export function generateEvent(root, eventName, producer = 'à-renseigner') {
  const match = /^([a-z][a-z-]*)\.([a-z_]+)$/.exec(eventName ?? '');
  if (!match)
    throw new Error(
      `événement : nom <entité>.<verbe au passé> attendu (ex. stock.reserved), reçu « ${eventName} ».`,
    );
  const file = `contracts/schemas/events/${match[1]}-${match[2].replace(/_/g, '-')}.schema.json`;
  if (existsSync(join(root, file))) throw new Error(`${file} existe déjà.`);
  const title = pascal(`${match[1]}-${match[2].replace(/_/g, '-')}`);
  const schema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: `https://atelier.example/schemas/events/${match[1]}-${match[2].replace(/_/g, '-')}.schema.json`,
    title,
    description: `Données de l'événement ${eventName} : identifiants et faits, jamais de donnée sensible.`,
    type: 'object',
    additionalProperties: false,
    required: ['organizationId'],
    properties: { organizationId: { type: 'string', format: 'uuid' } },
  };
  writeFileSync(join(root, file), `${JSON.stringify(schema, null, 2)}\n`);
  const asyncapi = join(root, 'contracts/asyncapi/events.yaml');
  const channel = title.charAt(0).toLowerCase() + title.slice(1);
  const text = readFileSync(asyncapi, 'utf8')
    .replace(
      'channels:\n',
      `channels:\n  ${channel}:\n    address: ${eventName}\n    messages:\n      ${channel}:\n        name: ${eventName}\n        payload:\n          $ref: '../schemas/events/${relative(join(root, 'contracts/schemas/events'), join(root, file))}'\n`,
    )
    .replace(
      'operations:\n',
      `operations:\n  publish${title}:\n    action: send\n    channel: { $ref: '#/channels/${channel}' }\n    x-producer: ${producer}\n    x-consumers: []\n`,
    );
  writeFileSync(asyncapi, text);
  return [file, 'contracts/asyncapi/events.yaml (canal et opération ajoutés)'];
}

export function generateScreen(root, app, screen) {
  assertName(app, 'application');
  assertName(screen, 'écran');
  if (!existsSync(join(root, 'apps', app))) throw new Error(`apps/${app} n'existe pas.`);
  const views = instantiate(root, 'screen-app', `apps/${app}/src/screens/${screen}`, screen);
  const model = instantiate(root, 'screen-feature', `packages/features/src/${screen}`, screen);
  return [...views, ...model];
}
