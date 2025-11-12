import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import serverlessExpress from '@vendia/serverless-express';
import type { Callback, Context, Handler } from 'aws-lambda';
import { AppModule } from './app.module';

async function createApp() {
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

  return app;
}

async function createNestServer() {
  const app = await createApp();
  await app.init();
  return app;
}

export async function bootstrap() {
  const app = await createNestServer();
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

let cachedServer: Handler | null = null;

export const handler: Handler = async (event: any, context: Context, callback: Callback) => {
  if (!cachedServer) {
    const app = await createNestServer();
    const expressApp = app.getHttpAdapter().getInstance();
    cachedServer = serverlessExpress({ app: expressApp });
  }

  return cachedServer(event, context, callback);
};
