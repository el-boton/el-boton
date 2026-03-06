import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import {
  YStack,
  XStack,
  Text,
  Button,
  Input,
  ScrollView,
  styled,
  Separator,
} from 'tamagui';
import {
  User,
  Phone,
  MapPin,
  Bell,
  LogOut,
  Trash2,
  Check,
  Pencil,
  Shield,
  Globe,
} from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';
import { deleteAccount } from '@/lib/api/auth';
import { getMyProfile, updateMyProfile } from '@/lib/api/profile';
import { Profile } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { registerForPushNotifications, savePushToken } from '@/lib/notifications';
import { changeLanguage, getCurrentLanguage, supportedLanguages } from '@/lib/i18n';
import { ScreenContainer, ScreenHeader, ScreenTitle, SectionLabel } from '@/components/ScreenLayout';

const Section = styled(YStack, {
  marginTop: '$6',
  paddingHorizontal: '$6',
});

const Card = styled(YStack, {
  backgroundColor: '$bgCard',
  borderRadius: '$4',
  borderWidth: 1,
  borderColor: '$borderSubtle',
  overflow: 'hidden',
});

const Row = styled(XStack, {
  paddingVertical: '$4',
  paddingHorizontal: '$4',
  alignItems: 'center',
  justifyContent: 'space-between',
});

const RowLeft = styled(XStack, {
  alignItems: 'center',
  flex: 1,
});

const IconBox = styled(YStack, {
  width: 40,
  height: 40,
  borderRadius: '$2',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: '$3',
  borderWidth: 1,
  borderColor: '$borderSubtle',
});

const RowLabel = styled(Text, {
  fontSize: 15,
  fontWeight: '500',
  color: '$textPrimary',
});

const RowValue = styled(Text, {
  fontSize: 14,
  color: '$textTertiary',
});

const RowHint = styled(Text, {
  fontSize: 12,
  color: '$textTertiary',
  marginTop: '$0.5',
});

const EnabledBadge = styled(XStack, {
  alignItems: 'center',
  gap: '$1.5',
  backgroundColor: '$sageSubtle',
  paddingHorizontal: '$3',
  paddingVertical: '$1.5',
  borderRadius: '$2',
});

const EnableButton = styled(Button, {
  backgroundColor: '$signal',
  borderRadius: '$2',
  height: 32,
  paddingHorizontal: '$3',

  pressStyle: {
    backgroundColor: '$signalDark',
  },
});

const LanguageButton = styled(Button, {
  backgroundColor: '$bgElevated',
  borderRadius: '$2',
  height: 32,
  paddingHorizontal: '$3',
  borderWidth: 1,
  borderColor: '$borderSubtle',

  pressStyle: {
    backgroundColor: '$bgCard',
  },
});

const LanguageButtonActive = styled(Button, {
  backgroundColor: '$signalSubtle',
  borderRadius: '$2',
  height: 32,
  paddingHorizontal: '$3',
  borderWidth: 1,
  borderColor: '$signal',

  pressStyle: {
    backgroundColor: '$signalBorder',
  },
});

const SignOutButton = styled(Button, {
  marginTop: '$8',
  marginHorizontal: '$6',
  height: 52,
  borderRadius: '$3',
  borderWidth: 1,
  borderColor: '$signal',
  backgroundColor: '$signalSubtle',

  pressStyle: {
    backgroundColor: '$signalBorder',
  },
});

const DeleteAccountButton = styled(Button, {
  marginTop: '$4',
  marginHorizontal: '$6',
  height: 52,
  borderRadius: '$3',
  borderWidth: 1,
  borderColor: '$borderSubtle',
  backgroundColor: 'transparent',

  pressStyle: {
    backgroundColor: '$bgElevated',
  },
});

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(getCurrentLanguage());

  useEffect(() => {
    fetchProfile();
    checkPermissions();
  }, []);

  const handleLanguageChange = async (langCode: string) => {
    await changeLanguage(langCode);
    setCurrentLanguage(langCode);
  };

  const fetchProfile = async () => {
    if (!user) return;
    const data = await getMyProfile();
    if (data) { setProfile(data); setDisplayName(data.display_name || ''); }
  };

  const checkPermissions = async () => {
    const { status: locStatus } = await Location.getForegroundPermissionsAsync();
    setLocationEnabled(locStatus === 'granted');
    setNotificationsEnabled(true);
  };

  const updateProfile = async () => {
    if (!user) return;
    try {
      await updateMyProfile({ display_name: displayName.trim() });
      setEditing(false);
      await fetchProfile();
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.message || t('common.error'));
    }
  };

  const requestLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setLocationEnabled(status === 'granted');
    if (status !== 'granted') {
      Alert.alert(t('settings.permissionRequired'), t('settings.enableLocationMessage'));
    }
  };

  const requestNotifications = async () => {
    const token = await registerForPushNotifications();
    if (token) { await savePushToken(token); setNotificationsEnabled(true); }
    else { Alert.alert(t('settings.permissionRequired'), t('settings.enableNotificationsMessage')); }
  };

  const handleDeleteAccount = () => {
    Alert.alert(t('settings.deleteAccount'), t('settings.deleteAccountConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.deleteAccountAction'), style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try { await deleteAccount(); }
          catch { Alert.alert(t('common.error'), t('settings.deleteAccountError')); }
          finally { setDeleting(false); }
        },
      },
    ]);
  };

  const handleSignOut = () => {
    Alert.alert(t('settings.signOut'), t('settings.signOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.signOut'), style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <ScreenContainer>
      <ScreenHeader>
        <ScreenTitle>{t('settings.title')}</ScreenTitle>
      </ScreenHeader>

      <ScrollView flex={1}>
        {/* Profile Section */}
        <Section>
          <SectionLabel>{t('settings.profile')}</SectionLabel>
          <Card>
            <Row>
              <RowLeft>
                <IconBox backgroundColor="$bgElevated">
                  <User size={20} color="$textSecondary" />
                </IconBox>
                <YStack flex={1}>
                  <RowLabel>{t('settings.displayName')}</RowLabel>
                  {editing ? (
                    <XStack marginTop="$2" gap="$2">
                      <Input
                        flex={1}
                        height={40}
                        backgroundColor="$bgInput"
                        borderColor="$borderSubtle"
                        borderWidth={1}
                        borderRadius="$2"
                        color="$textPrimary"
                        value={displayName}
                        onChangeText={((text: string) => setDisplayName(text)) as any}
                        autoFocus
                        focusStyle={{ borderColor: '$signal' }}
                      />
                      <Button height={40} backgroundColor="$signal" borderRadius="$2" paddingHorizontal="$4" onPress={updateProfile}>
                        <Text color="white" fontWeight="600">{t('common.save')}</Text>
                      </Button>
                    </XStack>
                  ) : (
                    <RowHint>{profile?.display_name || t('common.notSet')}</RowHint>
                  )}
                </YStack>
              </RowLeft>
              {!editing && (
                <Button size="$3" circular backgroundColor="$bgElevated" borderWidth={1} borderColor="$borderSubtle" onPress={() => setEditing(true)}>
                  <Pencil size={14} color="$textTertiary" />
                </Button>
              )}
            </Row>
            <Separator backgroundColor="$borderSubtle" />
            <Row>
              <RowLeft>
                <IconBox backgroundColor="$bgElevated">
                  <Phone size={20} color="$textSecondary" />
                </IconBox>
                <YStack>
                  <RowLabel>{t('settings.phone')}</RowLabel>
                  <RowHint>{user?.phone || t('common.notSet')}</RowHint>
                </YStack>
              </RowLeft>
            </Row>
          </Card>
        </Section>

        {/* Permissions Section */}
        <Section>
          <SectionLabel>{t('settings.permissions')}</SectionLabel>
          <Card>
            <Row>
              <RowLeft>
                <IconBox backgroundColor={locationEnabled ? '$sageSubtle' : '$bgElevated'}>
                  <MapPin size={20} color={locationEnabled ? '$sage' : '$textSecondary'} />
                </IconBox>
                <YStack flex={1}>
                  <RowLabel>{t('settings.location')}</RowLabel>
                  <RowHint>{t('settings.locationHint')}</RowHint>
                </YStack>
              </RowLeft>
              {locationEnabled ? (
                <EnabledBadge>
                  <Check size={12} color="$sage" />
                  <Text color="$sage" fontSize={12} fontWeight="600">{t('common.enabled')}</Text>
                </EnabledBadge>
              ) : (
                <EnableButton onPress={requestLocation}>
                  <Text color="white" fontSize={12} fontWeight="600">{t('common.enable')}</Text>
                </EnableButton>
              )}
            </Row>
            <Separator backgroundColor="$borderSubtle" />
            <Row>
              <RowLeft>
                <IconBox backgroundColor={notificationsEnabled ? '$sageSubtle' : '$bgElevated'}>
                  <Bell size={20} color={notificationsEnabled ? '$sage' : '$textSecondary'} />
                </IconBox>
                <YStack flex={1}>
                  <RowLabel>{t('settings.notifications')}</RowLabel>
                  <RowHint>{t('settings.notificationsHint')}</RowHint>
                </YStack>
              </RowLeft>
              {notificationsEnabled ? (
                <EnabledBadge>
                  <Check size={12} color="$sage" />
                  <Text color="$sage" fontSize={12} fontWeight="600">{t('common.enabled')}</Text>
                </EnabledBadge>
              ) : (
                <EnableButton onPress={requestNotifications}>
                  <Text color="white" fontSize={12} fontWeight="600">{t('common.enable')}</Text>
                </EnableButton>
              )}
            </Row>
          </Card>
        </Section>

        {/* Language Section */}
        <Section>
          <SectionLabel>{t('settings.language')}</SectionLabel>
          <Card>
            <Row>
              <RowLeft>
                <IconBox backgroundColor="$bgElevated">
                  <Globe size={20} color="$textSecondary" />
                </IconBox>
                <YStack flex={1}>
                  <RowLabel>{t('settings.language')}</RowLabel>
                  <RowHint>{t('settings.languageHint')}</RowHint>
                </YStack>
              </RowLeft>
            </Row>
            <XStack paddingHorizontal="$4" paddingBottom="$4" gap="$2">
              {supportedLanguages.map((lang) => {
                const isActive = currentLanguage === lang.code;
                const ButtonComponent = isActive ? LanguageButtonActive : LanguageButton;
                return (
                  <ButtonComponent key={lang.code} flex={1} onPress={() => handleLanguageChange(lang.code)}>
                    {isActive && <Check size={14} color="$signal" />}
                    <Text
                      color={isActive ? '$signal' : '$textSecondary'}
                      fontSize={13}
                      fontWeight="600"
                      marginLeft={isActive ? '$1' : 0}
                    >
                      {lang.nativeName}
                    </Text>
                  </ButtonComponent>
                );
              })}
            </XStack>
          </Card>
        </Section>

        {/* About Section */}
        <Section>
          <SectionLabel>{t('settings.about')}</SectionLabel>
          <Card>
            <Row>
              <RowLeft>
                <IconBox backgroundColor="$signalSubtle">
                  <Shield size={20} color="$signal" />
                </IconBox>
                <YStack>
                  <RowLabel>{t('common.appName')}</RowLabel>
                  <RowHint>{t('common.tagline')}</RowHint>
                </YStack>
              </RowLeft>
              <RowValue>{t('settings.version')}</RowValue>
            </Row>
          </Card>
        </Section>

        <SignOutButton onPress={handleSignOut}>
          <LogOut size={18} color="$signal" />
          <Text color="$signal" fontWeight="600" marginLeft="$2">{t('settings.signOut')}</Text>
        </SignOutButton>

        <DeleteAccountButton onPress={handleDeleteAccount} disabled={deleting}>
          <Trash2 size={18} color="$textTertiary" />
          <Text color="$textTertiary" fontWeight="600" marginLeft="$2">
            {deleting ? t('common.loading') : t('settings.deleteAccount')}
          </Text>
        </DeleteAccountButton>

        <YStack height={40} />
      </ScrollView>
    </ScreenContainer>
  );
}
