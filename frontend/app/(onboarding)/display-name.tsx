import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import {
  YStack,
  XStack,
  Text,
  styled,
} from 'tamagui';
import { User, ChevronRight } from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';
import { updateMyProfile } from '@/lib/api/profile';
import { useAuth } from '@/contexts/AuthContext';
import { ProgressIndicator } from '@/components/ProgressIndicator';
import { PrimaryButton } from '@/components/PrimaryButton';
import { StyledInput } from '@/components/StyledInput';

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
  paddingTop: '$4',
});

const FieldLabel = styled(Text, {
  fontSize: 11,
  fontWeight: '600',
  color: '$textTertiary',
  letterSpacing: 1.5,
  textTransform: 'uppercase',
  marginBottom: '$3',
  marginLeft: '$1',
});

const ErrorBanner = styled(XStack, {
  backgroundColor: '$signalSubtle',
  borderWidth: 1,
  borderColor: '$signalBorder',
  borderRadius: '$3',
  paddingVertical: '$3',
  paddingHorizontal: '$4',
  marginTop: '$4',
  alignItems: 'center',
  justifyContent: 'center',
});

const FooterSection = styled(YStack, {
  paddingHorizontal: '$6',
  paddingBottom: '$8',
});

export default function DisplayNameScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isValid = displayName.trim().length >= 2 && displayName.trim().length <= 50;

  const handleContinue = async () => {
    if (!user || !isValid) return;
    setLoading(true);
    setError('');
    try {
      await updateMyProfile({ display_name: displayName.trim() });
      await refreshProfile();
      router.push('/(onboarding)/location');
    } catch (err) {
      setError(t('onboarding.saveError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <Container>
        <HeaderSection>
          <IconContainer>
            <User size={32} color="$signal" strokeWidth={2.5} />
          </IconContainer>
          <Text color="$textPrimary" fontSize={24} fontWeight="700" textAlign="center">
            {t('onboarding.displayNameTitle')}
          </Text>
          <Text color="$textSecondary" fontSize={14} textAlign="center" marginTop="$3" paddingHorizontal="$4">
            {t('onboarding.displayNameDescription')}
          </Text>
        </HeaderSection>

        <ContentSection>
          <YStack>
            <FieldLabel>{t('onboarding.displayNameLabel')}</FieldLabel>
            <StyledInput
              value={displayName}
              onChangeText={(text: string) => setDisplayName(text)}
              placeholder={t('onboarding.displayNamePlaceholder')}
              placeholderTextColor="$textTertiary"
              autoFocus
              maxLength={50}
              autoCapitalize="words"
            />
            <Text color="$textTertiary" fontSize={12} marginTop="$2" marginLeft="$1">
              {t('onboarding.displayNameHint')}
            </Text>
          </YStack>

          {error ? (
            <ErrorBanner>
              <Text color="$signal" fontSize={14} fontWeight="500">{error}</Text>
            </ErrorBanner>
          ) : null}
        </ContentSection>

        <FooterSection>
          <PrimaryButton loading={loading} onPress={handleContinue} disabled={!isValid}>
            <XStack alignItems="center" gap="$2">
              <Text color="white" fontWeight="700" fontSize={15}>{t('onboarding.continue')}</Text>
              <ChevronRight size={18} color="white" />
            </XStack>
          </PrimaryButton>
          <YStack marginTop="$4">
            <ProgressIndicator currentStep={2} totalSteps={4} />
          </YStack>
        </FooterSection>
      </Container>
    </KeyboardAvoidingView>
  );
}
