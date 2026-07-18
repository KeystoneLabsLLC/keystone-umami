'use client';
import { Column, Grid, Loading, Row, Text } from '@umami/react-zen';
import Link from 'next/link';
import Script from 'next/script';
import { useEffect } from 'react';
import { MobileNav } from '@/app/(main)/MobileNav';
import { SideNav } from '@/app/(main)/SideNav';
import { TopNav } from '@/app/(main)/TopNav';
import {
  useConfig,
  useLoginQuery,
  useMessages,
  useNavigation,
  useTeamQuery,
} from '@/components/hooks';
import { LogoLockup } from '@/components/svg';
import { LAST_TEAM_CONFIG } from '@/lib/constants';
import { getItem, removeItem, setItem } from '@/lib/storage';

export function App({ children }) {
  const { user, isLoading, error } = useLoginQuery();
  const config = useConfig();
  const { router, teamId, pathname } = useNavigation();
  const { isLoading: isTeamLoading, error: teamError } = useTeamQuery(teamId);

  // Non-admins (user + view-only) get only their team view: they are redirected
  // out of the personal area into a team. Their own account/settings pages stay
  // accessible. Admins are unaffected. This is UI routing only — data APIs are
  // already permission-scoped.
  const isNonAdmin = Boolean(user && !user.isAdmin);
  const teams: any[] = user?.teams ?? [];
  const inAccountArea = pathname.includes('/settings');
  const noTeam = isNonAdmin && teams.length === 0;
  const needsTeamRedirect = isNonAdmin && !teamId && !inAccountArea && teams.length > 0;

  useEffect(() => {
    if (teamId) {
      setItem(LAST_TEAM_CONFIG, teamId);
    } else {
      removeItem(LAST_TEAM_CONFIG);
    }
  }, [teamId]);

  useEffect(() => {
    if (teamId && teamError) {
      removeItem(LAST_TEAM_CONFIG);
      router.replace('/');
    }
  }, [teamId, teamError, router]);

  useEffect(() => {
    if (!needsTeamRedirect) {
      return;
    }
    // Prefer the last-used team if the user still belongs to it, else the first.
    const lastTeam = getItem(LAST_TEAM_CONFIG);
    const target = teams.find((team: any) => team.id === lastTeam)?.id || teams[0]?.id;

    if (target) {
      router.replace(`/teams/${target}/websites`);
    }
    // biome-ignore lint/correctness/useExhaustiveDependencies: teams is non-empty and stable whenever a redirect is needed
  }, [needsTeamRedirect, router]);

  if (isLoading || !config || (teamId && isTeamLoading)) {
    return <Loading placement="absolute" />;
  }

  if (error) {
    window.location.href = config.cloudMode
      ? `${process.env.cloudUrl}/login`
      : `${process.env.basePath || ''}/login`;
    return null;
  }

  if (!user || !config) {
    return null;
  }

  if (teamId && teamError) {
    return null;
  }

  // Non-admin with no team: there is nothing for them to view.
  if (noTeam && !inAccountArea) {
    return <NoTeamAccess />;
  }

  // While redirecting a non-admin into their team, avoid flashing the empty
  // personal page.
  if (needsTeamRedirect) {
    return <Loading placement="absolute" />;
  }

  return (
    <Grid
      columns={{ base: '1fr', lg: 'auto 1fr' }}
      rows={{ base: 'auto 1fr', lg: '1fr' }}
      height="screen"
    >
      <Row display={{ base: 'flex', lg: 'none' }} alignItems="center" gap padding="3">
        <MobileNav />
      </Row>
      <Column display={{ base: 'none', lg: 'flex' }} minHeight="0" style={{ overflow: 'hidden' }}>
        <SideNav />
      </Column>
      <Column overflowX="hidden" minHeight="0" position="relative">
        <TopNav />
        <Column alignItems="center">{children}</Column>
      </Column>
      {process.env.selfTrack && (
        <Script
          async
          data-website-id={process.env.selfTrack}
          src={`${process.env.basePath || ''}/script.js`}
          data-cache="true"
          data-performance="true"
        />
      )}
      {process.env.selfRecord && (
        <Script
          async
          data-website-id={process.env.selfRecord}
          data-sample-rate="1"
          src={`${process.env.basePath || ''}/recorder.js`}
        />
      )}
    </Grid>
  );
}

// Shown to a non-admin who belongs to no team — they have nothing to view yet.
function NoTeamAccess() {
  const { t, labels } = useMessages();

  return (
    <Column
      alignItems="center"
      justifyContent="center"
      height="100vh"
      gap="6"
      backgroundColor="surface-raised"
    >
      <LogoLockup style={{ width: 150, height: 'auto' }} />
      <Text color="muted" style={{ maxWidth: 360, textAlign: 'center' }}>
        {t(labels.noTeamAccess)}
      </Text>
      <Link href="/logout">{t(labels.logout)}</Link>
    </Column>
  );
}
