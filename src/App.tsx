/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef } from 'react';
import DungeonProgression from './components/DungeonProgression';
import GemSocketManager from './components/GemSocketManager';

export default function App() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#08070a]">
      <iframe
        ref={iframeRef}
        src="/ashen-eclipse.html"
        title="Ashen Eclipse"
        className="block h-full w-full border-0"
      />
      <GemSocketManager iframeRef={iframeRef} />
      <DungeonProgression iframeRef={iframeRef} />
    </main>
  );
}
