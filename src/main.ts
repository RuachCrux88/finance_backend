// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as express from 'express';

let cachedApp: express.Express;

async function createApp(): Promise<express.Express> {
  if (cachedApp) {
    return cachedApp;
  }

  const expressApp = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));

  app.use(cookieParser());
  
  // Configurar CORS con múltiples orígenes permitidos
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.NEXT_PUBLIC_API_BASE_URL,
    'https://financefrontend-pink.vercel.app',
    'http://localhost:3000',
  ].filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Permitir requests sin origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Permitir todos en desarrollo, ajustar en producción
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Agregar validación global
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  await app.init();
  cachedApp = expressApp;
  return expressApp;
}

// Exportar handler para Vercel (siempre exportar, Vercel lo detectará)
export default async function handler(req: express.Request, res: express.Response) {
  const app = await createApp();
  return app(req, res);
}

// También exportar como module.exports para compatibilidad con CommonJS
module.exports = async (req: express.Request, res: express.Response) => {
  const app = await createApp();
  return app(req, res);
};

// Para desarrollo local (solo si no está en Vercel)
if (!process.env.VERCEL && !process.env.VERCEL_ENV) {
  createApp().then((expressApp) => {
    const port = Number(process.env.PORT) || 4000;
    expressApp.listen(port, () => {
      console.log(`API up on http://localhost:${port}`);
    });
  });
}
