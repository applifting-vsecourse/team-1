import { ParticipantAccountsRepository } from '@/modules/participants/repositories/participant-accounts.repository';
import { ParticipantAccountsService } from './participant-accounts.service';

type Found = {
  id: string;
  accountType: 'ORGANIZER' | 'PARTICIPANT' | 'ADMIN';
  mustSetPassword: boolean;
};

const setup = (options: {
  existing?: Found | (Found | null)[];
  created?: Found | null;
}): {
  service: ParticipantAccountsService;
  repository: {
    findByEmail: jest.Mock;
    createParticipant: jest.Mock;
  };
} => {
  const lookups = Array.isArray(options.existing)
    ? [...options.existing]
    : [options.existing ?? null];
  const repository = {
    findByEmail: jest.fn(() => Promise.resolve(lookups.shift() ?? null)),
    createParticipant: jest.fn(() => Promise.resolve(options.created ?? null)),
  };
  const service = new ParticipantAccountsService(
    repository as unknown as ParticipantAccountsRepository,
  );
  return { service, repository };
};

describe('ParticipantAccountsService.ensureAccount', () => {
  it('creates a participant without a password for a new e-mail', async () => {
    const { service, repository } = setup({
      created: { id: 'u1', accountType: 'PARTICIPANT', mustSetPassword: true },
    });

    const result = await service.ensureAccount({
      email: '  Petra.Novakova@Example.cz ',
      name: ' Petra Nováková ',
      locale: 'cs',
    });

    expect(result).toEqual({
      userId: 'u1',
      isNew: true,
      mustSetPassword: true,
    });
    expect(repository.createParticipant).toHaveBeenCalledWith({
      email: 'petra.novakova@example.cz',
      name: 'Petra Nováková',
      locale: 'cs',
    });
  });

  it('defaults the account language to English', async () => {
    const { service, repository } = setup({
      created: { id: 'u1', accountType: 'PARTICIPANT', mustSetPassword: true },
    });

    await service.ensureAccount({ email: 'a@example.com', name: 'A' });

    expect(repository.createParticipant).toHaveBeenCalledWith(
      expect.objectContaining({ locale: 'en' }),
    );
  });

  it('attaches to an existing participant who already chose a password', async () => {
    const { service, repository } = setup({
      existing: {
        id: 'u2',
        accountType: 'PARTICIPANT',
        mustSetPassword: false,
      },
    });

    const result = await service.ensureAccount({
      email: 'ucastnik@example.com',
      name: 'Petra',
    });

    expect(result).toEqual({
      userId: 'u2',
      isNew: false,
      mustSetPassword: false,
    });
    expect(repository.createParticipant).not.toHaveBeenCalled();
  });

  it('keeps asking for a password while the participant has none yet', async () => {
    const { service } = setup({
      existing: { id: 'u3', accountType: 'PARTICIPANT', mustSetPassword: true },
    });

    const result = await service.ensureAccount({
      email: 'a@example.com',
      name: 'A',
    });

    expect(result).toMatchObject({ isNew: false, mustSetPassword: true });
  });

  it.each(['ORGANIZER', 'ADMIN'] as const)(
    'refuses the e-mail of an %s',
    async (accountType) => {
      const { service, repository } = setup({
        existing: { id: 'u4', accountType, mustSetPassword: false },
      });

      await expect(
        service.ensureAccount({ email: 'organizator@example.com', name: 'O' }),
      ).rejects.toMatchObject({
        status: 409,
        response: { code: 'EMAIL_NOT_ALLOWED' },
      });
      expect(repository.createParticipant).not.toHaveBeenCalled();
    },
  );

  it('uses the account that won when two applications race for a new e-mail', async () => {
    const winner: Found = {
      id: 'u5',
      accountType: 'PARTICIPANT',
      mustSetPassword: true,
    };
    const { service, repository } = setup({
      existing: [null, winner],
      created: null,
    });

    const result = await service.ensureAccount({
      email: 'a@example.com',
      name: 'A',
    });

    expect(result).toEqual({
      userId: 'u5',
      isNew: false,
      mustSetPassword: true,
    });
    expect(repository.findByEmail).toHaveBeenCalledTimes(2);
  });
});
