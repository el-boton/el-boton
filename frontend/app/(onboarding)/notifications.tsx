import React, { useState } from 'react';
import { Alert, Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import {
  YStack,
  XStack,
  Text,
  Button,
  styled,
} from 'tamagui';
import { Bell, ChevronRight } from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';
import { registerForPushNotifications, savePushToken } from '@/lib/notifications';
import { useAuth } from '@/contexts/AuthContext';
import { ProgressIndicator } from '@/components/ProgressIndicator';
import { PrimaryButton } from '@/components/PrimaryButton';

const Container = styled(YStack, {
  flex: 1,
  backgroundColor: '$bgPrimary',
});

const HeaderSection = styled(YStack, {
  paddingTop: '$16',
  paddingBottom: '$4',
  paddingHorizontal: '$6',
  alignItems: 'center',
});

const IconContainer = styled(YStack, {
  width: 72,
  height: 72,
  borderRadius: '$5',
  backgroundColor: '$signalSubtle',
  borderWidth: 1,
  borderColor: '$signalBorder',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: '$5',
});

const ContentSection = styled(YStack, {
  flex: 1,
  paddingHorizontal: '$6',
  paddingTop: '$8',
  alignItems: 'center',
});

const FooterSection = styled(YStack, {
  paddingHorizontal: '$6',
  paddingBottom: '$8',
});

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSkip = () => {
    Alert.alert(t('onboarding.skipNotificationsTitle'), t('onboarding.skipNotificationsMessage'), [
      { text: t('onboarding.enableNotifications'), onPress: () => requestNotificationPermission() },
      { text: t('onboarding.skipAnyway'), style: 'destructive', onPress: () => router.replace('/(tabs)') },
    ]);
  };

  const requestNotificationPermission = async () => {
    setLoading(true);
    try {
      const token = await registerForPushNotifications();
      if (token) { await savePushToken(token); }
      await refreshProfile();
      router.replace('/(tabs)');
    } catch (err: any) {
      const { status } = await Notifications.getPermissionsAsync();
      if (status === 'granted') {
        console.warn('Push token failed but permission granted:', err?.message);
        await refreshProfile();
        router.replace('/(tabs)');
      } else {
        Alert.alert(t('onboarding.notificationsRequired'), t('onboarding.notificationsRequiredMessage'), [
          { text: t('onboarding.openSettings'), onPress: () => Linking.openSettings() },
          { text: t('onboarding.tryAgain'), onPress: () => requestNotificationPermission() },
          { text: t('onboarding.skipAnyway'), style: 'destructive', onPress: () => router.replace('/(tabs)') },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <HeaderSection>
        <IconContainer>
          <Bell size={32} color="$signal" strokeWidth={2.5} />
        </IconContainer>
        <Text color="$textPrimary" fontSize={24} fontWeight="700" textAlign="center">
          {t('onboarding.notificationsTitle')}
        </Text>
        <Text color="$textSecondary" fontSize={14} textAlign="center" marginTop="$3" paddingHorizontal="$2" lineHeight={22}>
          {t('onboarding.notificationsDescription')}
        </Text>
      </HeaderSection>

      <ContentSection>
        <YStack alignItems="center" gap="$6" maxWidth={320}>
          <YStack gap="$4">
            <XStack gap="$3" alignItems="flex-start">
              <Text color="$signal" fontSize={20} lineHeight={20}>·</Text>
              <Text color="$textSecondary" fontSize={14} flex={1} lineHeight={20}>
                {t('onboarding.notificationsBullet1')}
              </Text>
            </XStack>
            <XStack gap="$3" alignItems="flex-start">
              <Text color="$signal" fontSize={20} lineHeight={20}>·</Text>
              <Text color="$textSecondary" fontSize={14} flex={1} lineHeight={20}>
                {t('onboarding.notificationsBullet2')}
              </Text>
            </XStack>
            <XStack gap="$3" alignItems="flex-start">
              <Text color="$signal" fontSize={20} lineHeight={20}>·</Text>
              <Text color="$textSecondary" fontSize={14} flex={1} lineHeight={20}>
                {t('onboarding.notificationsBullet3')}
              </Text>
            </XStack>
          </YStack>
        </YStack>
      </ContentSection>

      <FooterSection>
        <ProgressIndicator currentStep={4} totalSteps={4} />
        <PrimaryButton loading={loading} onPress={requestNotificationPermission} width="100%" marginTop="$4">
          <XStack alignItems="center" gap="$2">
            <Text color="white" fontWeight="700" fontSize={15}>{t('onboarding.enableNotifications')}</Text>
            <ChevronRight size={18} color="white" />
          </XStack>
        </PrimaryButton>
        <Button
          backgroundColor="transparent"
          marginTop="$3"
          onPress={handleSkip}
          disabled={loading}
          pressStyle={{ opacity: 0.7 }}
        >
          <Text color="$textTertiary" fontSize={14} fontWeight="500">{t('onboarding.skipNotifications')}</Text>
        </Button>
      </FooterSection>
    </Container>
  );
}
