"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  advanceSimulation,
  createSimulation,
  restartSimulation,
  setSwitchState,
  triggerSteamPuff,
  triggerWhistle,
} from "@/lib/steam-trains/engine";
import { STEAM_TRAINS_LEVELS } from "@/lib/steam-trains/levels";
import {
  clampUnlockedLevel,
  getHighestUnlockedAfterCompletion,
  getLevelByOrder,
  getNextLevelOrder,
  getValidSelectedLevelOrder,
  isLevelUnlocked,
} from "@/lib/steam-trains/progression";
import { renderScene } from "@/lib/steam-trains/renderer";
import {
  getDefaultSteamTrainsPreferences,
  loadSteamTrainsPreferences,
  saveSteamTrainsPreferences,
  type SteamTrainsPreferences,
} from "@/lib/steam-trains/storage";
import { DEFAULT_STEAM_TRAIN_ID, getTrainDefinition } from "@/lib/steam-trains/trainCatalog";
import type { GameMode, SteamTrainsSimulationState, TrackSwitchState } from "@/lib/steam-trains/types";

import { TrainSelector } from "./train-selector";

const INACTIVITY_HELPER_MS = 2600;

const createState = (mode: GameMode, levelOrder: number, trainId: string) => {
  const fallback = STEAM_TRAINS_LEVELS[0];
  const level = getLevelByOrder(levelOrder) ?? fallback;
  return createSimulation(getTrainDefinition(trainId), level, mode);
};

export function SteamTrainsTool() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastInteractionRef = useRef<number>(0);

  const [preferences, setPreferences] = useState<SteamTrainsPreferences>(getDefaultSteamTrainsPreferences());
  const [selectedLevelOrder, setSelectedLevelOrder] = useState<number>(1);
  const [mode, setMode] = useState<GameMode>("levels");
  const [state, setState] = useState<SteamTrainsSimulationState>(() => createState("levels", 1, DEFAULT_STEAM_TRAIN_ID));

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const loaded = loadSteamTrainsPreferences(window.localStorage);
    const highestUnlockedLevel = clampUnlockedLevel(loaded.highestUnlockedLevel);
    const normalizedPreferences = { ...loaded, highestUnlockedLevel };
    const nextMode = loaded.lastMode;
    const nextSelectedLevel = getValidSelectedLevelOrder(highestUnlockedLevel, nextMode, highestUnlockedLevel);

    setPreferences(normalizedPreferences);
    setMode(nextMode);
    setSelectedLevelOrder(nextSelectedLevel);
    setState(createState(nextMode, nextSelectedLevel, normalizedPreferences.selectedTrainId));
    lastInteractionRef.current = performance.now();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    saveSteamTrainsPreferences(window.localStorage, preferences);
  }, [preferences]);

  useEffect(() => {
    const tick = (timestamp: number) => {
      const last = lastTimeRef.current || timestamp;
      lastTimeRef.current = timestamp;
      const dt = timestamp - last;
      setState((prev) => advanceSimulation(prev, dt));
      animationRef.current = window.requestAnimationFrame(tick);
    };

    animationRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (animationRef.current) {
        window.cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        void audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const now = performance.now();
    const helperCheckpointIndex =
      preferences.helperMode && state.playState === "running" && now - lastInteractionRef.current >= INACTIVITY_HELPER_MS
        ? state.nextCheckpointIndex
        : null;

    renderScene(context, state, {
      helperCheckpointIndex,
      showCelebration: state.playState === "completed" && mode === "levels",
    });
  }, [mode, preferences.helperMode, state]);

  useEffect(() => {
    if (mode !== "levels" || state.playState !== "completed") {
      return;
    }

    const nextUnlocked = getHighestUnlockedAfterCompletion(state.level.order, preferences.highestUnlockedLevel);
    if (nextUnlocked !== preferences.highestUnlockedLevel) {
      setPreferences((prev) => ({ ...prev, highestUnlockedLevel: nextUnlocked }));
    }
  }, [mode, preferences.highestUnlockedLevel, state.level.order, state.playState]);

  const bumpInteraction = () => {
    lastInteractionRef.current = performance.now();
  };

  const handleSwitch = (switchState: TrackSwitchState) => {
    bumpInteraction();
    setState((prev) => setSwitchState(prev, switchState));
  };

  const handleSteamPuff = () => {
    bumpInteraction();
    setState((prev) => triggerSteamPuff(prev));
  };

  const playWhistle = async () => {
    const context = audioContextRef.current ?? new AudioContext();
    audioContextRef.current = context;
    if (context.state === "suspended") {
      await context.resume();
    }

    const now = context.currentTime;
    const oscillator = context.createOscillator();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(660, now);
    oscillator.frequency.exponentialRampToValueAtTime(820, now + 0.25);

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.14, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.55);
  };

  const handleWhistle = async () => {
    bumpInteraction();
    setState((prev) => triggerWhistle(prev));
    await playWhistle();
  };

  const handleRestart = () => {
    bumpInteraction();
    setState((prev) => restartSimulation(prev));
  };

  const changeMode = (nextMode: GameMode) => {
    bumpInteraction();
    const nextSelectedLevel = getValidSelectedLevelOrder(selectedLevelOrder, nextMode, preferences.highestUnlockedLevel);
    setMode(nextMode);
    setPreferences((prev) => ({ ...prev, lastMode: nextMode }));
    setSelectedLevelOrder(nextSelectedLevel);
    setState(createState(nextMode, nextSelectedLevel, preferences.selectedTrainId));
  };

  const changeLevel = (order: number) => {
    bumpInteraction();
    const nextSelectedLevel = getValidSelectedLevelOrder(order, mode, preferences.highestUnlockedLevel);
    setSelectedLevelOrder(nextSelectedLevel);
    setState(createState(mode, nextSelectedLevel, preferences.selectedTrainId));
  };

  const handleNextLevel = () => {
    bumpInteraction();
    const nextLevelOrder = getValidSelectedLevelOrder(
      getNextLevelOrder(selectedLevelOrder),
      mode,
      preferences.highestUnlockedLevel,
    );
    setSelectedLevelOrder(nextLevelOrder);
    setState(createState(mode, nextLevelOrder, preferences.selectedTrainId));
  };

  useEffect(() => {
    const nextSelectedLevel = getValidSelectedLevelOrder(selectedLevelOrder, mode, preferences.highestUnlockedLevel);
    if (nextSelectedLevel !== selectedLevelOrder) {
      setSelectedLevelOrder(nextSelectedLevel);
      setState(createState(mode, nextSelectedLevel, preferences.selectedTrainId));
    }
  }, [mode, preferences.highestUnlockedLevel, preferences.selectedTrainId, selectedLevelOrder]);

  const handleTrainSelection = (trainId: string) => {
    bumpInteraction();
    setPreferences((prev) => ({ ...prev, selectedTrainId: trainId }));
    setState(createState(mode, selectedLevelOrder, trainId));
  };
  const isSwitchDisabled = state.playState !== "running";

  return (
    <Card className="mx-auto w-full max-w-6xl">
      <CardHeader>
        <CardTitle className="text-2xl">Steam Trains</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <Button
            type="button"
            className="h-14 text-lg font-bold"
            variant={mode === "levels" ? "primary" : "secondary"}
            onClick={() => changeMode("levels")}
          >
            Levels Mode
          </Button>
          <Button
            type="button"
            className="h-14 text-lg font-bold"
            variant={mode === "free-play" ? "primary" : "secondary"}
            onClick={() => changeMode("free-play")}
          >
            Free Play
          </Button>
          <Button
            type="button"
            className="h-14 text-lg font-bold"
            variant={preferences.helperMode ? "primary" : "secondary"}
            onClick={() => {
              bumpInteraction();
              setPreferences((prev) => ({ ...prev, helperMode: !prev.helperMode }));
            }}
          >
            Helper {preferences.helperMode ? "On" : "Off"}
          </Button>
        </div>

        {mode === "levels" && (
          <div className="grid gap-2 sm:grid-cols-5">
            {STEAM_TRAINS_LEVELS.map((level) => {
              const unlocked = isLevelUnlocked(level.order, preferences.highestUnlockedLevel);
              return (
                <Button
                  key={level.id}
                  type="button"
                  className="h-14 text-base font-bold"
                  variant={selectedLevelOrder === level.order ? "primary" : "secondary"}
                  disabled={!unlocked}
                  onClick={() => changeLevel(level.order)}
                >
                  {level.name}
                </Button>
              );
            })}
          </div>
        )}

        <TrainSelector selectedTrainId={preferences.selectedTrainId} onSelectTrain={handleTrainSelection} />

        <canvas
          ref={canvasRef}
          width={1000}
          height={480}
          className="w-full rounded-2xl border border-border bg-slate-100"
        />

        <p className="rounded-xl bg-muted/50 p-3 text-center text-base font-semibold">{state.level.tutorialCue}</p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Button type="button" onClick={handleSteamPuff} className="h-24 text-2xl font-bold" aria-label="Steam puff">
            Steam Puff
          </Button>
          <Button
            type="button"
            onClick={handleWhistle}
            className="h-24 text-2xl font-bold"
            variant="secondary"
            aria-label="Whistle"
          >
            Whistle
          </Button>
          <Button
            type="button"
            className="h-24 text-2xl font-bold"
            variant={state.switchState === "main" && !isSwitchDisabled ? "primary" : "secondary"}
            onClick={() => handleSwitch("main")}
            disabled={isSwitchDisabled}
          >
            Main Track
          </Button>
          <Button
            type="button"
            className="h-24 text-2xl font-bold"
            variant={state.switchState === "siding" && !isSwitchDisabled ? "primary" : "secondary"}
            onClick={() => handleSwitch("siding")}
            disabled={isSwitchDisabled}
          >
            Side Track
          </Button>
        </div>

        {(state.playState === "crashed" || state.playState === "rewinding" || state.playState === "completed") && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-muted/40 p-4">
            <p className="text-lg font-semibold">
              {state.playState === "crashed" && "Gentle bump — now rewinding..."}
              {state.playState === "rewinding" && "Rewinding to start..."}
              {state.playState === "completed" && "Yay! Level complete!"}
            </p>
            <div className="flex gap-2">
              {state.playState === "completed" && mode === "levels" && (
                <Button type="button" className="h-14 px-6 text-xl" onClick={handleNextLevel}>
                  Next Level
                </Button>
              )}
              <Button type="button" className="h-14 px-8 text-xl" onClick={handleRestart}>
                Restart
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
