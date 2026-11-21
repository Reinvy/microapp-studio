'use client';

/** Entry route: the home work surface, with a boot skeleton while the shell warms up. */

import type { ReactElement } from 'react';
import { HomeScreen } from '@/features/home/HomeScreen';

export default function Page(): ReactElement {
  return <HomeScreen />;
}
