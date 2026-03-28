"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildTrainDefinitionFromSelection,
  getDefaultTrainBuilderSelection,
  type TrainBuilderSelection,
} from "@/lib/steam-trains/builder";
import {
  advanceSimulation,
  createSimulation,
  restartSimulation,
  setDriveCommand,
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
  mergeLevelProgress,
  scoreLevelRun,
} from "@/lib/steam-trains/progression";
import { renderScene } from "@/lib/steam-trains/renderer";
import {
  createSavedCustomTrain,
  getDefaultSteamTrainsPreferences,
  loadSavedCustomTrains,
  loadSteamTrainsPreferences,
  saveCustomTrains,
  saveSteamTrainsPreferences,
  type SavedCustomTrain,
  type SteamTrainsPreferences,
} from "@/lib/steam-trains/storage";
import {
  DEFAULT_STEAM_TRAIN_ID,
  getAllTrainDefinitions,
  getTrainDefinition,
  registerCustomTrainDefinitions,
} from "@/lib/steam-trains/trainCatalog";
import type { GameMode, SteamTrainsSimulationState, TrackSwitchState } from "@/lib/steam-trains/types";

import { TrainBuilder } from "./train-builder";
import { TrainSelector } from "./train-selector";

const INACTIVITY_HELPER_MS = 2600;

type ToolView = "play" | "workshop";

const createState = (mode: GameMode, levelOrder: number, trainId: string) => {
  const fallback = STEAM_TRAINS_LEVELS[0];
  const level = getLevelByOrder(levelOrder) ?? fallback;
  return createSimulation(getTrainDefinition(trainId), level, mode);
};

const starsForLevel = (preferences: SteamTrainsPreferences, levelId: string) =>
  preferences.levelProgress[levelId]?.stars ?? 0;

export function SteamTrainsTool() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastInteractionRef = useRef<number>(0);
  const lastCompletionRef = useRef<string>("");

  const [preferences, setPreferences] = useState<SteamTrainsPreferences>(getDefaultSteamTrainsPreferences());
  const [selectedLevelOrder, setSelectedLevelOrder] = useState<number>(1);
  const [mode, setMode] = useState<GameMode>("levels");
  const [view, setView] = useState<ToolView>("play");
  const [builderSelection, setBuilderSelection] = useState<TrainBuilderSelection>(getDefaultTrainBuilderSelection());
  const [savedCustomTrains, setSavedCustomTrains] = useState<SavedCustomTrain[]>([]);
  const [state, setState] = useState<SteamTrainsSimulationState>(() => createState("levels", 1, DEFAULT_STEAM_TRAIN_ID));

  const allTrains = getAllTrainDefinitions();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const loadedCustomTrains = loadSavedCustomTrains(window.localStorage);
    registerCustomTrainDefinitions(loadedCustomTrains.map((item) => item.train));

    const loaded = loadSteamTrainsPreferences(window.localStorage);
    const highestUnlockedLevel = clampUnlockedLevel(loaded.highestUnlockedLevel);
    const normalizedPreferences = { ...loaded, highestUnlockedLevel };
    const nextMode = loaded.lastMode;
    const nextSelectedLevel = getValidSelectedLevelOrder(highestUnlockedLevel, nextMode, highestUnlockedLevel);

    setSavedCustomTrains(loadedCustomTrains);
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
    if (typeof window === "undefined") {
      return;
    }
    saveCustomTrains(window.localStorage, savedCustomTrains);
    registerCustomTrainDefinitions(savedCustomTrains.map((item) => item.train));
  }, [savedCustomTrains]);

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
    if (!canvas || view === "workshop") {
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
  }, [mode, preferences.helperMode, state, view]);

  useEffect(() => {
    if (mode !== "levels" || state.playState !== "completed") {
      return;
    }

    const completionKey = `${state.level.id}:${state.elapsedMs}`;
    if (lastCompletionRef.current === completionKey) {
      return;
    }
    lastCompletionRef.current = completionKey;

    const nextUnlocked = getHighestUnlockedAfterCompletion(state.level.order, preferences.highestUnlockedLevel);
    const runScore = scoreLevelRun(
      {
        completed: true,
        crashed: state.crashedThisRun,
        stationStopPerfect: state.stationStopPerfect,
      },
      Boolean(state.level.stationStop),
    );

    setPreferences((prev) => ({
      ...prev,
      highestUnlockedLevel: nextUnlocked,
      levelProgress: mergeLevelProgress(prev.levelProgress, state.level.id, runScore),
    }));
  }, [mode, preferences.highestUnlockedLevel, state]);

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

  const handleDriveCommand = (command: "go" | "slow" | "stop") => {
    bumpInteraction();
    setState((prev) => setDriveCommand(prev, command));
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
    const nextLevelOrder = getValidSelectedLevelOrder(getNextLevelOrder(selectedLevelOrder), mode, preferences.highestUnlockedLevel);
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

  const handleSaveCustomTrain = () => {
    const saved = createSavedCustomTrain(builderSelection);
    setSavedCustomTrains((prev) => [saved, ...prev].slice(0, 12));
    setPreferences((prev) => ({ ...prev, selectedTrainId: saved.id }));
    setState(createState(mode, selectedLevelOrder, saved.id));
  };

  const handlePlayCustomPreview = () => {
    const previewId = `custom-train-preview`;
    const train = buildTrainDefinitionFromSelection(builderSelection, previewId);
    registerCustomTrainDefinitions([train, ...savedCustomTrains.map((item) => item.train)]);
    setPreferences((prev) => ({ ...prev, selectedTrainId: previewId }));
    setState(createState(mode, selectedLevelOrder, previewId));
    setView("play");
  };

  const handleLoadSavedTrainInBuilder = (trainId: string) => {
    const saved = savedCustomTrains.find((train) => train.id === trainId);
    if (!saved) {
      return;
    }
    setBuilderSelection(saved.selection);
    setPreferences((prev) => ({ ...prev, selectedTrainId: trainId }));
    setState(createState(mode, selectedLevelOrder, trainId));
    setView("play");
  };

  const isSwitchDisabled = state.playState !== "running";
  const nextCheckpoint = state.level.checkpoints[state.nextCheckpointIndex];
  const nextRouteLabel = nextCheckpoint ? (nextCheckpoint.safeBranch === "main" ? "Top track" : "Side track") : "Keep going";

  return (
    <Card className="mx-auto w-full max-w-6xl">
      <CardHeader>
        <CardTitle className="text-2xl">Steam Trains</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <Button type="button" className="h-14 text-lg font-bold" variant={view === "play" ? "primary" : "secondary"} onClick={() => setView("play")}>Play</Button>
          <Button type="button" className="h-14 text-lg font-bold" variant={view === "workshop" ? "primary" : "secondary"} onClick={() => setView("workshop")}>Workshop</Button>
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

        {view === "workshop" ? (
          <TrainBuilder
            selection={builderSelection}
            onChange={setBuilderSelection}
            onSave={handleSaveCustomTrain}
            onPlay={handlePlayCustomPreview}
            onReset={() => {
              registerCustomTrainDefinitions(savedCustomTrains.map((item) => item.train));
            }}
            savedTrains={savedCustomTrains.map((item) => item.train)}
            onLoadSaved={handleLoadSavedTrainInBuilder}
          />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
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
                      {level.name} {"⭐".repeat(starsForLevel(preferences, level.id))}
                    </Button>
                  );
                })}
              </div>
            )}

            <TrainSelector selectedTrainId={preferences.selectedTrainId} trains={allTrains} onSelectTrain={handleTrainSelection} />

            <canvas ref={canvasRef} width={1000} height={480} className="w-full rounded-2xl border border-border bg-slate-100" />

            <div className="grid gap-3 rounded-xl bg-muted/50 p-4 sm:grid-cols-3">
              <p className="text-center text-base font-semibold">Goal: {state.statusText}</p>
              <p className="text-center text-base font-semibold">Next route: {nextRouteLabel}</p>
              <p className="text-center text-base font-semibold">Speed: {Math.round(state.train.speed)}</p>
            </div>

            <p className="rounded-xl bg-muted/40 p-3 text-center text-base font-semibold">{state.level.tutorialCue}</p>

            <div className="grid gap-3 sm:grid-cols-3">
              <Button
                type="button"
                onClick={() => handleDriveCommand("go")}
                className="h-28 text-3xl font-black"
                variant={state.driveCommand === "go" ? "primary" : "secondary"}
              >
                GO
              </Button>
              <Button
                type="button"
                onClick={() => handleDriveCommand("slow")}
                className="h-28 text-3xl font-black"
                variant={state.driveCommand === "slow" ? "primary" : "secondary"}
              >
                SLOW
              </Button>
              <Button
                type="button"
                onClick={() => handleDriveCommand("stop")}
                className="h-28 text-3xl font-black"
                variant={state.driveCommand === "stop" ? "primary" : "secondary"}
              >
                STOP
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Button type="button" onClick={handleSteamPuff} className="h-24 text-2xl font-bold" aria-label="Steam puff">
                Steam Puff
              </Button>
              <Button type="button" onClick={handleWhistle} className="h-24 text-2xl font-bold" variant="secondary" aria-label="Whistle">
                Whistle
              </Button>
              <Button
                type="button"
                className="h-24 text-2xl font-bold"
                variant={state.switchState === "main" && !isSwitchDisabled ? "primary" : "secondary"}
                onClick={() => handleSwitch("main")}
                disabled={isSwitchDisabled}
              >
                Top Track
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
                <p className="text-lg font-semibold">{state.statusText}</p>
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
