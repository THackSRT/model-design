/** Erreur HTTP au format RFC 9457 (application/problem+json). `type` est stable et traduisible. */
export interface Problem {
  type: string;
  title: string;
  status: number;
  detail?: string;
  errors?: string[];
}

export const PROBLEM_CONTENT_TYPE = 'application/problem+json';

export function problem(kind: string, status: number, detail?: string): Problem {
  return {
    type: `/problems/${kind}`,
    title: kind.replace(/-/g, ' '),
    status,
    ...(detail ? { detail } : {}),
  };
}
