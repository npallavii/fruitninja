import { useEffect, useState } from 'react';
import { levelCanvas, levelThumbUrl } from './art/backgrounds';
import { getTextures } from './art/textures';
import { audio } from './audio/audio';
import { GameScreen } from './components/GameScreen';
import { IntroScreen } from './components/IntroScreen';
import { LevelSelect } from './components/LevelSelect';
import { ResultsScreen } from './components/ResultsScreen';
import { SettingsModal } from './components/SettingsModal';
import { TitleScreen } from './components/TitleScreen';
import { markIntroSeen, recordRound } from './state/progress';
import { LEVELS } from './state/types';
import type { InputMode, LevelId, RoundResult } from './state/types';

type Screen = 'title' | 'intro' | 'levels' | 'play' | 'results';

export default function App() {
  const [screen, setScreen] = useState<Screen>('title');
  const [mode, setMode] = useState<InputMode>('camera');
  const [level, setLevel] = useState<LevelId>('giggle');
  const [round, setRound] = useState(0);
  const [result, setResult] = useState<{ r: RoundResult; newBest: boolean; unlocked: string | null } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Pre-paint the game art while the child is still on the menus, so "Play" starts instantly.
  useEffect(() => {
    const ids = [
      window.setTimeout(() => getTextures(), 1800),
      ...LEVELS.map((l, i) => window.setTimeout(() => levelThumbUrl(l.id), 2600 + i * 400)),
      window.setTimeout(() => levelCanvas('giggle'), 4200),
    ];
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, []);

  const play = () => {
    setRound((n) => n + 1);
    setScreen('play');
  };

  return (
    <div className="app" onPointerDown={() => audio.unlock()}>
      {screen === 'title' && <TitleScreen onPlay={() => setScreen('intro')} onSettings={() => setSettingsOpen(true)} />}

      {screen === 'intro' && (
        <IntroScreen
          onBack={() => setScreen('title')}
          onChoose={(m) => {
            setMode(m);
            markIntroSeen();
            setScreen('levels');
          }}
        />
      )}

      {screen === 'levels' && (
        <LevelSelect
          onBack={() => setScreen('intro')}
          onPick={(id) => {
            setLevel(id);
            play();
          }}
        />
      )}

      {screen === 'play' && (
        <GameScreen
          key={round}
          level={level}
          mode={mode}
          settingsOpen={settingsOpen}
          onSettings={() => setSettingsOpen(true)}
          onHome={() => setScreen('title')}
          onRestart={play}
          onUseMouse={() => {
            setMode('mouse');
            play();
          }}
          onEnd={(r) => {
            const { newBest, unlocked } = recordRound(r);
            setResult({ r, newBest, unlocked });
            setScreen('results');
          }}
        />
      )}

      {screen === 'results' && result && (
        <ResultsScreen
          result={result.r}
          newBest={result.newBest}
          unlocked={result.unlocked}
          onReplay={play}
          onLevels={() => setScreen('levels')}
          onHome={() => setScreen('title')}
        />
      )}

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
