import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException } from '@nestjs/common';
import type { Logger } from '../logger.js';
import { problem, PROBLEM_CONTENT_TYPE, type Problem } from '../problem.js';

/** Erreur prévue, déjà traduite en Problem par l'adaptateur HTTP. */
export class ProblemException extends Error {
  constructor(readonly problem: Problem) {
    super(problem.detail ?? problem.title);
  }
}

interface ReplyLike {
  status(code: number): ReplyLike;
  type(contentType: string): ReplyLike;
  send(body: string): void;
}

/** Toute erreur sort au format RFC 9457 ; une erreur imprévue ne dévoile ni pile ni détail interne. */
@Catch()
export class ProblemFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const reply = host.switchToHttp().getResponse<ReplyLike>();
    const body = this.toProblem(exception);
    reply.status(body.status).type(PROBLEM_CONTENT_TYPE).send(JSON.stringify(body));
  }

  private toProblem(exception: unknown): Problem {
    if (exception instanceof ProblemException) return exception.problem;
    if (exception instanceof HttpException)
      return problem('http-error', exception.getStatus(), exception.message);
    this.logger.log('error', 'unexpected-error', {
      message: exception instanceof Error ? exception.message : 'inconnu',
    });
    return problem('internal-error', 500);
  }
}
