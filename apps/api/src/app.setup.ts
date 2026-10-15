import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Shared by main.ts and the e2e tests so both run the same pipes and CORS rules.
export function configureApp(app: INestApplication) {
  const config = app.get(ConfigService);

  app.enableCors({
    origin: config
      .get<string>('WEB_ORIGIN', 'http://localhost:3000')
      .split(',')
      .map((origin) => origin.trim()),
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();
}
