import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Role, type AuthResponse } from '@irpc/types';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { Roles } from '../src/common/auth.decorators';
import { PrismaService } from '../src/database/prisma.service';
import { SmsProvider } from '../src/integrations/textbee/sms.service';
import { InMemoryUsersRepository } from '../src/modules/users/in-memory-users.repository';
import { UsersRepository } from '../src/modules/users/users.repository';
import { createPrismaServiceMock } from './prisma-service.mock';

// Test-only route to check role enforcement.
@Controller('test-admin')
class AdminProbeController {
  @Roles('ADMIN')
  @Get()
  ok() {
    return { ok: true };
  }
}

const register = {
  name: 'Juan Dela Cruz',
  phone: '0917 123 4567',
  pin: '1234',
  accountType: 'FARMER',
  language: 'HIL',
  municipality: 'Pototan',
  consent: true,
};

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let users: UsersRepository;
  let sendSms: jest.Mock;

  beforeEach(async () => {
    process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters';
    sendSms = jest.fn().mockResolvedValue({ status: 'mocked' });
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [AdminProbeController],
    })
      .overrideProvider(UsersRepository)
      .useClass(InMemoryUsersRepository)
      .overrideProvider(PrismaService)
      .useValue(createPrismaServiceMock())
      .overrideProvider(SmsProvider)
      .useValue({ send: sendSms })
      .compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    users = app.get(UsersRepository);
  });

  afterEach(() => app.close());

  const http = () => request(app.getHttpServer());
  const login = (phone: string, pin: string) =>
    http().post('/auth/login').send({ phone, pin });
  const verifiedRegister = async () => {
    await http()
      .post('/auth/register/code')
      .send({ phone: register.phone })
      .expect(201);
    const message = sendSms.mock.calls.at(-1)?.[1] as string;
    const verificationCode = /\b\d{6}\b/.exec(message)?.[0];
    expect(verificationCode).toBeDefined();
    return http()
      .post('/auth/register')
      .send({ ...register, verificationCode });
  };
  const messageOf = (res: { body: unknown }) =>
    (res.body as { message: string }).message;

  it('registers, normalizes the phone, and never returns the PIN', async () => {
    const res = await verifiedRegister().expect(201);
    const body = res.body as AuthResponse;
    expect(body.token).toEqual(expect.any(String));
    expect(body.user).toMatchObject({
      phone: '+639171234567',
      role: Role.USER,
      accountType: 'FARMER',
    });
    expect(JSON.stringify(body)).not.toMatch(/pin/i);
  });

  it('refuses sign-up without consent, bad phones, and bad PINs', async () => {
    await http()
      .post('/auth/register')
      .send({ ...register, consent: false })
      .expect(400);
    await http()
      .post('/auth/register')
      .send({ ...register, phone: '12345' })
      .expect(400);
    await http()
      .post('/auth/register')
      .send({ ...register, pin: '12' })
      .expect(400);
  });

  it('ignores attempts to self-assign a role', async () => {
    await http()
      .post('/auth/register')
      .send({ ...register, role: 'ADMIN' })
      .expect(400);
  });

  it('rejects a duplicate phone', async () => {
    await verifiedRegister().expect(201);
    await http()
      .post('/auth/register/code')
      .send({ phone: '+639171234567' })
      .expect(409);
  });

  it('logs in with the right PIN and rejects a wrong one with the same message as an unknown phone', async () => {
    await verifiedRegister().expect(201);
    await login('09171234567', '1234').expect(200);
    const wrongPin = await login('09171234567', '9999').expect(401);
    const unknown = await login('09990000000', '1234').expect(401);
    expect(messageOf(wrongPin)).toBe(messageOf(unknown));
  });

  it('requires a valid token for /auth/me', async () => {
    const res = await verifiedRegister().expect(201);
    const { token } = res.body as AuthResponse;
    const me = await http()
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(me.body).toMatchObject({ phone: '+639171234567' });
    await http().get('/auth/me').expect(401);
    await http()
      .get('/auth/me')
      .set('Authorization', 'Bearer not-a-token')
      .expect(401);
  });

  it('enforces roles: users get 403 on admin routes, admins get through', async () => {
    const res = await verifiedRegister().expect(201);
    const userToken = (res.body as AuthResponse).token;
    await http().get('/test-admin').expect(401);
    await http()
      .get('/test-admin')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);

    await users.create({
      name: 'IRPC Admin',
      phone: '+639170000001',
      role: Role.ADMIN,
      pinHash: await bcrypt.hash('4321', 4),
      accountType: null,
      language: 'EN',
      municipality: null,
      cooperative: null,
      consentAt: null,
    });
    const admin = await login('09170000001', '4321').expect(200);
    await http()
      .get('/test-admin')
      .set('Authorization', `Bearer ${(admin.body as AuthResponse).token}`)
      .expect(200);
  });

  it('locks a phone after 5 wrong PINs, even if the 6th is correct', async () => {
    await verifiedRegister().expect(201);
    for (let i = 0; i < 5; i++) await login('09171234567', '0000').expect(401);
    const locked = await login('09171234567', '1234').expect(429);
    expect(messageOf(locked)).toMatch(/Try again in 5 minutes/);
  });

  it('keeps /health public', async () => {
    await http().get('/health').expect(200);
  });

  it('rate-limits verification-code requests', async () => {
    for (let i = 0; i < 3; i++) {
      await http()
        .post('/auth/register/code')
        .send({ phone: `0917555${String(i).padStart(4, '0')}` })
        .expect(201);
    }
    await http()
      .post('/auth/register/code')
      .send({ phone: '09175559999' })
      .expect(429);
  });

  it('sends security headers', async () => {
    const res = await http().get('/health').expect(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
  });
});
