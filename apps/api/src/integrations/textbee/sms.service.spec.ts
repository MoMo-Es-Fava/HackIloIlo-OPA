import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { OrderStatus } from '@irpc/types';
import { SmsService } from './sms.service';
import { MockSmsProvider, TextBeeSmsProvider } from './sms.providers';

describe('SMS integration', () => {
  afterEach(() => jest.restoreAllMocks());

  it('mock mode never contacts TextBee', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    await expect(
      new SmsService(new MockSmsProvider()).send('+639171234567', 'Test'),
    ).resolves.toEqual({ status: 'mocked' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects invalid numbers before sending', () => {
    const send = jest.fn();
    expect(() => new SmsService({ send }).send('09171234567', 'Test')).toThrow(
      BadRequestException,
    );
    expect(send).not.toHaveBeenCalled();
  });

  it('formats status notifications with the confirmed schedule', async () => {
    const send = jest.fn().mockResolvedValue({ status: 'mocked' });
    await new SmsService({ send }).notifyStatusChange({
      ref: 'IRPC-0042',
      status: OrderStatus.SCHEDULED,
      scheduledDate: '2026-10-20',
      rejectReason: null,
      contactPhone: '+639171234567',
    });
    expect(send).toHaveBeenCalledWith(
      '+639171234567',
      'IRPC-0042: scheduled. Confirmed date: 2026-10-20.',
    );
  });

  it('sends the configured device and surfaces missing-permission warnings', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            success: true,
            smsBatchId: 'batch-test',
            warning: { message: 'SMS permission missing' },
          },
        }),
        { status: 200 },
      ),
    );
    const service = new SmsService(
      new TextBeeSmsProvider(
        'https://api.textbee.dev/api/v1',
        'test-key',
        'test-device',
      ),
    );
    await expect(service.send('+639171234567', 'Hello')).resolves.toEqual({
      status: 'queued',
      batchId: 'batch-test',
      warning: 'SMS permission missing',
    });
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://api.textbee.dev/api/v1/gateway/send-sms');
    expect(JSON.parse(options!.body as string)).toEqual({
      deviceId: 'test-device',
      recipients: ['+639171234567'],
      message: 'Hello',
    });
  });

  it('does not report provider errors as sent or retry automatically', async () => {
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 429 }));
    const provider = new TextBeeSmsProvider(
      'https://api.textbee.dev/api/v1',
      'test-key',
      'test-device',
    );
    await expect(provider.send('+639171234567', 'Hello')).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
