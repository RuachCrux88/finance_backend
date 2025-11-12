import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import serverlessExpress from '@vendia/serverless-express';
import type { Callback, Context, Handler } from 'aws-lambda';
import { AppModule } from './app.module';

declare const module: any;

declare global {
  // eslint-disable-next-line no-var
  var __nestServer: ReturnType<typeof createNestApp> | null | undefined;
  // eslint-disable-next-line no-var
  var __nestExpress: any;
  // eslint-disable-next-line no-var
  var __nestLambda: Handler | null | undefined;
}

async function createNestApp() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.init();

  globalThis.__nestExpress = app.getHttpAdapter().getInstance();
  globalThis.__nestLambda = serverlessExpress({ app: globalThis.__nestExpress });

  return app;
}

async function getApp() {
  if (!globalThis.__nestServer) {
    globalThis.__nestServer = createNestApp();
  }
  return globalThis.__nestServer;
}

export async function bootstrap() {
  const app = await getApp();
  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_EXECUTION_ENV);

if (!isServerless) {
  bootstrap().catch((err) => {
    console.error('Error bootstrapping Nest application', err);
    process.exit(1);
  });
}

export const handler: Handler = async (event: any, context: Context, callback: Callback) => {
  await getApp();
  if (!globalThis.__nestLambda) {
    throw new Error('Lambda handler not initialized');
  }
  return globalThis.__nestLambda(event, context, callback);
};

export default async function vercelHandler(req: any, res: any) {
  await getApp();
  if (!globalThis.__nestExpress) {
    throw new Error('Express instance not initialized');
  }
  return globalThis.__nestExpress(req, res);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = vercelHandler;
  module.exports.default = vercelHandler;
  module.exports.handler = handler;
  module.exports.bootstrap = bootstrap;
}
