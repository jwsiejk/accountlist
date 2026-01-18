"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Chip8 } from "@/lib/chip8/chip8";

const KEY_MAPPING: Record<string, number> = {
  "1": 0x1,
  "2": 0x2,
  "3": 0x3,
  "4": 0xc,
  q: 0x4,
  w: 0x5,
  e: 0x6,
  r: 0xd,
  a: 0x7,
  s: 0x8,
  d: 0x9,
  f: 0xe,
  z: 0xa,
  x: 0x0,
  c: 0xb,
  v: 0xf,
};

const DEMO_PROGRAM = new Uint8Array([
  0x00, 0xe0, // CLS
  0x60, 0x00, // V0 = 0
  0x61, 0x00, // V1 = 0
  0x62, 0x00, // V2 = 0
  0xf2, 0x29, // I = font(V2)
  0xd0, 0x15, // draw
  0x60, 0x08, // V0 = 8
  0x62, 0x01, // V2 = 1
  0xf2, 0x29,
  0xd0, 0x15,
  0x60, 0x10, // V0 = 16
  0x62, 0x02, // V2 = 2
  0xf2, 0x29,
  0xd0, 0x15,
  0x60, 0x18, // V0 = 24
  0x62, 0x03, // V2 = 3
  0xf2, 0x29,
  0xd0, 0x15,
  0x12, 0x00, // jump to start
]);

export function Chip8Tool() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chip8Ref = useRef<Chip8 | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioRef = useRef<{
    context: AudioContext;
    gain: GainNode;
    oscillator: OscillatorNode;
  } | null>(null);

  const [isRunning, setIsRunning] = useState(false);
  const [romName, setRomName] = useState("None loaded");
  const [status, setStatus] = useState("Paused");

  const keypadHelp = useMemo(
    () => [
      ["1", "2", "3", "4"],
      ["Q", "W", "E", "R"],
      ["A", "S", "D", "F"],
      ["Z", "X", "C", "V"],
    ],
    [],
  );

  useEffect(() => {
    chip8Ref.current = new Chip8();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = KEY_MAPPING[event.key.toLowerCase()];
      if (key === undefined) {
        return;
      }
      event.preventDefault();
      chip8Ref.current?.setKey(key, true);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = KEY_MAPPING[event.key.toLowerCase()];
      if (key === undefined) {
        return;
      }
      event.preventDefault();
      chip8Ref.current?.setKey(key, false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const render = () => {
      const canvas = canvasRef.current;
      const chip8 = chip8Ref.current;
      if (!canvas || !chip8) {
        animationRef.current = requestAnimationFrame(render);
        return;
      }

      const context = canvas.getContext("2d");
      if (!context) {
        animationRef.current = requestAnimationFrame(render);
        return;
      }

      context.imageSmoothingEnabled = false;
      const buffer = chip8.getFrameBuffer();
      const imageData = context.createImageData(64, 32);
      for (let index = 0; index < buffer.length; index += 1) {
        const value = buffer[index] ? 255 : 0;
        const offset = index * 4;
        imageData.data[offset] = value;
        imageData.data[offset + 1] = value;
        imageData.data[offset + 2] = value;
        imageData.data[offset + 3] = 255;
      }
      context.putImageData(imageData, 0, 0);

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isRunning) {
      setStatus("Paused");
      return;
    }

    setStatus("Running");
    const cpuInterval = window.setInterval(() => {
      chip8Ref.current?.cycle();
    }, 2);

    const timerInterval = window.setInterval(() => {
      const chip8 = chip8Ref.current;
      if (!chip8) {
        return;
      }
      chip8.tickTimers();
      const soundTimer = chip8.getSoundTimer();
      if (audioRef.current) {
        audioRef.current.gain.gain.value = soundTimer > 0 ? 0.2 : 0;
      }
    }, 1000 / 60);

    return () => {
      window.clearInterval(cpuInterval);
      window.clearInterval(timerInterval);
    };
  }, [isRunning]);

  const ensureAudio = async () => {
    if (!audioRef.current) {
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      oscillator.type = "square";
      oscillator.frequency.value = 440;
      const gain = context.createGain();
      gain.gain.value = 0;
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      audioRef.current = { context, gain, oscillator };
    }

    if (audioRef.current.context.state === "suspended") {
      await audioRef.current.context.resume();
    }
  };

  const handleStart = async () => {
    await ensureAudio();
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
    if (audioRef.current) {
      audioRef.current.gain.gain.value = 0;
    }
  };

  const handleReset = () => {
    chip8Ref.current?.reset();
    setIsRunning(false);
    setStatus("Paused");
    setRomName("None loaded");
    if (audioRef.current) {
      audioRef.current.gain.gain.value = 0;
    }
  };

  const handleLoadDemo = () => {
    chip8Ref.current?.loadProgram(DEMO_PROGRAM);
    setRomName("Font demo");
    setIsRunning(false);
    setStatus("Paused");
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const buffer = await file.arrayBuffer();
    chip8Ref.current?.loadProgram(new Uint8Array(buffer));
    setRomName(file.name);
    setIsRunning(false);
    setStatus("Paused");
  };

  return (
    <Card className="mx-auto w-full max-w-5xl">
      <CardHeader>
        <CardTitle>CHIP-8 Tool</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex flex-1 flex-col items-center gap-4">
            <canvas
              ref={canvasRef}
              width={64}
              height={32}
              className="h-[320px] w-full max-w-[640px] rounded-lg border border-border bg-black"
              style={{ imageRendering: "pixelated" }}
            />
            <div className="text-sm text-muted-foreground">
              Status: <span className="font-semibold text-foreground">{status}</span>
            </div>
          </div>
          <div className="flex w-full flex-col gap-4 lg:max-w-xs">
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleStart} disabled={isRunning}>
                Start
              </Button>
              <Button onClick={handlePause} variant="secondary" disabled={!isRunning}>
                Pause
              </Button>
              <Button onClick={handleReset} variant="outline">
                Reset
              </Button>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground" htmlFor="chip8-rom">
                ROM upload
              </label>
              <input
                id="chip8-rom"
                type="file"
                accept=".ch8,application/octet-stream"
                onChange={handleFileChange}
                className="text-sm"
              />
              <Button onClick={handleLoadDemo} variant="secondary">
                Load Demo
              </Button>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/40 p-3 text-sm">
              <div className="font-semibold text-foreground">Current ROM</div>
              <div className="text-muted-foreground">{romName}</div>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/40 p-3 text-sm">
              <div className="font-semibold text-foreground">Keypad mapping</div>
              <div className="mt-2 grid grid-cols-4 gap-2 text-center text-xs font-medium text-muted-foreground">
                {keypadHelp.flat().map((label) => (
                  <div
                    key={label}
                    className="rounded bg-background/70 px-2 py-1 text-foreground"
                  >
                    {label}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                1 2 3 4 ➜ 1 2 3 C · Q W E R ➜ 4 5 6 D · A S D F ➜ 7 8 9 E · Z X C V ➜ A 0 B
                F
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
