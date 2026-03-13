import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import {
  YStack,
  XStack,
  Text,
  Spinner,
  styled,
} from 'tamagui';
import { Shield, ChevronRight, ArrowLeft, MessageCircle } from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';
import {
  requestOtp as requestOtpRequest,
  verifyOtp as verifyOtpRequest,
} from '@/lib/api/auth';
import { CountryPicker, countries, type Country } from '@/components/CountryPicker';
import { StyledInput } from '@/components/StyledInput';
import { PrimaryButton } from '@/components/PrimaryButton';

type Stage = 'phone' | 'otp';

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

const FormSection = styled(YStack, {
  flex: 1,
  paddingHorizontal: '$6',
  paddingTop: '$6',
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

const SecondaryButton = styled(PrimaryButton, {
  backgroundColor: 'transparent',
  marginTop: '$4',
  height: 48,

  pressStyle: {
    backgroundColor: '$bgCard',
    scale: 1,
  },
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

const StatusBar = styled(XStack, {
  paddingHorizontal: '$6',
  paddingBottom: '$6',
  justifyContent: 'center',
});

const StatusPill = styled(XStack, {
  backgroundColor: '$bgDeep',
  borderRadius: 20,
  paddingHorizontal: '$4',
  paddingVertical: '$2',
  borderWidth: 1,
  borderColor: '$borderSubtle',
  alignItems: 'center',
  gap: '$2',
});

export default function LoginScreen() {
  const { t } = useTranslation();
  const [stage, setStage] = useState<Stage>('phone');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState<Country>(countries[0]);
  const [otp, setOtp] = useState('');
  const [channel, setChannel] = useState<'sms' | 'whatsapp'>('sms');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatPhone = (input: string) => {
    const digits = input.replace(/\D/g, '');
    if (country.dial === '+1') {
      if (digits.length <= 3) return digits;
      if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
    return digits;
  };

  const sendOtp = async (via: 'sms' | 'whatsapp' = 'sms') => {
    const digits = phone.replace(/\D/g, '');
    const minLength = country.dial === '+1' ? 10 : 7;
    if (digits.length < minLength) { setError(t('auth.invalidPhone')); return; }

    setChannel(via);
    setLoading(true);
    setError('');
    try {
      await requestOtpRequest(`${country.dial}${digits}`, via);
      setStage('otp');
    } catch (error: any) {
      setError(error?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) { setError(t('auth.invalidCode')); return; }

    setLoading(true);
    setError('');
    const digits = phone.replace(/\D/g, '');
    try {
      await verifyOtpRequest(`${country.dial}${digits}`, otp);
      router.replace('/(tabs)');
    } catch (error: any) {
      setError(error?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <Container>
        <HeaderSection>
          <LogoContainer>
            <Shield size={32} color="$signal" strokeWidth={2.5} />
          </LogoContainer>
          <AppName>{t('common.appName')}</AppName>
          <Tagline>{t('common.tagline')}</Tagline>
        </HeaderSection>

        <FormSection>
          {stage === 'phone' ? (
            <YStack animation="fast" enterStyle={{ opacity: 0, y: 10 }}>
              <FieldLabel>{t('auth.phoneNumber')}</FieldLabel>
              <XStack gap="$2">
                <CountryPicker selectedCountry={country} onSelect={setCountry} />
                <StyledInput
                  flex={1}
                  value={phone}
                  onChangeText={(text: string) => setPhone(formatPhone(text))}
                  placeholder={country.dial === '+1' ? t('auth.phonePlaceholderUS') : t('auth.phonePlaceholderIntl')}
                  placeholderTextColor="$textTertiary"
                  keyboardType="phone-pad"
                  autoFocus
                  maxLength={country.dial === '+1' ? 14 : 15}
                />
              </XStack>

              <PrimaryButton loading={loading} onPress={() => sendOtp('sms')} marginTop="$5">
                <XStack alignItems="center" gap="$2">
                  <Text color="white" fontWeight="700" fontSize={15}>{t('auth.sendCode')}</Text>
                  <ChevronRight size={18} color="white" />
                </XStack>
              </PrimaryButton>

              <SecondaryButton loading={loading} onPress={() => sendOtp('whatsapp')}>
                <XStack alignItems="center" gap="$2">
                  <MessageCircle size={16} color="$textTertiary" />
                  <Text color="$textTertiary" fontSize={14}>{t('auth.sendViaWhatsApp')}</Text>
                </XStack>
              </SecondaryButton>
            </YStack>
          ) : (
            <YStack animation="fast" enterStyle={{ opacity: 0, y: 10 }}>
              <FieldLabel>{t('auth.verificationCode')}</FieldLabel>
              <Text color="$textSecondary" fontSize={14} marginBottom="$4" textAlign="center">
                {t(channel === 'whatsapp' ? 'auth.enterCodeWhatsApp' : 'auth.enterCode', { phone: `${country.dial} ${phone}` })}
              </Text>
              <StyledInput
                value={otp}
                onChangeText={(text: string) => setOtp(text)}
                placeholder={t('auth.codePlaceholder')}
                placeholderTextColor="$textTertiary"
                keyboardType="number-pad"
                autoFocus
                maxLength={6}
              />

              <PrimaryButton loading={loading} onPress={handleVerifyOtp} marginTop="$5">
                <XStack alignItems="center" gap="$2">
                  <Text color="white" fontWeight="700" fontSize={15}>{t('auth.verifyAndContinue')}</Text>
                  <ChevronRight size={18} color="white" />
                </XStack>
              </PrimaryButton>

              <SecondaryButton onPress={() => setStage('phone')}>
                <XStack alignItems="center" gap="$2">
                  <ArrowLeft size={16} color="$textTertiary" />
                  <Text color="$textTertiary" fontSize={14}>{t('auth.useDifferentNumber')}</Text>
                </XStack>
              </SecondaryButton>
            </YStack>
          )}

          {error ? (
            <ErrorBanner>
              <Text color="$signal" fontSize={14} fontWeight="500">{error}</Text>
            </ErrorBanner>
          ) : null}
        </FormSection>

        <StatusBar>
          <StatusPill>
            <View style={styles.statusDot} />
            <Text color="$textTertiary" fontSize={11} fontWeight="600" letterSpacing={1}>
              {t('common.secureConnection')}
            </Text>
          </StatusPill>
        </StatusBar>
      </Container>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#5C8A6E',
  },
});
