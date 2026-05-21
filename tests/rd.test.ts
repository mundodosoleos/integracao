import { describe, it, expect, beforeAll } from 'vitest';
import { sendMessageToRD, RDError } from '../src/lib/rd.js';

describe('sendMessageToRD', () => {
  beforeAll(() => {
    process.env.RD_API_TOKEN = 'fake-token-for-test';
  });

  it('lança RDError quando contactId está ausente (AUTO_SEND_RD_MESSAGE=true)', async () => {
    await expect(sendMessageToRD({ contactId: '', message: 'oi' })).rejects.toBeInstanceOf(
      RDError,
    );
  });
});
