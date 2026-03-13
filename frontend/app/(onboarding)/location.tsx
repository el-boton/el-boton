import React, { useState } from 'react';
import { Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import {
  YStack,
  XStack,
  Text,
  Button,
  styled,
} from 'tamagui';
import { MapPin, ChevronRight } from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import { updateMyLocation } from '@/lib/api/profile';
import { useAuth } from '@/contexts/AuthContext';
import { getLocationWithFallback } from '@/lib/location';
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

export default function LocationScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSkip = () => {
    Alert.alert(t('onboarding.skipLocationTitle'), t('onboarding.skipLocationMessage'), [
      { text: t('onboarding.enableLocation'), onPress: () => requestLocationPermission() },
      { text: t('onboarding.skipAnyway'), style: 'destructive', onPress: () => router.push('/(onboarding)/notifications') },
    ]);
  };

  const requestLocationPermission = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          const location = await getLocationWithFallback();
          if (user?.id) {
            await updateMyLocation(location.coords.latitude, location.coords.longitude);
          }
        } catch (locationError) {
          console.log('Could not get initial location:', locationError);
        }
        router.push('/(onboarding)/notifications');
      } else {
        Alert.alert(t('onboarding.locationRequired'), t('onboarding.locationRequiredMessage'), [
          { text: t('onboarding.openSettings'), onPress: () => Linking.openSettings() },
          { text: t('onboarding.tryAgain'), onPress: () => requestLocationPermission() },
          { text: t('onboarding.skipAnyway'), style: 'destructive', onPress: () => router.push('/(onboarding)/notifications') },
        ]);
      }
    } catch (err) {
      Alert.alert(t('onboarding.locationRequired'), t('onboarding.locationRequiredMessage'), [
        { text: t('onboarding.tryAgain'), onPress: () => requestLocationPermission() },
        { text: t('onboarding.skipAnyway'), style: 'destructive', onPress: () => router.push('/(onboarding)/notifications') },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <HeaderSection>
        <IconContainer>
          <MapPin size={32} color="$signal" strokeWidth={2.5} />
        </IconContainer>
        <Text color="$textPrimary" fontSize={24} fontWeight="700" textAlign="center">
          {t('onboarding.locationTitle')}
        </Text>
        <Text color="$textSecondary" fontSize={14} textAlign="center" marginTop="$3" paddingHorizontal="$2" lineHeight={22}>
          {t('onboarding.locationDescription')}
        </Text>
      </HeaderSection>

      <ContentSection>
        <YStack alignItems="center" gap="$6" maxWidth={320}>
          <YStack gap="$4">
            <XStack gap="$3" alignItems="flex-start">
              <Text color="$signal" fontSize={20} lineHeight={20}>·</Text>
              <Text color="$textSecondary" fontSize={14} flex={1} lineHeight={20}>
                {t('onboarding.locationBullet1')}
              </Text>
            </XStack>
            <XStack gap="$3" alignItems="flex-start">
              <Text color="$signal" fontSize={20} lineHeight={20}>·</Text>
              <Text color="$textSecondary" fontSize={14} flex={1} lineHeight={20}>
                {t('onboarding.locationBullet2')}
              </Text>
            </XStack>
            <XStack gap="$3" alignItems="flex-start">
              <Text color="$signal" fontSize={20} lineHeight={20}>·</Text>
              <Text color="$textSecondary" fontSize={14} flex={1} lineHeight={20}>
                {t('onboarding.locationBullet3')}
              </Text>
            </XStack>
          </YStack>
        </YStack>
      </ContentSection>

      <FooterSection>
        <ProgressIndicator currentStep={3} totalSteps={4} />
        <PrimaryButton loading={loading} onPress={requestLocationPermission} width="100%" marginTop="$4">
          <XStack alignItems="center" gap="$2">
            <Text color="white" fontWeight="700" fontSize={15}>{t('onboarding.enableLocation')}</Text>
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
          <Text color="$textTertiary" fontSize={14} fontWeight="500">{t('onboarding.skipLocation')}</Text>
        </Button>
      </FooterSection>
    </Container>
  );
}
