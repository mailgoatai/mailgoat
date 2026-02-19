import { Command } from 'commander';
import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';

// Extend Express Request to include session
declare module 'express-session' {
  interface SessionData {
    authenticated: boolean;
  }
}

// Authentication middleware
function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.session.authenticated) {
    next();
  } else {
    res.redirect('/admin/login');
  }
}

// Rate limiter for login attempts
const loginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 attempts per hour per IP
  message: 'Too many login attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

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
      const host = options.host;
      const port = parseInt(options.port, 10);

      // Get password from option or environment
      const adminPassword = options.password || process.env.ADMIN_PASSWORD;
      if (!adminPassword) {
        console.error(
          chalk.red('Error: Admin password not set. Use --password or ADMIN_PASSWORD env var')
        );
        process.exit(1);
      }

      // Get session secret from option or environment
      const sessionSecret =
        options.sessionSecret || process.env.SESSION_SECRET || generateRandomSecret();
      if (!options.sessionSecret && !process.env.SESSION_SECRET) {
        console.log(
          chalk.yellow(
            'Warning: Using generated session secret. Set SESSION_SECRET env var for production.'
          )
        );
      }

      const app = express();

      // Trust proxy if behind reverse proxy
      app.set('trust proxy', 1);

      // Parse JSON and form data
      app.use(express.json());
      app.use(express.urlencoded({ extended: true }));

      // Session middleware
      app.use(
        session({
          secret: sessionSecret,
          resave: false,
          saveUninitialized: false,
          cookie: {
            secure: process.env.NODE_ENV === 'production', // HTTPS only in production
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            sameSite: 'strict',
          },
        })
      );

      // Serve static files from admin-ui directory
      const adminUiPath = path.join(__dirname, '..', '..', 'admin-ui');

      // Login page (no auth required)
      app.get('/admin/login', (req, res) => {
        if (req.session.authenticated) {
          res.redirect('/admin');
          return;
        }

        const loginHtml = fs.readFileSync(path.join(adminUiPath, 'login.html'), 'utf-8');
        res.send(loginHtml);
      });

      // Login POST endpoint with rate limiting
      app.post('/admin/login', loginLimiter, (req, res) => {
        const { password } = req.body;

        if (password === adminPassword) {
          req.session.authenticated = true;
          res.redirect('/admin');
        } else {
          // Return to login with error
          const loginHtml = fs.readFileSync(path.join(adminUiPath, 'login.html'), 'utf-8');
          const htmlWithError = loginHtml.replace(
            '<div id="error-message" class="error-message" style="display: none;">',
            '<div id="error-message" class="error-message" style="display: block;">Incorrect password. Please try again.'
          );
          res.status(401).send(htmlWithError);
        }
      });

      // Logout endpoint
      app.post('/admin/logout', (req, res) => {
        req.session.destroy((err) => {
          if (err) {
            console.error('Error destroying session:', err);
          }
          res.redirect('/admin/login');
        });
      });

      // Admin panel (requires auth)
      app.get('/admin', requireAuth, (req: Request, res: Response) => {
        const adminHtml = fs.readFileSync(path.join(adminUiPath, 'admin.html'), 'utf-8');
        res.send(adminHtml);
      });

      // Serve static CSS
      app.get('/admin/styles.css', (req: Request, res: Response) => {
        res.sendFile(path.join(adminUiPath, 'styles.css'));
      });

      // API endpoints (all require auth)
      app.use('/api/admin', requireAuth);

      // Example API endpoint
      app.get('/api/admin/status', (req: Request, res: Response) => {
        res.json({
          status: 'ok',
          authenticated: true,
          timestamp: new Date().toISOString(),
        });
      });

      // Redirect root to admin
      app.get('/', (req: Request, res: Response) => {
        res.redirect('/admin');
      });

      // 404 handler
      app.use((req: Request, res: Response) => {
        res.status(404).send('Not found');
      });

      // Start server
      app.listen(port, host, () => {
        console.log(chalk.green('Admin panel server started'));
        console.log(chalk.gray(`  URL: http://${host}:${port}/admin`));
        console.log(chalk.gray(`  Login: http://${host}:${port}/admin/login`));
      });

      const shutdown = () => {
        console.log(chalk.yellow('\nShutting down admin panel...'));
        process.exit(0);
      };

      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
    });

  return cmd;
}

// Generate a random session secret
function generateRandomSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=';
  let secret = '';
  for (let i = 0; i < 32; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
}
