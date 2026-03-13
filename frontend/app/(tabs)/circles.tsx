import React, { useState, useEffect, useCallback } from 'react';
import { Share, Alert, View, StyleSheet, Pressable, RefreshControl, ScrollView as RNScrollView } from 'react-native';
import {
  YStack,
  XStack,
  Text,
  Button,
  ScrollView,
  styled,
  Separator,
} from 'tamagui';
import { Users, Plus, UserPlus, Share2, ChevronRight, Crown, LogOut, Trash2, X, User } from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import {
  CircleWithRole,
  CircleMemberWithProfile,
  createCircle as createCircleRequest,
  joinCircle as joinCircleRequest,
  getCirclesWithRole,
  getCircleMembers,
  leaveCircle,
  removeMember,
  deleteCircle,
} from '@/lib/circles';
import { ScreenContainer, ScreenHeader, ScreenTitle, ScreenSubtitle, SectionLabel } from '@/components/ScreenLayout';
import { EmptyState } from '@/components/EmptyState';
import { StyledInput } from '@/components/StyledInput';
import { ModalSheet } from '@/components/ModalSheet';

const CircleCard = styled(XStack, {
  backgroundColor: '$bgCard',
  borderRadius: '$4',
  padding: '$4',
  marginBottom: '$3',
  borderWidth: 1,
  borderColor: '$borderSubtle',
  alignItems: 'center',

  pressStyle: {
    backgroundColor: '$bgCardHover',
    borderColor: '$borderDefault',
  },
});

const CircleName = styled(Text, {
  fontSize: 16,
  fontWeight: '600',
  color: '$textPrimary',
  marginBottom: '$0.5',
});

const CircleCode = styled(Text, {
  fontSize: 12,
  color: '$textTertiary',
  letterSpacing: 1.5,
  fontWeight: '500',
});

const ActionButton = styled(Button, {
  flex: 1,
  height: 52,
  borderRadius: '$3',
});

const SheetTitle = styled(Text, {
  fontSize: 20,
  fontWeight: '700',
  color: '$textPrimary',
  marginBottom: '$2',
});

const SheetDescription = styled(Text, {
  fontSize: 14,
  color: '$textTertiary',
  marginBottom: '$5',
});

const MemberCard = styled(XStack, {
  backgroundColor: '$bgCard',
  borderRadius: '$3',
  padding: '$4',
  marginBottom: '$2',
  borderWidth: 1,
  borderColor: '$borderSubtle',
  alignItems: 'center',
});

const RoleBadge = styled(XStack, {
  backgroundColor: '$signalSubtle',
  paddingHorizontal: '$2',
  paddingVertical: '$1',
  borderRadius: '$2',
  alignItems: 'center',
  gap: '$1',
});

function CircleAvatar({ name }: { name: string }) {
  const letter = (name || '?')[0].toUpperCase();
  return (
    <YStack
      width={48}
      height={48}
      borderRadius="$3"
      backgroundColor="$signalSubtle"
      borderWidth={1}
      borderColor="$signalBorder"
      alignItems="center"
      justifyContent="center"
      marginRight="$4"
    >
      <Text color="$signal" fontSize={20} fontWeight="700">{letter}</Text>
    </YStack>
  );
}

export default function CirclesScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [circles, setCircles] = useState<CircleWithRole[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedCircle, setSelectedCircle] = useState<CircleWithRole | null>(null);
  const [members, setMembers] = useState<CircleMemberWithProfile[]>([]);
  const [newCircleName, setNewCircleName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const fetchCircles = useCallback(async () => {
    if (!user) return;
    const data = await getCirclesWithRole(user.id);
    setCircles(data);
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => { fetchCircles(); }, [fetchCircles]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCircles();
  }, [fetchCircles]);

  const openCircleDetail = async (circle: CircleWithRole) => {
    setSelectedCircle(circle);
    setShowDetail(true);
    setLoadingMembers(true);
    const memberList = await getCircleMembers(circle.id);
    setMembers(memberList);
    setLoadingMembers(false);
  };

  const createCircle = async () => {
    if (!newCircleName.trim() || !user) return;
    const result = await createCircleRequest(newCircleName.trim());
    if (!result.success) { Alert.alert(t('common.error'), result.error); return; }
    setNewCircleName('');
    setShowCreate(false);
    fetchCircles();
  };

  const joinCircle = async () => {
    if (!inviteCode.trim() || !user) return;
    const result = await joinCircleRequest(inviteCode.trim().toUpperCase());
    if (!result.success) {
      if (result.error === 'alreadyMember') { Alert.alert(t('circles.alreadyMember'), t('circles.alreadyInCircle')); return; }
      Alert.alert(t('common.error'), t('circles.invalidCode'));
      return;
    }
    setInviteCode('');
    setShowJoin(false);
    fetchCircles();
  };

  const shareInvite = async (circle: CircleWithRole) => {
    await Share.share({ message: t('circles.shareMessage', { name: circle.name, code: circle.invite_code }) });
  };

  const handleLeaveCircle = async () => {
    if (!selectedCircle || !user) return;
    Alert.alert(t('circles.leaveCircle'), t('circles.leaveConfirm', { name: selectedCircle.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('circles.leave'), style: 'destructive',
        onPress: async () => {
          const result = await leaveCircle(selectedCircle.id, user.id);
          if (result.success) { setShowDetail(false); setSelectedCircle(null); fetchCircles(); }
          else if (result.error === 'ownerCannotLeave') { Alert.alert(t('common.error'), t('circles.ownerCannotLeave')); }
          else { Alert.alert(t('common.error'), result.error); }
        },
      },
    ]);
  };

  const handleRemoveMember = async (member: CircleMemberWithProfile) => {
    if (!selectedCircle || !user) return;
    const memberName = member.profile.display_name || t('circles.unknownMember');
    Alert.alert(t('circles.removeMember'), t('circles.removeConfirm', { name: memberName }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('circles.remove'), style: 'destructive',
        onPress: async () => {
          const result = await removeMember(selectedCircle.id, member.user_id, user.id);
          if (result.success) { const updated = await getCircleMembers(selectedCircle.id); setMembers(updated); fetchCircles(); }
          else { Alert.alert(t('common.error'), result.error); }
        },
      },
    ]);
  };

  const handleDeleteCircle = async () => {
    if (!selectedCircle || !user) return;
    Alert.alert(t('circles.deleteCircle'), t('circles.deleteConfirm', { name: selectedCircle.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('circles.delete'), style: 'destructive',
        onPress: async () => {
          const result = await deleteCircle(selectedCircle.id, user.id);
          if (result.success) { setShowDetail(false); setSelectedCircle(null); fetchCircles(); }
          else { Alert.alert(t('common.error'), result.error); }
        },
      },
    ]);
  };

  const isOwner = selectedCircle?.role === 'owner';

  return (
    <ScreenContainer>
      <ScreenHeader>
        <ScreenTitle>{t('circles.title')}</ScreenTitle>
        <ScreenSubtitle>{t('circles.subtitle')}</ScreenSubtitle>
      </ScreenHeader>

      <ScrollView
        flex={1}
        paddingHorizontal="$6"
        paddingTop="$5"
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8A8580" />}
      >
        {loading ? (
          <YStack padding="$8" alignItems="center">
            <Text color="$textTertiary">{t('common.loading')}</Text>
          </YStack>
        ) : circles.length === 0 ? (
          <EmptyState
            icon={<Users size={32} color="$textTertiary" />}
            title={t('circles.noCircles')}
            hint={t('circles.createHint')}
            actionLabel={t('circles.createCircle')}
            onAction={() => setShowCreate(true)}
          />
        ) : (
          <YStack>
            <SectionLabel>{t('circles.yourCircles', { count: circles.length })}</SectionLabel>
            {circles.map((circle) => (
              <CircleCard key={circle.id} onPress={() => openCircleDetail(circle)}>
                <CircleAvatar name={circle.name} />
                <YStack flex={1}>
                  <XStack alignItems="center" gap="$2">
                    <CircleName>{circle.name}</CircleName>
                    {circle.role === 'owner' && <Crown size={14} color="$warning" />}
                  </XStack>
                  <XStack alignItems="center" gap="$2">
                    <CircleCode>{t('circles.members', { count: circle.memberCount })}</CircleCode>
                    <Text color="$textTertiary" fontSize={12}>·</Text>
                    <CircleCode>{circle.invite_code}</CircleCode>
                  </XStack>
                </YStack>
                <ChevronRight size={20} color="$textTertiary" />
              </CircleCard>
            ))}
          </YStack>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <XStack padding="$5" gap="$3" borderTopWidth={1} borderTopColor="$borderSubtle" backgroundColor="$bgDeep">
        <ActionButton
          backgroundColor="$signal"
          pressStyle={{ backgroundColor: '$signalDark', scale: 0.98 }}
          onPress={() => setShowCreate(true)}
        >
          <Plus size={18} color="white" />
          <Text color="white" fontWeight="600" marginLeft="$2">{t('common.create')}</Text>
        </ActionButton>
        <ActionButton
          backgroundColor="$bgCard"
          borderWidth={1}
          borderColor="$borderSubtle"
          pressStyle={{ backgroundColor: '$bgCardHover', scale: 0.98 }}
          onPress={() => setShowJoin(true)}
        >
          <UserPlus size={18} color="$textSecondary" />
          <Text color="$textSecondary" fontWeight="600" marginLeft="$2">{t('common.join')}</Text>
        </ActionButton>
      </XStack>

      {/* Create Modal */}
      <ModalSheet visible={showCreate} onClose={() => setShowCreate(false)}>
        <SheetTitle>{t('circles.createCircle')}</SheetTitle>
        <SheetDescription>{t('circles.createDescription')}</SheetDescription>
        <StyledInput
          value={newCircleName}
          onChangeText={(text: string) => setNewCircleName(text)}
          placeholder={t('circles.namePlaceholder')}
          placeholderTextColor="$textTertiary"
          autoFocus
          marginBottom="$5"
        />
        <XStack gap="$3">
          <Button flex={1} height={48} backgroundColor="$bgCard" borderRadius="$3" onPress={() => setShowCreate(false)}>
            <Text color="$textTertiary">{t('common.cancel')}</Text>
          </Button>
          <Button flex={1} height={48} backgroundColor="$signal" borderRadius="$3" pressStyle={{ backgroundColor: '$signalDark' }} onPress={createCircle}>
            <Text color="white" fontWeight="600">{t('common.create')}</Text>
          </Button>
        </XStack>
      </ModalSheet>

      {/* Join Modal */}
      <ModalSheet visible={showJoin} onClose={() => setShowJoin(false)}>
        <SheetTitle>{t('circles.joinCircle')}</SheetTitle>
        <SheetDescription>{t('circles.joinDescription')}</SheetDescription>
        <StyledInput
          value={inviteCode}
          onChangeText={(text: string) => setInviteCode(text)}
          placeholder={t('circles.codePlaceholder')}
          placeholderTextColor="$textTertiary"
          autoCapitalize="characters"
          autoFocus
          maxLength={6}
          marginBottom="$5"
        />
        <XStack gap="$3">
          <Button flex={1} height={48} backgroundColor="$bgCard" borderRadius="$3" onPress={() => setShowJoin(false)}>
            <Text color="$textTertiary">{t('common.cancel')}</Text>
          </Button>
          <Button flex={1} height={48} backgroundColor="$signal" borderRadius="$3" pressStyle={{ backgroundColor: '$signalDark' }} onPress={joinCircle}>
            <Text color="white" fontWeight="600">{t('common.join')}</Text>
          </Button>
        </XStack>
      </ModalSheet>

      {/* Circle Detail Modal */}
      <ModalSheet visible={showDetail} onClose={() => setShowDetail(false)} fullHeight>
        <XStack alignItems="center" justifyContent="space-between" marginBottom="$4">
          <YStack flex={1}>
            <XStack alignItems="center" gap="$2">
              <Text fontSize={20} fontWeight="700" color="$textPrimary">{selectedCircle?.name}</Text>
              {isOwner && <Crown size={18} color="$warning" />}
            </XStack>
            <Text fontSize={13} color="$textTertiary">{t('circles.code', { code: selectedCircle?.invite_code })}</Text>
          </YStack>
          <Button size="$3" circular backgroundColor="$bgCard" onPress={() => setShowDetail(false)}>
            <X size={20} color="$textSecondary" />
          </Button>
        </XStack>

        <Separator borderColor="$borderSubtle" marginBottom="$4" />

        <Button
          height={44}
          backgroundColor="$bgCard"
          borderRadius="$3"
          borderWidth={1}
          borderColor="$borderSubtle"
          onPress={() => selectedCircle && shareInvite(selectedCircle)}
          marginBottom="$4"
        >
          <Share2 size={16} color="$textSecondary" />
          <Text color="$textSecondary" fontWeight="500" marginLeft="$2" fontSize={14}>{t('circles.shareInvite')}</Text>
        </Button>

        <Separator borderColor="$borderSubtle" marginBottom="$4" />

        <SectionLabel>{t('circles.members', { count: members.length })}</SectionLabel>

        <RNScrollView style={styles.membersList} contentContainerStyle={styles.membersListContent} showsVerticalScrollIndicator>
          {loadingMembers ? (
            <YStack padding="$4" alignItems="center">
              <Text color="$textTertiary">{t('common.loading')}</Text>
            </YStack>
          ) : (
            members.map((member) => {
              const isCurrentUser = member.user_id === user?.id;
              const memberIsOwner = member.role === 'owner';
              const canRemove = isOwner && !isCurrentUser && !memberIsOwner;
              const memberName = member.profile.display_name || t('circles.unknownMember');
              const letter = (memberName || '?')[0].toUpperCase();

              return (
                <MemberCard key={member.user_id}>
                  <YStack width={40} height={40} borderRadius={20} backgroundColor="$bgElevated" alignItems="center" justifyContent="center" marginRight="$3">
                    <Text color="$textSecondary" fontSize={16} fontWeight="600">{letter}</Text>
                  </YStack>
                  <YStack flex={1}>
                    <XStack alignItems="center" gap="$2">
                      <Text fontSize={15} fontWeight="500" color="$textPrimary">{memberName}</Text>
                      {isCurrentUser && <Text fontSize={12} color="$textTertiary">({t('circles.you')})</Text>}
                    </XStack>
                    {memberIsOwner && (
                      <RoleBadge marginTop="$1">
                        <Crown size={12} color="$warning" />
                        <Text fontSize={11} color="$warning" fontWeight="600">{t('circles.owner')}</Text>
                      </RoleBadge>
                    )}
                  </YStack>
                  {canRemove && (
                    <Button size="$2" circular backgroundColor="$bgElevated" onPress={() => handleRemoveMember(member)}>
                      <X size={16} color="$textTertiary" />
                    </Button>
                  )}
                </MemberCard>
              );
            })
          )}
        </RNScrollView>

        <YStack paddingTop="$4" gap="$3" borderTopWidth={1} borderTopColor="$borderSubtle">
          {!isOwner ? (
            <Button height={48} backgroundColor="$bgCard" borderRadius="$3" borderWidth={1} borderColor="$signalBorder" onPress={handleLeaveCircle}>
              <LogOut size={18} color="$signal" />
              <Text color="$signal" fontWeight="600" marginLeft="$2">{t('circles.leaveCircle')}</Text>
            </Button>
          ) : (
            <Button height={48} backgroundColor="$bgCard" borderRadius="$3" borderWidth={1} borderColor="$signalBorder" onPress={handleDeleteCircle}>
              <Trash2 size={18} color="$signal" />
              <Text color="$signal" fontWeight="600" marginLeft="$2">{t('circles.deleteCircle')}</Text>
            </Button>
          )}
        </YStack>
      </ModalSheet>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  membersList: {
    flex: 1,
  },
  membersListContent: {
    paddingBottom: 16,
  },
});
