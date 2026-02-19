import { Command } from 'commander';
import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import * as path from 'path';
import * as fs from 'fs';
import { timingSafeEqual } from 'crypto';
import chalk from 'chalk';
import { createAdminApiRouter } from './admin-api';

declare module 'express-session' {
  interface SessionData {
    authenticated: boolean;
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.session.authenticated) {
    next();
    return;
  }

  res.status(401).json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Login required' } });
}

const loginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      ok: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many login attempts. Please try again later.',
        details: { maxAttemptsPerHour: 5 },
      },
    });
  },
});

const adminApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

function secureCompare(input: string, expected: string): boolean {
  const a = Buffer.from(input, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

function addSecurityHeaders(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'"
  );
  if (req.secure || process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}

function buildStatusPayload() {
  return {
    service: 'mailgoat-admin',
    version: '1.1.8',
    uptimeSeconds: Math.floor(process.uptime()),
    checkedAt: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    rateLimit: {
      maxAttemptsPerHour: 5,
      windowSeconds: 3600,
    },
  };
}

export function createAdminCommand(): Command {
  const cmd = new Command('admin').description('Manage admin panel with authentication');

  cmd
    .command('serve')
    .description('Run admin panel web server with authentication')
    .option('--host <host>', 'Host to bind', '127.0.0.1')
    .option('--port <port>', 'Port to listen on', '3001')
    .option('--password <password>', 'Admin password (or set ADMIN_PASSWORD env var)')
    .option('--session-secret <secret>', 'Session secret (or set SESSION_SECRET env var)')
    .action((options) => {
      const host = String(options.host || '127.0.0.1');
      const port = parseInt(options.port, 10);

      const adminPassword = options.password || process.env.ADMIN_PASSWORD;
      if (!adminPassword) {
        console.error(
          chalk.red('Error: Admin password not set. Use --password or ADMIN_PASSWORD env var')
        );
        process.exit(1);
      }
      if (String(adminPassword).length < 12) {
        console.error(chalk.red('Error: admin password must be at least 12 characters long.'));
        process.exit(1);
      }

      const sessionSecret = options.sessionSecret || process.env.SESSION_SECRET;
      if (!sessionSecret) {
        console.error(
          chalk.red('Error: SESSION_SECRET not set. Use --session-secret or SESSION_SECRET env var')
        );
        process.exit(1);
      }
      if (String(sessionSecret).length < 32) {
        console.error(chalk.red('Error: SESSION_SECRET must be at least 32 characters.'));
        process.exit(1);
      }

      const distPath = path.resolve(process.cwd(), 'admin-ui', 'dist');
      if (!fs.existsSync(distPath)) {
        console.error(
          chalk.red('Error: admin-ui/dist not found. Run `npm run admin:ui:build` first.')
        );
        process.exit(1);
      }

      const app = express();
      app.disable('x-powered-by');
      app.set('trust proxy', 1);
      app.use(express.json());
      app.use(express.urlencoded({ extended: true }));
      app.use(addSecurityHeaders);
      app.use('/api/admin', adminApiLimiter);

      app.use(
        session({
          secret: sessionSecret,
          resave: false,
          saveUninitialized: false,
          cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000,
            sameSite: 'strict',
          },
        })
      );

      app.post('/admin/login', loginLimiter, (req: Request, res: Response) => {
        const password = String(req.body?.password || '');
        if (!secureCompare(password, String(adminPassword))) {
          res.status(401).json({
            ok: false,
            error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' },
          });
          return;
        }

        req.session.regenerate((err) => {
          if (err) {
            res.status(500).json({
              ok: false,
              error: { code: 'SESSION_ERROR', message: 'Failed to establish session' },
            });
            return;
          }
          req.session.authenticated = true;
          res.json({ ok: true, data: { authenticated: true } });
        });
      });

      app.post('/admin/logout', (req: Request, res: Response) => {
        req.session.destroy((err) => {
          if (err) {
            res.status(500).json({
              ok: false,
              error: { code: 'LOGOUT_FAILED', message: 'Failed to logout' },
            });
            return;
          }
          res.json({ ok: true, data: { loggedOut: true } });
        });
      });

      app.get('/api/admin/status', requireAuth, (_req: Request, res: Response) => {
        res.json({ ok: true, data: buildStatusPayload() });
      });

      // Mount admin API router
      app.use('/api/admin', requireAuth, createAdminApiRouter());

      app.use('/assets', express.static(path.join(distPath, 'assets')));
      app.use(express.static(distPath));

      app.get(['/admin', '/admin/*'], (_req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });

      app.get('/', (_req: Request, res: Response) => {
        res.redirect('/admin');
      });

      app.use((_req: Request, res: Response) => {
        res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Not found' } });
      });

      app.listen(port, host, () => {
        console.log(chalk.green('Admin panel server started'));
        console.log(chalk.gray(`  URL: http://${host}:${port}/admin`));
      });
    });

  return cmd;
}
