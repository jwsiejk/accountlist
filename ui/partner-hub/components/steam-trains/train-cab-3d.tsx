"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  AmbientLight,
  BoxGeometry,
  BufferGeometry,
  Clock,
  Color,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  Line,
  LineBasicMaterial,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";

import { buildCabTheme, buildScene3dModel } from "@/lib/steam-trains/scene3d";
import type { SteamTrainsSimulationState } from "@/lib/steam-trains/types";

type TrainCab3DProps = {
  state: SteamTrainsSimulationState;
  helperMode: boolean;
};

const toWorldZ = (forwardZ: number) => -forwardZ;

const branchXAt = (route: { splitZ: number; endZ: number; branchOffset: number }, z: number) => {
  const span = Math.max(1, route.endZ - route.splitZ);
  const ratio = Math.max(0, Math.min(1, (z - route.splitZ) / span));
  return route.branchOffset * ratio;
};

const makeBox = (
  size: [number, number, number],
  color: string,
  roughness = 0.8,
  metalness = 0,
) => new Mesh(new BoxGeometry(...size), new MeshStandardMaterial({ color, roughness, metalness }));

export function TrainCab3D({ state, helperMode }: TrainCab3DProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const model = useMemo(() => buildScene3dModel(state), [state]);
  const theme = useMemo(() => buildCabTheme(state.train.definition), [state.train.definition]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    const scene = new Scene();
    scene.background = new Color("#7fa7c8");
    scene.fog = new Fog("#b7cde0", 28, 238);

    const camera = new PerspectiveCamera(60, Math.max(1, host.clientWidth) / Math.max(1, host.clientHeight), 0.1, 500);
    camera.position.set(0, 2.8, -8);
    camera.lookAt(new Vector3(0, 1.4, 42));

    const renderer = new WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(host.clientWidth, host.clientHeight);
    host.appendChild(renderer.domElement);

    const ambient = new AmbientLight("#f1f5f9", 0.5);
    scene.add(ambient);
    const sun = new DirectionalLight("#ffe8c4", 1.1);
    sun.position.set(14, 15, 10);
    scene.add(sun);
    const coolFill = new DirectionalLight("#cbd5e1", 0.35);
    coolFill.position.set(-18, 9, -8);
    scene.add(coolFill);
    const hemi = new HemisphereLight("#fef3c7", "#334155", 0.62);
    scene.add(hemi);

    const world = new Group();
    scene.add(world);

    const farZ = -model.horizonDistance;
    const nearZ = 56;
    const centerZ = (farZ + nearZ) / 2;
    const length = nearZ - farZ;

    const ground = new Mesh(new PlaneGeometry(48, length), new MeshStandardMaterial({ color: "#5f8b4a", roughness: 0.98 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.04, centerZ);
    world.add(ground);

    world.add(makeBox([5.6, 0.18, length], "#6d5a45", 0.94));
    world.children[world.children.length - 1].position.set(0, 0, centerZ);
    world.add(makeBox([1.5, 0.1, length], "#a3c973", 0.9));
    world.children[world.children.length - 1].position.set(-3.6, -0.01, centerZ);
    world.add(makeBox([1.5, 0.1, length], "#a3c973", 0.9));
    world.children[world.children.length - 1].position.set(3.6, -0.01, centerZ);

    world.add(makeBox([0.16, 0.16, length], "#b0b7c3", 0.4, 0.3));
    world.children[world.children.length - 1].position.set(-0.72, 0.19, centerZ);
    world.add(makeBox([0.16, 0.16, length], "#b0b7c3", 0.4, 0.3));
    world.children[world.children.length - 1].position.set(0.72, 0.19, centerZ);

    for (const route of model.routePreviews) {
      const pieces = 9;
      const segLength = (route.endZ - route.splitZ) / pieces;
      for (let i = 0; i < pieces; i += 1) {
        const segStart = route.splitZ + segLength * i;
        const segEnd = segStart + segLength;
        const midZ = (segStart + segEnd) / 2;
        const x = branchXAt(route, midZ);
        const color = route.safeBranch === "main" ? "#8fbef0" : "#f7cb73";

        const left = makeBox([0.12, 0.12, Math.max(1, segLength)], color, 0.35, 0.28);
        left.position.set(x - 0.72, 0.2, toWorldZ(midZ));
        world.add(left);

        const right = makeBox([0.12, 0.12, Math.max(1, segLength)], color, 0.45, 0.2);
        right.position.set(x + 0.72, 0.2, toWorldZ(midZ));
        world.add(right);
      }
    }

    for (const sleeper of model.repeaters.filter((item) => item.kind === "sleeper")) {
      const s = makeBox([1.95, 0.06, 0.26], sleeper.variant % 2 === 0 ? "#6e4f2f" : "#7b5934", 0.92);
      s.position.set(0, 0.04, toWorldZ(sleeper.z));
      world.add(s);
    }

    for (const tree of model.repeaters.filter((item) => item.kind === "tree")) {
      const canopy = new Mesh(new SphereGeometry(0.95 * tree.scale, 10, 10), new MeshStandardMaterial({ color: tree.variant % 2 === 0 ? "#2f7d3e" : "#2f6f37", roughness: 0.9 }));
      canopy.position.set(tree.x, 2.45 * tree.scale, toWorldZ(tree.z));
      world.add(canopy);
    }

    for (const ridge of model.ridges) {
      const ridgeColor = new Color(ridge.depth === "near" ? "#3f6212" : "#475569").offsetHSL(0, -0.05, ridge.profile === "crag" ? -0.05 : 0.04);
      const mountain = makeBox([ridge.width, ridge.height, Math.max(4, ridge.width * 0.7)], ridgeColor.getStyle(), 0.95);
      mountain.position.set(ridge.x, ridge.y + ridge.height / 2, toWorldZ(ridge.z));
      world.add(mountain);
    }

    for (const cloud of model.clouds) {
      const cloudMesh = new Mesh(new SphereGeometry((cloud.depth === "near" ? 1.25 : 1.55) * cloud.scale, 12, 12), new MeshStandardMaterial({ color: cloud.depth === "near" ? "#f8fdff" : "#dbeafe", roughness: 1 }));
      cloudMesh.position.set(cloud.x, cloud.y, toWorldZ(cloud.z));
      world.add(cloudMesh);
    }

    for (const building of model.buildings) {
      const block = makeBox([building.width, building.height, building.depth], building.color, 0.88);
      block.position.set(building.x, building.height / 2, toWorldZ(building.z));
      world.add(block);
    }

    for (const cue of model.routeCues) {
      const pole = makeBox([0.08, 2.3, 0.08], "#4b5563", 0.7);
      pole.position.set(cue.safeBranch === "main" ? -6.2 : 6.2, 1.2, toWorldZ(cue.z));
      world.add(pole);
    }

    for (const cue of model.checkpointCues) {
      const signal = makeBox([0.75, 0.35, 0.2], cue.safeBranch === "main" ? "#34d399" : "#f59e0b", 0.5);
      signal.position.set(cue.safeBranch === "main" ? -3.2 : 3.2, 2.2, toWorldZ(cue.z));
      world.add(signal);
    }

    const cabRig = new Group();
    world.add(cabRig);
    const cabBody = makeBox([18, 1.15, 9], theme.bodyColor, 0.52, 0.25);
    cabBody.position.set(0, -0.62, 13.2);
    cabRig.add(cabBody);
    const dash = makeBox([3.9, 0.9, 0.6], theme.dashColor, 0.72);
    dash.position.set(0, 0.45, 8.35);
    cabRig.add(dash);
    const windshield = makeBox([4.7, 1.8, 0.1], "#dbeafe", 0.05, 0.2);
    windshield.position.set(0, 1.95, 7.92);
    cabRig.add(windshield);

    const guideRing = new Mesh(new TorusGeometry(1.2, 0.06, 16, 64), new MeshStandardMaterial({ color: "#facc15", emissive: "#713f12" }));
    guideRing.visible = helperMode && model.checkpointCues.length > 0;
    world.add(guideRing);

    const horizonLineGeo = new BufferGeometry().setFromPoints([new Vector3(-12, 0.05, toWorldZ(model.horizonDistance)), new Vector3(12, 0.05, toWorldZ(model.horizonDistance))]);
    const horizonLine = new Line(horizonLineGeo, new LineBasicMaterial({ color: "#93c5fd" }));
    world.add(horizonLine);

    const clock = new Clock();
    let raf = 0;
    const pointer = new Vector2();
    const lookAt = new Vector3(0, 1.35, 42);

    const onPointerMove = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2;
      pointer.y = ((event.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2;
    };

    renderer.domElement.addEventListener("pointermove", onPointerMove);

    const animate = () => {
      const elapsed = clock.getElapsedTime();
      const delta = clock.getDelta();
      cabRig.position.y = Math.sin(elapsed * 4.2) * 0.015 * Math.max(0.45, state.train.speed * 0.03);

      if (guideRing.visible) {
        const target = model.checkpointCues[0];
        guideRing.position.set(0, 1.1 + Math.sin(elapsed * 1.6) * 0.15, toWorldZ(target.z));
        guideRing.rotation.y += delta * 0.85;
      }

      camera.position.x = MathUtils.lerp(camera.position.x, pointer.x * 0.22, 0.04);
      camera.position.y = MathUtils.lerp(camera.position.y, 2.8 - pointer.y * 0.12, 0.04);
      camera.lookAt(lookAt);

      renderer.render(scene, camera);
      raf = window.requestAnimationFrame(animate);
    };

    const onResize = () => {
      const w = Math.max(1, host.clientWidth);
      const h = Math.max(1, host.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", onResize);
    onResize();
    animate();

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      horizonLineGeo.dispose();
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj instanceof Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      if (renderer.domElement.parentNode === host) {
        host.removeChild(renderer.domElement);
      }
    };
  }, [helperMode, model, state.train.speed, theme.bodyColor, theme.dashColor]);

  return <div ref={hostRef} className="relative h-[500px] overflow-hidden rounded-2xl border border-border bg-sky-200" />;
}
