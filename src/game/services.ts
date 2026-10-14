import type { EventBus } from '../state/bus';
import type { InputMode, LevelId } from '../state/types';
import type { InputHub } from '../input/inputHub';
import type { Tapestry } from './tapestry';

/** Everything a scene needs from the outside world, injected by the React GameScreen. */
export interface GameServices {
  bus: EventBus;
  hub: InputHub;
  tapestry: Tapestry;
  mode: InputMode;
  level: LevelId;
}
