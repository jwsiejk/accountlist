"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  AmbientLight,
  BackSide,
  BoxGeometry,
  BufferGeometry,
  Clock,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  InstancedMesh,
  Line,
  LineBasicMaterial,
  MathUtils,
  Matrix4,
  Mesh,
  MeshLambertMaterial,
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

type GeometryPack = {
  sleeper: BoxGeometry;
  treeTrunk: CylinderGeometry;
  treeFoliage: ConeGeometry;
  hill: ConeGeometry;
};

type MaterialPack = {
  railSteel: MeshStandardMaterial;
  sleeperWood: MeshStandardMaterial;
  ballast: MeshStandardMaterial;
  hillNear: MeshLambertMaterial;
  hillFar: MeshLambertMaterial;
  treeTrunk: MeshStandardMaterial;
  treeLeafA: MeshStandardMaterial;
  treeLeafB: MeshStandardMaterial;
  stationTrim: MeshStandardMaterial;
  pole: MeshStandardMaterial;
  fence: MeshStandardMaterial;
  bridgeDeck: MeshStandardMaterial;
  tunnelStone: MeshStandardMaterial;
  windowGlass: MeshStandardMaterial;
};

const createGroundStrip = (width: number, length: number, z: number, color: string, amp: number, freq = 0.08) => {
  const geo = new PlaneGeometry(width, length, 28, 64);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const pz = pos.getY(i);
    const wave = Math.sin((pz + z) * freq) * amp + Math.cos((x + z * 0.2) * 0.22) * (amp * 0.45);
    pos.setZ(i, wave);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();

  const mesh = new Mesh(geo, new MeshStandardMaterial({ color, roughness: 0.98 }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, -0.08, z);
  return mesh;
};

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
    scene.background = new Color("#8fc6ff");
    scene.fog = new Fog("#b4d6f2", 22, 220);

    const camera = new PerspectiveCamera(58, Math.max(1, host.clientWidth) / Math.max(1, host.clientHeight), 0.1, 500);
    camera.position.set(0, 2.35, 8.6);
    const cameraLook = new Vector3(0, 1.65, -56);
    camera.lookAt(cameraLook);

    const renderer = new WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(host.clientWidth, host.clientHeight);
    host.appendChild(renderer.domElement);

    const ambient = new AmbientLight("#f8fafc", 0.58);
    scene.add(ambient);
    const sun = new DirectionalLight("#ffe8c2", 1.18);
    sun.position.set(14, 18, 16);
    scene.add(sun);
    const coolFill = new DirectionalLight("#bfdbfe", 0.35);
    coolFill.position.set(-14, 10, 5);
    scene.add(coolFill);
    const hemi = new HemisphereLight("#fff7d9", "#334155", 0.52);
    scene.add(hemi);

    const world = new Group();
    scene.add(world);

    const farZ = -model.horizonDistance;
    const nearZ = 80;
    const centerZ = (farZ + nearZ) / 2;
    const length = nearZ - farZ;

    const geometries: GeometryPack = {
      sleeper: new BoxGeometry(2.15, 0.08, 0.28),
      treeTrunk: new CylinderGeometry(0.11, 0.2, 1.3, 8),
      treeFoliage: new ConeGeometry(0.95, 2.2, 9),
      hill: new ConeGeometry(1, 1.5, 5),
    };

    const materials: MaterialPack = {
      railSteel: new MeshStandardMaterial({ color: "#c1c8d2", roughness: 0.35, metalness: 0.38 }),
      sleeperWood: new MeshStandardMaterial({ color: "#7a5431", roughness: 0.92 }),
      ballast: new MeshStandardMaterial({ color: "#7a6b5b", roughness: 0.95 }),
      hillNear: new MeshLambertMaterial({ color: "#5c7f4a" }),
      hillFar: new MeshLambertMaterial({ color: "#7ea0b4" }),
      treeTrunk: new MeshStandardMaterial({ color: "#6a4526", roughness: 0.96 }),
      treeLeafA: new MeshStandardMaterial({ color: "#2f8044", roughness: 0.88 }),
      treeLeafB: new MeshStandardMaterial({ color: "#357e58", roughness: 0.9 }),
      stationTrim: new MeshStandardMaterial({ color: "#8f7a60", roughness: 0.76 }),
      pole: new MeshStandardMaterial({ color: "#59534a", roughness: 0.89 }),
      fence: new MeshStandardMaterial({ color: "#bba37d", roughness: 0.86 }),
      bridgeDeck: new MeshStandardMaterial({ color: "#6a4f3b", roughness: 0.82 }),
      tunnelStone: new MeshStandardMaterial({ color: "#4b5563", roughness: 0.93 }),
      windowGlass: new MeshStandardMaterial({ color: "#dff2ff", roughness: 0.1, metalness: 0.2, opacity: 0.38, transparent: true }),
    };

    const sky = new Mesh(new SphereGeometry(260, 24, 18), new MeshLambertMaterial({ color: "#8ec9ff", side: BackSide }));
    sky.position.y = -52;
    world.add(sky);

    const farGround = createGroundStrip(150, length * 1.1, centerZ - 60, "#7ea56b", 0.2, 0.03);
    world.add(farGround);
    const midGround = createGroundStrip(92, length * 1.05, centerZ - 20, "#7ca65a", 0.35, 0.06);
    world.add(midGround);
    const nearGround = createGroundStrip(52, length, centerZ + 8, "#6d984f", 0.6, 0.085);
    world.add(nearGround);

    const ballast = new Mesh(new BoxGeometry(5.8, 0.32, length), materials.ballast);
    ballast.position.set(0, 0.04, centerZ);
    world.add(ballast);

    const leftRail = new Mesh(new BoxGeometry(0.14, 0.12, length), materials.railSteel);
    leftRail.position.set(-0.73, 0.22, centerZ);
    world.add(leftRail);
    const rightRail = new Mesh(new BoxGeometry(0.14, 0.12, length), materials.railSteel);
    rightRail.position.set(0.73, 0.22, centerZ);
    world.add(rightRail);

    const sleepers = model.repeaters.filter((item) => item.kind === "sleeper");
    const sleeperInstances = new InstancedMesh(geometries.sleeper, materials.sleeperWood, sleepers.length);
    const sleeperMatrix = new Matrix4();
    sleepers.forEach((sleeper, i) => {
      sleeperMatrix.makeScale(1 + (sleeper.variant % 2) * 0.06, 1, 1);
      sleeperMatrix.setPosition(0, 0.06, toWorldZ(sleeper.z));
      sleeperInstances.setMatrixAt(i, sleeperMatrix);
    });
    world.add(sleeperInstances);

    for (const route of model.routePreviews) {
      const pieces = 12;
      const segLength = (route.endZ - route.splitZ) / pieces;
      for (let i = 0; i < pieces; i += 1) {
        const segStart = route.splitZ + segLength * i;
        const midZ = segStart + segLength * 0.5;
        const x = branchXAt(route, midZ);
        const mat = new MeshStandardMaterial({
          color: route.safeBranch === "main" ? "#89bbea" : "#efc36f",
          roughness: 0.4,
          metalness: 0.24,
        });
        const l = new Mesh(new BoxGeometry(0.1, 0.08, Math.max(1, segLength)), mat);
        l.position.set(x - 0.73, 0.2, toWorldZ(midZ));
        world.add(l);
        const r = new Mesh(new BoxGeometry(0.1, 0.08, Math.max(1, segLength)), mat.clone());
        r.position.set(x + 0.73, 0.2, toWorldZ(midZ));
        world.add(r);
      }
    }

    const addTree = (x: number, z: number, scale: number, variant: number) => {
      const tree = new Group();
      const trunk = new Mesh(geometries.treeTrunk, materials.treeTrunk);
      trunk.scale.set(0.9, 0.9 + scale * 0.2, 0.9);
      trunk.position.y = 0.65;
      tree.add(trunk);

      const leaf1 = new Mesh(geometries.treeFoliage, variant % 2 === 0 ? materials.treeLeafA : materials.treeLeafB);
      leaf1.scale.set(scale * 0.9, 0.9 + scale * 0.38, scale * 0.9);
      leaf1.position.y = 2.1;
      tree.add(leaf1);

      const leaf2 = new Mesh(geometries.treeFoliage, variant % 2 === 0 ? materials.treeLeafB : materials.treeLeafA);
      leaf2.scale.set(scale * 0.68, 0.8 + scale * 0.3, scale * 0.68);
      leaf2.position.y = 3.2;
      tree.add(leaf2);

      tree.position.set(x, 0, toWorldZ(z));
      world.add(tree);
    };

    model.repeaters
      .filter((item) => item.kind === "tree")
      .forEach((tree) => addTree(tree.x, tree.z, tree.scale, tree.variant));

    model.repeaters
      .filter((item) => item.kind === "pole")
      .forEach((pole, idx) => {
        const telegraph = new Group();
        const post = new Mesh(new CylinderGeometry(0.09, 0.13, 3.3, 8), materials.pole);
        post.position.y = 1.7;
        telegraph.add(post);
        const crossArm = new Mesh(new BoxGeometry(1.1, 0.08, 0.12), materials.pole);
        crossArm.position.y = 3.05;
        telegraph.add(crossArm);
        telegraph.position.set(pole.x, 0, toWorldZ(pole.z));
        telegraph.rotation.z = (idx % 3 === 0 ? -1 : 1) * 0.02;
        world.add(telegraph);
      });

    model.ridges.forEach((ridge, idx) => {
      const mountain = new Mesh(geometries.hill, ridge.depth === "near" ? materials.hillNear : materials.hillFar);
      mountain.scale.set(ridge.width * 0.42, ridge.height, ridge.width * 0.46);
      mountain.position.set(ridge.x, ridge.y + ridge.height * 0.46, toWorldZ(ridge.z));
      mountain.rotation.y = (idx % 5) * 0.37;
      world.add(mountain);
    });

    const addBuilding = (building: (typeof model.buildings)[number], sceneType: typeof model.levelScene) => {
      const root = new Group();
      const base = new Mesh(new BoxGeometry(building.width, building.height, building.depth), new MeshStandardMaterial({ color: building.color, roughness: 0.87 }));
      base.position.y = building.height * 0.5;
      root.add(base);

      const roof = new Mesh(new ConeGeometry(Math.max(building.width, building.depth) * 0.6, 1 + building.height * 0.3, 4), new MeshStandardMaterial({ color: building.roofColor, roughness: 0.78 }));
      roof.position.y = building.height + 0.65;
      roof.rotation.y = Math.PI * 0.25;
      root.add(roof);

      const trim = new Mesh(new BoxGeometry(building.width * 0.92, 0.14, building.depth * 0.92), materials.stationTrim);
      trim.position.y = 0.45;
      root.add(trim);

      if (sceneType === "station" || building.style === "depot") {
        const platform = new Mesh(new BoxGeometry(building.width + 4.4, 0.16, 1.6), new MeshStandardMaterial({ color: "#a79f93", roughness: 0.95 }));
        platform.position.set(0, 0.08, building.depth * 0.5 + 1);
        root.add(platform);
      }

      root.position.set(building.x, 0, toWorldZ(building.z));
      world.add(root);
    };

    model.buildings.forEach((building) => addBuilding(building, model.levelScene));

    model.landmarks.forEach((landmark) => {
      if (landmark.type === "bridge") {
        const bridge = new Group();
        const deck = new Mesh(new BoxGeometry(6.2, 0.3, landmark.length), materials.bridgeDeck);
        deck.position.y = 1.7;
        bridge.add(deck);
        const railL = new Mesh(new BoxGeometry(0.22, 0.5, landmark.length), materials.fence);
        railL.position.set(-2.8, 2.1, 0);
        bridge.add(railL);
        const railR = railL.clone();
        railR.position.x = 2.8;
        bridge.add(railR);
        bridge.position.set(0, 0, toWorldZ(landmark.z + landmark.length * 0.5));
        world.add(bridge);
      }

      if (landmark.type === "tunnel") {
        const tunnel = new Group();
        const shell = new Mesh(new CylinderGeometry(4.4, 4.4, landmark.length, 18, 1, true, Math.PI, Math.PI), materials.tunnelStone);
        shell.rotation.z = Math.PI * 0.5;
        shell.position.y = 2.45;
        tunnel.add(shell);
        const arch = new Mesh(new BoxGeometry(8.8, 0.5, 1.2), materials.tunnelStone);
        arch.position.set(0, 4.6, -landmark.length * 0.5);
        tunnel.add(arch);
        tunnel.position.z = toWorldZ(landmark.z + landmark.length * 0.5);
        world.add(tunnel);
      }

      if (landmark.type === "station") {
        const platform = new Mesh(new BoxGeometry(3.4, 0.2, landmark.length), new MeshStandardMaterial({ color: "#b4aca0", roughness: 0.95 }));
        platform.position.set(landmark.side === "left" ? -3.7 : 3.7, 0.1, toWorldZ(landmark.z + landmark.length * 0.5));
        world.add(platform);
      }
    });

    for (let i = 0; i < 52; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      const fence = new Mesh(new BoxGeometry(0.09, 0.85, 0.09), materials.fence);
      fence.position.set(side * 5.2, 0.43, toWorldZ(-20 + i * 8));
      world.add(fence);
    }

    const cabRig = new Group();
    scene.add(cabRig);

    const cabShell = new Mesh(new BoxGeometry(10.5, 5, 7.2), new MeshStandardMaterial({ color: theme.bodyColor, roughness: 0.56, metalness: 0.18 }));
    cabShell.position.set(0, 2.2, 10.2);
    cabRig.add(cabShell);

    const cutout = new Mesh(new BoxGeometry(6.2, 2.35, 0.22), materials.windowGlass);
    cutout.position.set(0, 2.45, 7.05);
    cabRig.add(cutout);

    const roofHeader = new Mesh(new BoxGeometry(6.45, 0.44, 0.45), new MeshStandardMaterial({ color: theme.trimColor, roughness: 0.62 }));
    roofHeader.position.set(0, 3.62, 6.98);
    cabRig.add(roofHeader);

    const pillarL = new Mesh(new BoxGeometry(0.45, 2.7, 0.45), new MeshStandardMaterial({ color: theme.trimColor, roughness: 0.62 }));
    pillarL.position.set(-3.12, 2.2, 6.98);
    cabRig.add(pillarL);
    const pillarR = pillarL.clone();
    pillarR.position.x = 3.12;
    cabRig.add(pillarR);

    const sill = new Mesh(new BoxGeometry(6.25, 0.38, 0.5), new MeshStandardMaterial({ color: theme.sillColor, roughness: 0.74 }));
    sill.position.set(0, 1.1, 6.95);
    cabRig.add(sill);

    const dash = new Mesh(new BoxGeometry(4.6, 0.95, 1.4), new MeshStandardMaterial({ color: theme.dashColor, roughness: 0.76 }));
    dash.position.set(0, 0.78, 8.2);
    cabRig.add(dash);

    const throttle = new Mesh(new CylinderGeometry(0.1, 0.1, 0.92, 10), new MeshStandardMaterial({ color: "#cabd4a", roughness: 0.35, metalness: 0.6 }));
    throttle.position.set(-1.25, 1.28, 8.3);
    throttle.rotation.z = Math.PI * 0.33;
    cabRig.add(throttle);

    const brake = throttle.clone();
    brake.position.x = 1.2;
    brake.material = new MeshStandardMaterial({ color: "#d8855b", roughness: 0.4, metalness: 0.45 });
    cabRig.add(brake);

    const gauge = new Mesh(new TorusGeometry(0.25, 0.06, 12, 32), new MeshStandardMaterial({ color: "#f8fafc", roughness: 0.25, metalness: 0.7 }));
    gauge.position.set(0, 1.26, 7.62);
    gauge.rotation.x = Math.PI * 0.5;
    cabRig.add(gauge);

    const nose = new Mesh(new CylinderGeometry(1.25, 1.4, 4.4, 18), new MeshStandardMaterial({ color: theme.noseColor, roughness: 0.55, metalness: 0.2 }));
    nose.rotation.x = Math.PI * 0.5;
    nose.position.set(0, 1.2, 4.25);
    cabRig.add(nose);

    const guideRing = new Mesh(new TorusGeometry(1.15, 0.05, 14, 54), new MeshStandardMaterial({ color: "#facc15", emissive: "#7c2d12", emissiveIntensity: 0.4 }));
    guideRing.visible = helperMode && model.checkpointCues.length > 0;
    world.add(guideRing);

    const horizonLineGeo = new BufferGeometry().setFromPoints([
      new Vector3(-16, 0.35, toWorldZ(model.horizonDistance)),
      new Vector3(16, 0.35, toWorldZ(model.horizonDistance)),
    ]);
    const horizonLine = new Line(horizonLineGeo, new LineBasicMaterial({ color: "#93c5fd" }));
    world.add(horizonLine);

    const clock = new Clock();
    let raf = 0;
    const pointer = new Vector2();

    const onPointerMove = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2;
      pointer.y = ((event.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2;
    };

    renderer.domElement.addEventListener("pointermove", onPointerMove);

    const animate = () => {
      const elapsed = clock.getElapsedTime();
      const delta = clock.getDelta();
      const motionFactor = Math.max(0.45, state.train.speed * 0.032);

      cabRig.position.y = Math.sin(elapsed * 3.9) * 0.03 * motionFactor;
      cabRig.rotation.z = Math.sin(elapsed * 2.6) * 0.008 * motionFactor;
      cabRig.rotation.x = Math.cos(elapsed * 2.2) * 0.006 * motionFactor;

      if (guideRing.visible) {
        const target = model.checkpointCues[0];
        guideRing.position.set(0, 1.2 + Math.sin(elapsed * 1.6) * 0.15, toWorldZ(target.z));
        guideRing.rotation.y += delta * 0.92;
      }

      camera.position.x = MathUtils.lerp(camera.position.x, pointer.x * 0.3, 0.04);
      camera.position.y = MathUtils.lerp(camera.position.y, 2.32 - pointer.y * 0.12, 0.04);
      camera.lookAt(cameraLook);

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
        if (obj instanceof InstancedMesh) {
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
  }, [helperMode, model, state.train.speed, theme.bodyColor, theme.dashColor, theme.noseColor, theme.sillColor, theme.trimColor]);

  return <div ref={hostRef} className="h-full w-full" aria-hidden />;
}
