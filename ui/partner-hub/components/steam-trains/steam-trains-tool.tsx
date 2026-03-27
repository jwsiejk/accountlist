"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  advanceSimulation,
  createSimulation,
  restartAfterCrash,
  setSwitchState,
  triggerSteamPuff,
  triggerWhistle,
} from "@/lib/steam-trains/engine";
import { getLevelDefinition } from "@/lib/steam-trains/levels";
import { renderScene } from "@/lib/steam-trains/renderer";
import { getTrainDefinition } from "@/lib/steam-trains/trainCatalog";
import type { SteamTrainsSimulationState, TrackSwitchState } from "@/lib/steam-trains/types";

const TRAIN_ID = "big-boy-junior";
const LEVEL_ID = "yard-switch-intro";

const INITIAL_STATE = createSimulation(getTrainDefinition(TRAIN_ID), getLevelDefinition(LEVEL_ID));

export function SteamTrainsTool() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [state, setState] = useState<SteamTrainsSimulationState>(INITIAL_STATE);

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
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    renderScene(context, state);
  }, [state]);

  const handleSwitch = (switchState: TrackSwitchState) => {
    setState((prev) => setSwitchState(prev, switchState));
  };

  const handleSteamPuff = () => {
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
    setState((prev) => triggerWhistle(prev));
    await playWhistle();
  };

  const handleRestart = () => {
    setState((prev) => restartAfterCrash(prev));
  };

  return (
    <Card className="mx-auto w-full max-w-6xl">
      <CardHeader>
        <CardTitle className="text-2xl">Steam Trains</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <canvas
          ref={canvasRef}
          width={1000}
          height={480}
          className="w-full rounded-2xl border border-border bg-slate-100"
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Button
            type="button"
            onClick={handleSteamPuff}
            className="h-20 text-xl font-bold"
            aria-label="Steam puff"
          >
            Steam Puff
          </Button>
          <Button
            type="button"
            onClick={handleWhistle}
            className="h-20 text-xl font-bold"
            variant="secondary"
            aria-label="Whistle"
          >
            Whistle
          </Button>
          <Button
            type="button"
            className="h-20 text-lg font-bold"
            variant={state.switchState === "main" ? "primary" : "secondary"}
            onClick={() => handleSwitch("main")}
          >
            Main Track
          </Button>
          <Button
            type="button"
            className="h-20 text-lg font-bold"
            variant={state.switchState === "siding" ? "primary" : "secondary"}
            onClick={() => handleSwitch("siding")}
          >
            Side Track
          </Button>
        </div>

        {state.turnoutDecision && (
          <p className="text-sm font-medium text-muted-foreground">
            Switch locked to {state.turnoutDecision === "main" ? "Main Track" : "Side Track"} for this run.
          </p>
        )}

        {(state.playState === "crashed" || state.playState === "completed") && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-muted/40 p-4">
            <p className="text-lg font-semibold">
              {state.playState === "crashed" ? "Whoops! Try again!" : "Nice driving!"}
            </p>
            <Button type="button" className="h-14 px-8 text-xl" onClick={handleRestart}>
              Restart
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
