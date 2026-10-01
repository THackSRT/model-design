// Active les hooks du dépôt (.githooks, dont pre-push) ; lancé par `pnpm install` (script prepare).
// En Node plutôt qu'en shell : `2>/dev/null` n'existe pas sous cmd.exe (Windows).
import { execFileSync } from 'node:child_process';

try {
  execFileSync('git', ['config', 'core.hooksPath', '.githooks'], { stdio: 'ignore' });
} catch {
  // Hors d'un dépôt git (archive, image Docker) : rien à activer.
}
