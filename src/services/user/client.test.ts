import { eq } from 'drizzle-orm';
import { DeepPartial } from 'utility-types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clientDB } from '@/database/client/db';
import { migrate } from '@/database/client/migrate';
import { userSettings, users } from '@/database/schemas';
import { UserPreference } from '@/types/user';
import { UserSettings } from '@/types/user/settings';

import { ClientService } from './client';

const mockUser = {
  avatar: 'avatar.png',
  settings: { themeMode: 'light' } as unknown as UserSettings,
  uuid: 'user-id',
};

const mockPreference = {
  useCmdEnterToSend: true,
} as UserPreference;
const clientService = new ClientService(mockUser.uuid);

beforeEach(async () => {
  vi.clearAllMocks();

  await migrate();

  await clientDB.insert(users).values({ id: mockUser.uuid, avatar: 'avatar.png' });
  await clientDB
    .insert(userSettings)
    .values({ id: mockUser.uuid, general: { themeMode: 'light' } });
});

afterEach(async () => {
  await clientDB.delete(users);
});

describe('ClientService', () => {
  it('should get user state correctly', async () => {
    const spyOn = vi
      .spyOn(clientService['preferenceStorage'], 'getFromLocalStorage')
      .mockResolvedValue(mockPreference);

    const userState = await clientService.getUserState();

    expect(userState).toMatchObject({
      avatar: mockUser.avatar,
      isOnboard: true,
      canEnablePWAGuide: false,
      hasConversation: false,
      canEnableTrace: false,
      preference: mockPreference,
      settings: { general: { themeMode: 'light' } },
      userId: mockUser.uuid,
    });
    expect(spyOn).toHaveBeenCalledTimes(1);
  });

  it('should update user settings correctly', async () => {
    const settingsPatch: DeepPartial<UserSettings> = { general: { themeMode: 'dark' } };

    await clientService.updateUserSettings(settingsPatch);

    const result = await clientDB.query.userSettings.findFirst({
      where: eq(userSettings.id, mockUser.uuid),
    });

    expect(result).toMatchObject(settingsPatch);
  });

  it('should reset user settings correctly', async () => {
    await clientService.resetUserSettings();

    const result = await clientDB.query.userSettings.findFirst({
      where: eq(userSettings.id, mockUser.uuid),
    });

    expect(result).toBeUndefined();
  });

  it('should update user avatar correctly', async () => {
    const newAvatar = 'new-avatar.png';

    await clientService.updateAvatar(newAvatar);
  });

  it('should update user preference correctly', async () => {
    const newPreference = {
      useCmdEnterToSend: false,
    } as UserPreference;

    const spyOn = vi
      .spyOn(clientService['preferenceStorage'], 'saveToLocalStorage')
      .mockResolvedValue(undefined);

    await clientService.updatePreference(newPreference);

    expect(spyOn).toHaveBeenCalledWith(newPreference);
    expect(spyOn).toHaveBeenCalledTimes(1);
  });
});
