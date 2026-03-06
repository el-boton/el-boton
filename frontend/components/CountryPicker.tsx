import React, { useState, useMemo } from 'react';
import { Modal, FlatList, TouchableOpacity } from 'react-native';
import {
  YStack,
  XStack,
  Text,
  Input,
  Button,
  styled,
} from 'tamagui';
import { ChevronDown, Search, X } from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';

export interface Country {
  name: string;
  code: string;
  dial: string;
  flag: string;
}

export const countries: Country[] = [
  { name: 'United States', code: 'US', dial: '+1', flag: '🇺🇸' },
  { name: 'Mexico', code: 'MX', dial: '+52', flag: '🇲🇽' },
  { name: 'Canada', code: 'CA', dial: '+1', flag: '🇨🇦' },
  { name: 'United Kingdom', code: 'GB', dial: '+44', flag: '🇬🇧' },
  { name: 'Afghanistan', code: 'AF', dial: '+93', flag: '🇦🇫' },
  { name: 'Albania', code: 'AL', dial: '+355', flag: '🇦🇱' },
  { name: 'Algeria', code: 'DZ', dial: '+213', flag: '🇩🇿' },
  { name: 'Argentina', code: 'AR', dial: '+54', flag: '🇦🇷' },
  { name: 'Australia', code: 'AU', dial: '+61', flag: '🇦🇺' },
  { name: 'Austria', code: 'AT', dial: '+43', flag: '🇦🇹' },
  { name: 'Bangladesh', code: 'BD', dial: '+880', flag: '🇧🇩' },
  { name: 'Belgium', code: 'BE', dial: '+32', flag: '🇧🇪' },
  { name: 'Brazil', code: 'BR', dial: '+55', flag: '🇧🇷' },
  { name: 'Chile', code: 'CL', dial: '+56', flag: '🇨🇱' },
  { name: 'China', code: 'CN', dial: '+86', flag: '🇨🇳' },
  { name: 'Colombia', code: 'CO', dial: '+57', flag: '🇨🇴' },
  { name: 'Costa Rica', code: 'CR', dial: '+506', flag: '🇨🇷' },
  { name: 'Cuba', code: 'CU', dial: '+53', flag: '🇨🇺' },
  { name: 'Denmark', code: 'DK', dial: '+45', flag: '🇩🇰' },
  { name: 'Dominican Republic', code: 'DO', dial: '+1', flag: '🇩🇴' },
  { name: 'Ecuador', code: 'EC', dial: '+593', flag: '🇪🇨' },
  { name: 'Egypt', code: 'EG', dial: '+20', flag: '🇪🇬' },
  { name: 'El Salvador', code: 'SV', dial: '+503', flag: '🇸🇻' },
  { name: 'Finland', code: 'FI', dial: '+358', flag: '🇫🇮' },
  { name: 'France', code: 'FR', dial: '+33', flag: '🇫🇷' },
  { name: 'Germany', code: 'DE', dial: '+49', flag: '🇩🇪' },
  { name: 'Ghana', code: 'GH', dial: '+233', flag: '🇬🇭' },
  { name: 'Greece', code: 'GR', dial: '+30', flag: '🇬🇷' },
  { name: 'Guatemala', code: 'GT', dial: '+502', flag: '🇬🇹' },
  { name: 'Honduras', code: 'HN', dial: '+504', flag: '🇭🇳' },
  { name: 'Hong Kong', code: 'HK', dial: '+852', flag: '🇭🇰' },
  { name: 'India', code: 'IN', dial: '+91', flag: '🇮🇳' },
  { name: 'Indonesia', code: 'ID', dial: '+62', flag: '🇮🇩' },
  { name: 'Ireland', code: 'IE', dial: '+353', flag: '🇮🇪' },
  { name: 'Israel', code: 'IL', dial: '+972', flag: '🇮🇱' },
  { name: 'Italy', code: 'IT', dial: '+39', flag: '🇮🇹' },
  { name: 'Jamaica', code: 'JM', dial: '+1', flag: '🇯🇲' },
  { name: 'Japan', code: 'JP', dial: '+81', flag: '🇯🇵' },
  { name: 'Kenya', code: 'KE', dial: '+254', flag: '🇰🇪' },
  { name: 'Malaysia', code: 'MY', dial: '+60', flag: '🇲🇾' },
  { name: 'Morocco', code: 'MA', dial: '+212', flag: '🇲🇦' },
  { name: 'Netherlands', code: 'NL', dial: '+31', flag: '🇳🇱' },
  { name: 'New Zealand', code: 'NZ', dial: '+64', flag: '🇳🇿' },
  { name: 'Nicaragua', code: 'NI', dial: '+505', flag: '🇳🇮' },
  { name: 'Nigeria', code: 'NG', dial: '+234', flag: '🇳🇬' },
  { name: 'Norway', code: 'NO', dial: '+47', flag: '🇳🇴' },
  { name: 'Pakistan', code: 'PK', dial: '+92', flag: '🇵🇰' },
  { name: 'Panama', code: 'PA', dial: '+507', flag: '🇵🇦' },
  { name: 'Paraguay', code: 'PY', dial: '+595', flag: '🇵🇾' },
  { name: 'Peru', code: 'PE', dial: '+51', flag: '🇵🇪' },
  { name: 'Philippines', code: 'PH', dial: '+63', flag: '🇵🇭' },
  { name: 'Poland', code: 'PL', dial: '+48', flag: '🇵🇱' },
  { name: 'Portugal', code: 'PT', dial: '+351', flag: '🇵🇹' },
  { name: 'Puerto Rico', code: 'PR', dial: '+1', flag: '🇵🇷' },
  { name: 'Romania', code: 'RO', dial: '+40', flag: '🇷🇴' },
  { name: 'Russia', code: 'RU', dial: '+7', flag: '🇷🇺' },
  { name: 'Saudi Arabia', code: 'SA', dial: '+966', flag: '🇸🇦' },
  { name: 'Singapore', code: 'SG', dial: '+65', flag: '🇸🇬' },
  { name: 'South Africa', code: 'ZA', dial: '+27', flag: '🇿🇦' },
  { name: 'South Korea', code: 'KR', dial: '+82', flag: '🇰🇷' },
  { name: 'Spain', code: 'ES', dial: '+34', flag: '🇪🇸' },
  { name: 'Sweden', code: 'SE', dial: '+46', flag: '🇸🇪' },
  { name: 'Switzerland', code: 'CH', dial: '+41', flag: '🇨🇭' },
  { name: 'Taiwan', code: 'TW', dial: '+886', flag: '🇹🇼' },
  { name: 'Thailand', code: 'TH', dial: '+66', flag: '🇹🇭' },
  { name: 'Turkey', code: 'TR', dial: '+90', flag: '🇹🇷' },
  { name: 'Ukraine', code: 'UA', dial: '+380', flag: '🇺🇦' },
  { name: 'United Arab Emirates', code: 'AE', dial: '+971', flag: '🇦🇪' },
  { name: 'Uruguay', code: 'UY', dial: '+598', flag: '🇺🇾' },
  { name: 'Venezuela', code: 'VE', dial: '+58', flag: '🇻🇪' },
  { name: 'Vietnam', code: 'VN', dial: '+84', flag: '🇻🇳' },
];

const ModalContainer = styled(YStack, {
  flex: 1,
  backgroundColor: '$bgPrimary',
});

const ModalHeader = styled(XStack, {
  paddingHorizontal: '$4',
  paddingVertical: '$4',
  borderBottomWidth: 1,
  borderBottomColor: '$borderSubtle',
  alignItems: 'center',
  gap: '$3',
});

const SearchContainer = styled(XStack, {
  flex: 1,
  backgroundColor: '$bgInput',
  borderColor: '$borderSubtle',
  borderWidth: 1,
  borderRadius: '$3',
  height: 44,
  alignItems: 'center',
  paddingHorizontal: '$3',
  gap: '$2',

  focusWithinStyle: {
    borderColor: '$signal',
    backgroundColor: '$bgCard',
  },
});

const SearchInput = styled(Input, {
  flex: 1,
  backgroundColor: 'transparent',
  borderWidth: 0,
  height: 42,
  color: '$textPrimary',
  paddingHorizontal: 0,

  focusStyle: {
    borderWidth: 0,
  },
});

const CountryRow = styled(XStack, {
  paddingHorizontal: '$4',
  paddingVertical: '$3',
  alignItems: 'center',
  gap: '$3',
  borderBottomWidth: 1,
  borderBottomColor: '$borderSubtle',
});

interface CountryPickerProps {
  selectedCountry: Country;
  onSelect: (country: Country) => void;
}

export function CountryPicker({ selectedCountry, onSelect }: CountryPickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredCountries = useMemo(() => {
    if (!search.trim()) return countries;
    const query = search.toLowerCase();
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.dial.includes(query) ||
        c.code.toLowerCase().includes(query)
    );
  }, [search]);

  const handleSelect = (country: Country) => {
    onSelect(country);
    setOpen(false);
    setSearch('');
  };

  return (
    <>
      <Button
        onPress={() => setOpen(true)}
        unstyled
        backgroundColor="$bgInput"
        borderColor="$borderSubtle"
        borderWidth={1}
        borderRadius="$3"
        height={56}
        paddingHorizontal="$3"
        alignItems="center"
        justifyContent="center"
        flexDirection="row"
        gap="$2"
        minWidth={100}
        pressStyle={{
          backgroundColor: '$bgCard',
          borderColor: '$signal',
        }}
      >
        <Text fontSize={22}>{selectedCountry.flag}</Text>
        <Text color="$textPrimary" fontSize={15} fontWeight="600">
          {selectedCountry.dial}
        </Text>
        <ChevronDown size={16} color="$textTertiary" />
      </Button>

      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpen(false)}
      >
        <ModalContainer>
          <ModalHeader>
            <SearchContainer>
              <Search size={18} color="$textTertiary" />
              <SearchInput
                value={search}
                onChangeText={((text: string) => setSearch(text)) as any}
                placeholder={t('countryPicker.searchPlaceholder')}
                placeholderTextColor="$textTertiary"
                autoFocus
              />
            </SearchContainer>
            <TouchableOpacity onPress={() => setOpen(false)}>
              <XStack
                backgroundColor="$bgCard"
                borderRadius={18}
                width={36}
                height={36}
                alignItems="center"
                justifyContent="center"
              >
                <X size={18} color="$textSecondary" />
              </XStack>
            </TouchableOpacity>
          </ModalHeader>

          <FlatList
            data={filteredCountries}
            keyExtractor={(item) => item.code}
            keyboardShouldPersistTaps="always"
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => handleSelect(item)} activeOpacity={0.7}>
                <CountryRow
                  backgroundColor={item.code === selectedCountry.code ? '$bgCard' : 'transparent'}
                  pointerEvents="none"
                >
                  <Text fontSize={24}>{item.flag}</Text>
                  <YStack flex={1} pointerEvents="none">
                    <Text color="$textPrimary" fontSize={15} fontWeight="500">{item.name}</Text>
                  </YStack>
                  <Text color="$textSecondary" fontSize={15} fontWeight="600">{item.dial}</Text>
                </CountryRow>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <YStack padding="$6" alignItems="center">
                <Text color="$textTertiary" fontSize={14}>{t('countryPicker.noResults')}</Text>
              </YStack>
            }
          />
        </ModalContainer>
      </Modal>
    </>
  );
}

export default CountryPicker;
