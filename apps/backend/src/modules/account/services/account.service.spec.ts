// Example unit test — the pattern to copy: mock the repository, test the service in isolation.
import { AccountRepository } from '@/modules/account/repositories/account.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { mock, MockProxy } from 'jest-mock-extended';
import { AccountService } from './account.service';

describe('AccountService', () => {
  let repository: MockProxy<AccountRepository>;
  let service: AccountService;

  beforeEach(() => {
    repository = mock<AccountRepository>();
    service = new AccountService(repository);
  });

  it('returns an organizer with their organizations', async () => {
    repository.findOrganizationsOfMember.mockResolvedValue([
      { id: 'org-a', name: 'Letní kemp z. s.' },
    ]);
    const organizer = new Identity(
      'u1',
      'o@example.com',
      'Olga',
      'ORGANIZER',
      false,
    );

    const account = await service.getAccount(organizer);

    expect(account).toMatchObject({
      accountType: 'ORGANIZER',
      organizations: [{ id: 'org-a', name: 'Letní kemp z. s.' }],
    });
    expect(repository.findOrganizationsOfMember).toHaveBeenCalledWith('u1');
  });

  it('does not look up organizations for a participant', async () => {
    const participant = new Identity(
      'u2',
      'p@example.com',
      'Petr',
      'PARTICIPANT',
      true,
    );

    const account = await service.getAccount(participant);

    expect(account).toMatchObject({ mustSetPassword: true, organizations: [] });
    expect(repository.findOrganizationsOfMember).not.toHaveBeenCalled();
  });
});
