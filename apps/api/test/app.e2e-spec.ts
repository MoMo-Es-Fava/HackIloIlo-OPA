import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/database/prisma.service';
import { createPrismaServiceMock } from './prisma-service.mock';
import { UsersRepository } from '../src/modules/users/users.repository';
import { InMemoryUsersRepository } from '../src/modules/users/in-memory-users.repository';

describe('API (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters';
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(UsersRepository)
      .useClass(InMemoryUsersRepository)
      .overrideProvider(PrismaService)
      .useValue(createPrismaServiceMock())
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /health', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) =>
        expect((res.body as { status: string }).status).toBe('ok'),
      );
  });
});
