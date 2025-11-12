import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import serverlessExpress from '@vendia/serverless-express';
import type { Callback, Context, Handler } from 'aws-lambda';
import { AppModule } from './app.module';

let appPromise: ReturnType<typeof createNestApp> | null = null;
let lambdaHandler: Handler | null = null;
let expressInstance: any = null;

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
  expressInstance = app.getHttpAdapter().getInstance();
  lambdaHandler = serverlessExpress({ app: expressInstance });

  return app;
}

async function getApp() {
  if (!appPromise) {
    appPromise = createNestApp();
  }
  return appPromise;
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
  if (!lambdaHandler) {
    throw new Error('Lambda handler not initialized');
  }
  return lambdaHandler(event, context, callback);
};

export default async function vercelHandler(req: any, res: any) {
  await getApp();
  if (!expressInstance) {
    throw new Error('Express instance not initialized');
  }
  return expressInstance(req, res);
}
