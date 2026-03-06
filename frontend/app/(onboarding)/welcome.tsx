import React from 'react';
import { useRouter } from 'expo-router';
import {
  YStack,
  XStack,
  Text,
  styled,
} from 'tamagui';
import { Shield, ChevronRight } from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';
import { ProgressIndicator } from '@/components/ProgressIndicator';
import { PrimaryButton } from '@/components/PrimaryButton';

const Container = styled(YStack, {
  flex: 1,
  backgroundColor: '$bgPrimary',
});

const HeaderSection = styled(YStack, {
  paddingTop: '$16',
  paddingBottom: '$8',
  paddingHorizontal: '$6',
  alignItems: 'center',
});

const LogoContainer = styled(YStack, {
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

const AppName = styled(Text, {
  fontSize: 28,
  fontWeight: '800',
  color: '$textPrimary',
  letterSpacing: 6,
  marginBottom: '$2',
});

const Tagline = styled(Text, {
  fontSize: 12,
  fontWeight: '600',
  color: '$textTertiary',
  letterSpacing: 2,
  textTransform: 'uppercase',
});

const ContentSection = styled(YStack, {
  flex: 1,
  paddingHorizontal: '$6',
  paddingTop: '$8',
  alignItems: 'center',
  justifyContent: 'center',
});

const FooterSection = styled(YStack, {
  paddingHorizontal: '$6',
  paddingBottom: '$8',
});

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <Container>
      <HeaderSection>
        <LogoContainer>
          <Shield size={32} color="$signal" strokeWidth={2.5} />
        </LogoContainer>
        <AppName>{t('common.appName')}</AppName>
        <Tagline>{t('common.tagline')}</Tagline>
      </HeaderSection>

      <ContentSection>
        <YStack alignItems="center" gap="$4" maxWidth={320}>
          <Text color="$textPrimary" fontSize={24} fontWeight="700" textAlign="center">
            {t('onboarding.welcomeTitle')}
          </Text>
          <Text color="$textSecondary" fontSize={15} textAlign="center" lineHeight={24}>
            {t('onboarding.welcomeDescription')}
          </Text>
        </YStack>
      </ContentSection>

      <FooterSection>
        <PrimaryButton onPress={() => router.push('/(onboarding)/display-name')} width="100%">
          <XStack alignItems="center" gap="$2">
            <Text color="white" fontWeight="700" fontSize={15}>{t('onboarding.getStarted')}</Text>
            <ChevronRight size={18} color="white" />
          </XStack>
        </PrimaryButton>
        <YStack marginTop="$4">
          <ProgressIndicator currentStep={1} totalSteps={4} />
        </YStack>
      </FooterSection>
    </Container>
  );
}
